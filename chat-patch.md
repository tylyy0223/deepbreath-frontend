"""
后端补丁: 会话标题自动生成
文件: /root/deep-breath/backend/app/api/v1/chat.py

在 "保存消息" 的 try 块中，await db.commit() 之前，
添加会话标题自动设定（取用户第一个问题的前40字作为标题）。

找到两处保存消息的代码块（Redis缓存命中 + AI生成后），
在 await db.commit() 之前插入:

    # Auto-title: use first question as session title
    import asyncio
    try:
        r_title = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
        sess = r_title.scalar_one_or_none()
        if sess and (not sess.title or sess.title == '新对话'):
            title = req.message[:40] + ('...' if len(req.message) > 40 else '')
            await db.execute(update(ChatSession).where(ChatSession.id == session_id).values(title=title))
    except Exception: pass
"""

# === 在 chat.py 中需要修改的两处 ===

# 第1处：Redis 缓存命中后保存消息时（约第95行）
# 原来的代码:
#     db.add(ChatMessage(...))
#     ...
#     await db.commit()
# 改为:
#     db.add(ChatMessage(session_id=session_id, role="user", content=req.message))
#     db.add(ChatMessage(session_id=session_id, role="assistant", content=full_response))
#     # 自动设标题
#     try:
#         r_t = await db.execute(select(ChatSession).where(ChatSession.id == session_id))
#         sess = r_t.scalar_one_or_none()
#         if sess and (not sess.title or sess.title == '新对话'):
#             title = req.message[:40] + ('...' if len(req.message) > 40 else '')
#             await db.execute(update(ChatSession).where(ChatSession.id == session_id).values(title=title))
#     except Exception: pass
#     await db.execute(update(ChatSession).where(ChatSession.id == session_id).values(message_count=ChatSession.message_count + 2, updated_at=datetime.now(timezone.utc)))
#     await db.commit()


# 第2处：AI 流式生成后保存消息时（约第125行）
# 同样的修改，在 await db.commit() 之前加入相同的标题设定代码
