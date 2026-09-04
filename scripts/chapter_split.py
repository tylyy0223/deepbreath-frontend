#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""章节切分：把 wikijs 整本一坨的 page content 切成章节 JSON。

支持的章节标记（按优先级匹配）：
  - "第X章" (中文数字 1-99 + "章")
  - "Chapter N"
  - "第N次咨询" / "咨询 N" (蛤蟆先生风格)
  - "序言" / "前言" / "引言" / "导读"
  - "后记" / "结语" / "附录"
  - "Part N" / "部 N"

输出：JSON 文件 {serial}.chapters.json
"""
import re
import sys
import json
import psycopg2
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

# 章节起始标记（按优先级）
CHAPTER_PATTERNS = [
    # 中文 "第X章" / "第 X 章"
    (r'^\s*第[一二三四五六七八九十百千零〇\d]+\s*[章回]\s*[:：、\.].*?$', 'chapter_cn'),
    # "第N次咨询" / "第N次面谈"
    (r'^\s*第[一二三四五六七八九十百千零〇\d]+\s*次[咨面].*?$', 'consultation_cn'),
    # "Chapter N" / "CHAPTER N"
    (r'^\s*[Cc]hapter\s+\d+.*?$', 'chapter_en'),
    # "Part N" / "第N部" / "第N篇"
    (r'^\s*(第[一二三四五六七八九十百千零〇\d]+[部篇]|Part\s+\d+).*?$', 'part'),
    # 序言类
    (r'^\s*(序言|前言|引言|导读|写在前面|自序).*?$', 'preface'),
    # 后记类
    (r'^\s*(后记|结语|尾声|跋|附录).*?$', 'postface'),
]


def split_into_chapters(content: str, debug: bool = False):
    """返回 [(chapter_title, chapter_text, kind), ...]"""
    lines = content.split('\n')
    chapters = []
    current_title = '序章'
    current_kind = 'preface'
    current_buf = []

    for i, line in enumerate(lines):
        matched = None
        for pat, kind in CHAPTER_PATTERNS:
            m = re.match(pat, line.strip())
            if m:
                matched = (line.strip(), kind)
                break
        if matched:
            # 收尾上一章
            if current_buf:
                chapters.append((current_title, '\n'.join(current_buf).strip(), current_kind))
            current_title = matched[0]
            current_kind = matched[1]
            current_buf = [line]
        else:
            current_buf.append(line)
    # 收尾最后
    if current_buf:
        chapters.append((current_title, '\n'.join(current_buf).strip(), current_kind))

    if debug:
        print(f'切分结果: {len(chapters)} 章')
        for i, (t, _, k) in enumerate(chapters):
            print(f'  [{i+1}] {k}: {t[:40]}')
    return chapters


def fetch_book_content(serial: str) -> tuple[str, str, str]:
    """从 wikijs 抓指定 serial 的整本 page"""
    conn = psycopg2.connect(
        host='127.0.0.1', port=5432, dbname='wikijs',
        user='deepbreath_wiki_reader', password='db_wiki_read_2026',
    )
    cur = conn.cursor()
    # 优先 v_psy_chat_pages，fallback pages
    cur.execute("""
        SELECT title, content, path FROM v_psy_chat_pages
        WHERE path LIKE %s
        ORDER BY path LIMIT 1
    """, ('004-心理学/' + serial + '%',))
    row = cur.fetchone()
    conn.close()
    if not row:
        raise SystemExit(f'no page for serial {serial}')
    title, content, path = row
    return title, content, path


def main():
    if len(sys.argv) < 2:
        print('usage: chapter_split.py <serial>')
        sys.exit(1)
    serial = sys.argv[1]
    title, content, path = fetch_book_content(serial)
    print(f'serial: {serial}')
    print(f'title:  {title}')
    print(f'path:   {path}')
    print(f'content: {len(content)} chars (~{len(content)//3} 汉字)')
    print()
    chapters = split_into_chapters(content, debug=True)
    print()
    print('=== JSON 输出 (前 200 字符/章预览) ===')
    out = {
        'serial': serial,
        'title': title,
        'path': path,
        'total_chars': len(content),
        'chapters': [
            {'idx': i+1, 'title': t, 'kind': k, 'chars': len(c), 'preview': c[:200]}
            for i, (t, c, k) in enumerate(chapters)
        ],
    }
    print(json.dumps(out, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
