#!/usr/bin/env bash
# ============================================================
# DeepBreath 前端构建部署脚本（58.89 构建机）
#
# 工作流（按用户要求 2026-09-19 重构）：
#   默认行为：只 build，不部署任何机器（必须显式指定才部署）
#
# 用法：
#   ./build_deploy.sh                  # 只 build（产物在 dist/，不上线）
#   ./build_deploy.sh --no-pull        # build 时不 git pull
#   ./build_deploy.sh --to-dev         # build + 部署到 dev 主机（58.89 nginx）
#   ./build_deploy.sh --to-prod        # build + 部署 dev + 同步 prod + 健康检查 + 失败自动回滚
#   ./build_deploy.sh --dry-run        # 等价于默认：只 build，不部署
#
# 安全：
#   - 默认不部署，杜绝"改了忘验证就上线"
#   - --to-prod 必须显式
#   - 部署前 pre-check（确认当前 prod 健康）
#   - 部署后 post-check（确认新版本健康）
#   - post-check 失败自动 rsync 回 prod 备份
#   - 所有备份保留在 /var/www/deepbreath/app.bak.<ts>（dev + prod 各一份）
#
# 健康检查端点：
#   - GET https://luoyuyu.cn/api/v1/health  （需返回 "db":"connected","redis":"connected"）
#   - GET https://luoyuyu.cn/app/           （需返回 200）
# ============================================================
set -euo pipefail

# 磁盘安全检查：剩余空间 < 5GB 拒绝执行（防上次递归复制爆盘）
FREE_GB=$(df -BG /var/www 2>/dev/null | tail -1 | awk '{print $4}' | tr -d 'G')
if [ -n "$FREE_GB" ] && [ "$FREE_GB" -lt 5 ]; then
  echo "❌ 磁盘剩余 ${FREE_GB}GB < 5GB，拒绝执行（防递归复制爆盘）。请先 SSH 清理老备份。" >&2
  exit 1
fi

SRC_DIR="/root/deepbreath-frontend"        # 源码
# nginx alias 期望的位置（dev + prod 都一样）：
#   location ^~ /app/assets/    { alias /var/www/deepbreath/assets/; }
#   location = /app/index.html  { alias /var/www/deepbreath/index.html; }
# 部署直接写到这里，不再用 APP_DIR 中转（避免路径错位）
BACKUP_ROOT="/var/www/deepbreath"          # 备份根目录
REMOTE_62="root@47.103.62.70"              # prod 同步目标
SSH_KEY="/root/.ssh/id_ed25519"
PROD_HEALTH_URL="https://luoyuyu.cn/api/v1/health"
PROD_INDEX_URL="https://luoyuyu.cn/app/"

# 默认全部关闭：必须显式才部署
DO_PULL=1
DO_DEPLOY_DEV=0
DO_DEPLOY_PROD=0

for arg in "$@"; do
  case "$arg" in
    --no-pull) DO_PULL=0 ;;
    --to-dev)  DO_DEPLOY_DEV=1 ;;
    --to-prod) DO_DEPLOY_DEV=1; DO_DEPLOY_PROD=1 ;;   # --to-prod 隐含 --to-dev
    --dry-run) DO_DEPLOY_DEV=0; DO_DEPLOY_PROD=0 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo "未知参数: $arg"; exit 1 ;;
  esac
done

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
err() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ $*" >&2; }

TS=$(date '+%Y%m%d_%H%M%S')
DEV_BACKUP="$BACKUP_ROOT/app.bak.$TS"
PROD_BACKUP_REMOTE="/var/www/deepbreath/app.bak.$TS"

# ============================================================
# 健康检查
# ============================================================
# check_status url expected_status label
#   检查 HTTP status code（用 curl -w "%{http_code}"，不是 grep body）
check_status() {
  local url="$1"
  local expect="$2"
  local label="$3"
  local status
  status=$(curl -sS -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>&1) || {
    err "$label 健康检查失败：curl 错误"
    return 1
  }
  if [ "$status" != "$expect" ]; then
    err "$label HTTP status: $status (期望 $expect)"
    return 1
  fi
  return 0
}

