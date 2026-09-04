#!/bin/bash
# audiobook_cron.sh - 每 5 小时跑 2-3 本新书到听书
# 触发时间 (launchd): 15:00, 20:00, 01:00, 06:00, 11:00, 16:00, 21:00, 02:00, 07:00, 12:00, 17:00
# 5h 限额 100% 跳过: user 71 当日累计 >= 7200s

set -e

LOG="/tmp/audiobook_cron.log"
PROJECT_DIR="/Users/mac/luoyuyu/deepbreath-build"
TTS_DIR="/Users/mac/luoyuyu/tts"
TEST_USER_ID=71
DAILY_LIMIT_SEC=7200
BATCH_SIZE=3

# 自动判断切分策略
auto_strategy() {
  local serial=$1
  local stats=$(ssh root@47.103.58.89 "PGPASSWORD=db_wiki_read_2026 psql -U deepbreath_wiki_reader -h 127.0.0.1 -d wikijs -At -F'|' -c \"
SELECT
  (SELECT count(*) FROM regexp_matches(content, '^## \\\\S', 'gm')),
  (SELECT count(*) FROM regexp_matches(content, '第[一二三四五六七八九十百零\\\\d]+部分', 'g')),
  (SELECT count(*) FROM regexp_matches(content, '第[一二三四五六七八九十百零\\\\d]+章[ \\\\t]*\$', 'gm'))
FROM v_psy_chat_pages WHERE path LIKE '004-心理学/$serial-%' AND path NOT LIKE '%/%/%' LIMIT 1;\"" 2>/dev/null)
  local h2=$(echo "$stats" | cut -d'|' -f1)
  local part=$(echo "$stats" | cut -d'|' -f2)
  local chapter=$(echo "$stats" | cut -d'|' -f3)
  chapter=${chapter:-0}; h2=${h2:-0}; part=${part:-0}
  if [ "$chapter" -ge 3 ] 2>/dev/null; then echo v6
  elif [ "$h2" -ge 5 ] 2>/dev/null; then echo h2
  elif [ "$h2" -ge 3 ] 2>/dev/null && [ "$part" -lt 5 ] 2>/dev/null; then echo h2
  elif [ "$part" -ge 2 ] 2>/dev/null; then echo part
  elif [ "$h2" -ge 3 ] 2>/dev/null; then echo h2
  else echo chars
  fi
}

# 从 wikijs path 取书名 (path 末段 - 之前的部分)
auto_book_name() {
  local serial=$1
  local path=$(ssh root@47.103.58.89 "PGPASSWORD=db_wiki_read_2026 psql -U deepbreath_wiki_reader -h 127.0.0.1 -d wikijs -At -c \"
SELECT path FROM v_psy_chat_pages WHERE path LIKE '004-心理学/$serial-%' AND path NOT LIKE '%/%/%' LIMIT 1;\"" 2>/dev/null | head -1)
  # path = "004-心理学/004-004-超级心智" → "超级心智"
  echo "$path" | sed "s|^004-心理学/$serial-||"
}

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"; }

# 启动时从 47.103.62.70 .env 取 API key (cron session 不继承 env)
export MINIMAX_API_KEY=$(ssh root@47.103.62.70 'grep MINIMAX_API_KEY /root/deep-breath/backend/.env | cut -d= -f2' 2>/dev/null)
[ -z "$MINIMAX_API_KEY" ] && { log "❌ MINIMAX_API_KEY 取不到, 退出"; exit 1; }

log "==== audio book cron 启动 ===="

# 1. 5h 限额检查
LIMIT_USED=$(ssh root@47.103.62.70 "PGPASSWORD=deepbreath_2026 psql -U deepbreath -h 127.0.0.1 -d deepbreath -At -c \"SELECT COALESCE(SUM(listened_seconds),0) FROM book_listen_daily WHERE user_id=$TEST_USER_ID AND day=CURRENT_DATE\"" 2>/dev/null || echo "0")
log "用户 71 当日累计: ${LIMIT_USED}s / ${DAILY_LIMIT_SEC}s"

if [ "$LIMIT_USED" -ge "$DAILY_LIMIT_SEC" ]; then
  log "听书限额 100% (${LIMIT_USED}s >= ${DAILY_LIMIT_SEC}s), 本轮跳过, 等下个 5h"
  exit 0
fi

# 2. 找 2-3 本未生成的书
WIKI_SERIALS=$(ssh root@47.103.62.70 "PGPASSWORD=db_wiki_read_2026 psql -U deepbreath_wiki_reader -h 127.0.0.1 -d wikijs -At -c \"
SELECT DISTINCT substring(split_part(path, '/', 2), 1, 7) FROM v_psy_chat_pages
WHERE path LIKE '004-心理学/004-%' AND path NOT LIKE '%/%/%' ORDER BY 1;\"" 2>/dev/null)
WIKI_LIST=$(echo "$WIKI_SERIALS" | tr '\n' ' ' | xargs)

