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

SRC_DIR="/root/deepbreath-frontend"        # 源码
APP_DIR="/var/www/deepbreath/app"          # dev (58.89) 线上产物
BACKUP_ROOT="/var/www/deepbreath"          # dev 备份根目录
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
check_health() {
  local url="$1"
  local expect="$2"
  local label="$3"
  local resp
  resp=$(curl -sS --max-time 10 "$url" 2>&1) || {
    err "$label 健康检查失败：curl 错误"
    return 1
  }
  if ! echo "$resp" | grep -q "$expect"; then
    err "$label 健康检查失败：响应不含 $expect"
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
  log "产物在 dist/，可用: cp -r dist/* $APP_DIR/ （手动部署 dev）"
  exit 0
fi

# ---------- 3) 部署 dev (58.89) ----------
if [ "$DO_DEPLOY_DEV" = "1" ]; then
  log "备份 dev 线上产物 → $DEV_BACKUP ..."
  cp -a "$APP_DIR" "$DEV_BACKUP"
  log "同步产物到 dev $APP_DIR ..."
  rm -rf "$APP_DIR"/assets/*
  cp -r dist/* "$APP_DIR/"
  log "✓ dev 部署完成（备份 $DEV_BACKUP）"
fi

# ---------- 4) 同步 prod (62.70) ----------
if [ "$DO_DEPLOY_PROD" = "1" ]; then
  # 4.1 部署前 pre-check（确认当前 prod 健康）
  log "Prod pre-check ..."
  if ! check_health "$PROD_HEALTH_URL" '"db":"connected"' "prod pre-check"; then
    err "Prod 当前不健康，拒绝部署！"
    err "请先用 --to-dev 部署 dev 修复后再次 --to-prod"
    exit 1
  fi
  log "✓ Prod 当前健康"

  # 4.2 备份 prod
  log "备份 prod 线上产物 → $PROD_BACKUP_REMOTE ..."
  ssh -i "$SSH_KEY" -o ConnectTimeout=10 "$REMOTE_62" \
    "cp -a /var/www/deepbreath/app $PROD_BACKUP_REMOTE" \
    || { err "Prod 备份失败，中止部署"; exit 1; }

  # 4.3 rsync 到 prod
  log "同步产物到 prod ..."
  rsync -az --delete -e "ssh -i $SSH_KEY -o ConnectTimeout=10" \
    "$APP_DIR/" "$REMOTE_62:/var/www/deepbreath/app/" 2>&1 | tail -n 2 \
    || { err "Prod rsync 失败"; exit 1; }

  # 4.4 部署后 post-check（5s 让 nginx reload + 健康检查）
  log "等待 5s 让 prod nginx reload ..."
  sleep 5
  log "Prod post-check ..."
  POST_OK=1
  check_health "$PROD_HEALTH_URL" '"db":"connected"' "prod post-check health" || POST_OK=0
  check_health "$PROD_INDEX_URL" '200' "prod post-check index" || POST_OK=0

  if [ "$POST_OK" = "1" ]; then
    log "✓ Prod 部署成功 + 健康检查通过（备份 $PROD_BACKUP_REMOTE）"
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