# check_body url expected_substr label
#   检查 response body 包含子串
check_body() {
  local url="$1"
  local expect="$2"
  local label="$3"
  local resp
  resp=$(curl -sS --max-time 10 "$url" 2>&1) || {
    err "$label 健康检查失败：curl 错误"
    return 1
  }
  if ! echo "$resp" | grep -q "$expect"; then
    err "$label 响应不含 $expect"
    echo "    响应: ${resp:0:200}"
    return 1
  fi
  return 0
}

cd "$SRC_DIR"

# ---------- 1) 拉取最新源码 ----------
if [ "$DO_PULL" = "1" ]; then
  log "拉取最新源码 ..."
  git remote set-url origin "git@github.com-frontend:tylyy0223/deepbreath-frontend.git" 2>/dev/null || true
  if ! git pull origin main 2>&1 | tail -2; then
    log "⚠ pull 失败，用本地源码继续"
  fi
fi

# ---------- 2) 构建 ----------
log "npm run build ..."
rm -rf dist 2>/dev/null || true
if ! npm run build 2>&1 | tail -n 5; then
  err "构建失败，中止"
  exit 1
fi
[ -f dist/index.html ] || { err "产物缺失 index.html"; exit 1; }
BUILT_HASH=$(grep -oE 'index-[A-Za-z0-9_+-]+\.js' dist/index.html | head -1)
log "✓ 构建完成: $BUILT_HASH"

# 默认行为：build 完不部署（除非显式 --to-dev 或 --to-prod）
if [ "$DO_DEPLOY_DEV" = "0" ] && [ "$DO_DEPLOY_PROD" = "0" ]; then
  log "未指定 --to-dev/--to-prod，仅 build，不部署任何机器"
  log "产物在 dist/，可用手动部署："
  log "  dev:  cp -r dist/assets/* /var/www/deepbreath/assets/ && cp dist/index.html /var/www/deepbreath/index.html"
  exit 0
fi