DONE_SERIALS=$(ssh root@47.103.62.70 "PGPASSWORD=deepbreath_2026 psql -U deepbreath -h 127.0.0.1 -d deepbreath -At -c \"SELECT DISTINCT serial FROM book_chapters WHERE audio_url IS NOT NULL\"" 2>/dev/null | tr '\n' ' ' | xargs)
log "已完整生成: $DONE_SERIALS"

NEW_SERIALS=""
COUNT=0
for S in $WIKI_LIST; do
  if ! echo " $DONE_SERIALS " | grep -q " $S "; then
    NEW_SERIALS="$NEW_SERIALS $S"
    COUNT=$((COUNT + 1))
    if [ "$COUNT" -ge "$BATCH_SIZE" ]; then
      break
    fi
  fi
done
NEW_SERIALS=$(echo $NEW_SERIALS | xargs)

if [ -z "$NEW_SERIALS" ]; then
  log "没有未生成的书了, 全部完成"
  exit 0
fi

log "本轮要处理: $NEW_SERIALS"

# 3. 逐本处理
DONE_LIST=""
for SERIAL in $NEW_SERIALS; do
  STRAT=$(auto_strategy $SERIAL)
  BOOK=$(auto_book_name $SERIAL)
  log ""
  log "--- 处理 $SERIAL ($BOOK) 策略=$STRAT ---"

  # 3a. LMS
  log "  LMS 生成..."
  if ssh root@47.103.58.89 "MINIMAX_API_KEY=\$(grep MINIMAX_API_KEY /root/deep-breath/backend/.env | cut -d= -f2) /tmp/pregenerate_chapter_v2.py $SERIAL --strategy $STRAT --save" >> "$LOG" 2>&1; then
    log "  LMS OK"
  else
    log "  ⚠️ LMS 失败, 跳过 $SERIAL"
    continue
  fi

  # 3b. TTS + 上传
  log "  TTS + 上传..."
  TTS_OK=1
  if ! python3 "/Users/mac/.minimax/skills/ai-audiobook/scripts/batch_tts_v2.py" --serial "$SERIAL" --upload >> "$LOG" 2>&1; then
    log "  ⚠️ TTS 失败, $SERIAL"
    TTS_OK=0
  fi
  MP3_COUNT=$(ls "$TTS_DIR/$SERIAL/"*.mp3 2>/dev/null | wc -l | tr -d ' ')
  log "  mp3: $MP3_COUNT 个"
  # TTS 没产出 mp3 不计入 DONE_LIST (避免前端加书名映射但实际没听书)
  if [ "$TTS_OK" = "1" ] && [ "$MP3_COUNT" -gt 0 ]; then
    DONE_LIST="$DONE_LIST $SERIAL"
  else
    log "  ⚠️ 跳过 $SERIAL (TTS 失败或 0 mp3)"
  fi
done

# 4. 更新前端 3 个文件加书名映射
log ""
log "--- 更新前端 ---"
NEED_BUILD=0
for SERIAL in $DONE_LIST; do
  BOOK=$(auto_book_name $SERIAL)
  [ -z "$BOOK" ] && continue
  for F in "$PROJECT_DIR/src/pages/BooksListPage.tsx" \
           "$PROJECT_DIR/src/pages/ListenIndexPage.tsx" \
           "$PROJECT_DIR/src/pages/ChapterPlayerPage.tsx"; do
    if ! grep -q "'$SERIAL' ? '$BOOK'" "$F" 2>/dev/null; then
      log "  + 加 $SERIAL ($BOOK) → $(basename $F)"
      python3 - "$F" "$SERIAL" "$BOOK" <<'PYEOF'
import sys, re
fp, serial, book = sys.argv[1], sys.argv[2], sys.argv[3]
with open(fp) as f:
    s = f.read()
# 在 '004-213' ? '自控力' 那一行后插 (3 种格式)
patterns_repl = [
    (r"(b\.serial === '004-213' \? '[^']*'[\s:]*\n)", f"                        : b.serial === '{serial}' ? '{book}'\n"),
    (r"(serial === '004-213' \? '[^']*'[\s:]*\n)", f"                        : serial === '{serial}' ? '{book}'\n"),
]
for pat, repl in patterns_repl:
    m = re.search(pat, s)
    if m:
        s = s[:m.end()] + repl + s[m.end():]
        with open(fp, 'w') as f:
            f.write(s)
        break
PYEOF
      NEED_BUILD=1
    fi
  done
done

# 5. build + 部署
if [ "$NEED_BUILD" = "1" ]; then
  log ""
  log "--- build + 部署 ---"
  cd "$PROJECT_DIR"
  npx tsc -b >> "$LOG" 2>&1 || log "tsc 警告"
  npm run build >> "$LOG" 2>&1 || log "build 失败"
  rsync -avz --exclude='audio/' --exclude='app.bak*' dist/ root@47.103.62.70:/var/www/deepbreath/ >> "$LOG" 2>&1
  rsync -avz --exclude='audio/' --exclude='app.bak*' dist/ root@47.103.58.89:/var/www/deepbreath/ >> "$LOG" 2>&1
  log "前端部署完成"
fi

log ""
log "==== 本轮完成:$DONE_LIST ===="
log ""