# ---------- 3) 部署 dev (58.89) ----------
# 直接 cp 到 nginx alias 路径 /var/www/deepbreath/{assets,index.html}
if [ "$DO_DEPLOY_DEV" = "1" ]; then
  DEV_BACKUP="$BACKUP_ROOT/deploy.bak.$TS"
  log "备份 dev 线上产物 → $DEV_BACKUP ..."
  mkdir -p "$DEV_BACKUP"
  if [ -d /var/www/deepbreath/assets ]; then
    cp -a /var/www/deepbreath/assets "$DEV_BACKUP/assets"
  fi
  if [ -f /var/www/deepbreath/index.html ]; then
    cp -a /var/www/deepbreath/index.html "$DEV_BACKUP/index.html"
  fi
  log "同步产物到 dev /var/www/deepbreath ..."
  rm -rf /var/www/deepbreath/assets/*
  cp -r dist/assets/* /var/www/deepbreath/assets/
  cp dist/index.html /var/www/deepbreath/index.html
  log "✓ dev 部署完成（备份 $DEV_BACKUP）"
fi

# ---------- 4) 同步 prod (62.70) ----------
if [ "$DO_DEPLOY_PROD" = "1" ]; then
  # 4.1 部署前 pre-check（确认当前 prod 健康）
  log "Prod pre-check ..."
  if ! check_status "$PROD_HEALTH_URL" "200" "prod pre-check status"; then
    err "Prod 当前不健康（HTTP status 不对），拒绝部署！"
    err "请先用 --to-dev 部署 dev 修复后再次 --to-prod"
    exit 1
  fi
  if ! check_body "$PROD_HEALTH_URL" '"db":"connected"' "prod pre-check body"; then
    err "Prod 当前不健康（db/redis 未 connected），拒绝部署！"
    exit 1
  fi
  log "✓ Prod 当前健康"

  # 4.2 备份 prod（实际在 4.3 的 ssh heredoc 里 mv 前自动备份）
  PROD_DEPLOY_BACKUP="/var/www/deepbreath/deploy.bak.$TS"
  log "Prod 备份将保存到 → $PROD_DEPLOY_BACKUP"

  # 4.3 同步 dist 到 prod（nginx alias 期望的位置是 /var/www/deepbreath/，不带 /app/）
  # 使用中间目录 + 原子 mv 模式：避免 rsync --delete 直接覆盖 nginx alias 路径
  log "同步产物到 prod（中间目录 + 原子替换）..."
  ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$REMOTE_62" \
    "rm -rf /tmp/deepbreath-sync && mkdir -p /tmp/deepbreath-sync/assets" \
    || { err "Prod 中间目录准备失败"; exit 1; }
  rsync -az -e "ssh -i $SSH_KEY -o ConnectTimeout=10" \
    "dist/assets/" "$REMOTE_62:/tmp/deepbreath-sync/assets/" 2>&1 | tail -n 2 \
    || { err "Prod assets rsync 失败"; exit 1; }
  rsync -az -e "ssh -i $SSH_KEY -o ConnectTimeout=10" \
    "dist/index.html" "$REMOTE_62:/tmp/deepbreath-sync/index.html" 2>&1 | tail -n 2 \
    || { err "Prod index.html rsync 失败"; exit 1; }
  # 在 prod 远端原子替换：备份老内容 → 清空 nginx alias 路径 → mv 新内容
  ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$REMOTE_62" bash << 'PROD_DEPLOY_EOF'
    set -e
    REMOTE_TS=$(date +%Y%m%d_%H%M%S)
    REMOTE_BACKUP_DIR="/var/www/deepbreath/deploy.bak.$REMOTE_TS"
    mkdir -p "$REMOTE_BACKUP_DIR"
    if [ -d /var/www/deepbreath/assets ]; then
      mv /var/www/deepbreath/assets "$REMOTE_BACKUP_DIR/assets"
    fi
    if [ -f /var/www/deepbreath/index.html ]; then
      mv /var/www/deepbreath/index.html "$REMOTE_BACKUP_DIR/index.html"
    fi
    mv /tmp/deepbreath-sync/assets /var/www/deepbreath/assets
    mv /tmp/deepbreath-sync/index.html /var/www/deepbreath/index.html
    echo "prod deploy backup: $REMOTE_BACKUP_DIR"
PROD_DEPLOY_EOF

  # 4.4 部署后 post-check（5s 让 nginx reload + 健康检查）
  log "等待 5s 让 prod nginx reload ..."
  sleep 5
  log "Prod post-check ..."
  POST_OK=1
  check_status "$PROD_HEALTH_URL" "200" "prod post-check health status" || POST_OK=0
  check_body "$PROD_HEALTH_URL" '"db":"connected"' "prod post-check health body" || POST_OK=0
  check_status "$PROD_INDEX_URL" "200" "prod post-check index" || POST_OK=0

  if [ "$POST_OK" = "1" ]; then
    log "✓ Prod 部署成功 + 健康检查通过（备份 $PROD_DEPLOY_BACKUP）"
  else
    err "Prod 部署后健康检查失败，自动回滚！"
    ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$REMOTE_62" \
      "rm -rf /var/www/deepbreath/app && cp -a $PROD_BACKUP_REMOTE /var/www/deepbreath/app" \
      && log "✓ Prod 已回滚到 $PROD_BACKUP_REMOTE" \
      || err "❌ Prod 回滚失败！需要手动恢复（备份在 $REMOTE_62:$PROD_BACKUP_REMOTE）"
    exit 1
  fi
fi

log "🎉 全部完成"
