import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useCommunityStore } from '../stores/communityStore';
import type { CommunityPost, CommunityReply } from '../types/community';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../stores/authStore';
import { token } from '../lib/token';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CommunityPostPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { fetchPost, updatePost, updateReply, likePost, replyPost, deletePost, deleteReply } = useCommunityStore();

  const [post, setPost] = useState<CommunityPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState('');
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize reply textarea
  useEffect(() => {
    const el = replyTextareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [replyContent]);

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);

  const loadPost = async () => {
    if (!id) return;
    const numId = Number(id);
    if (isNaN(numId)) return;
    setLoading(true);
    const data = await fetchPost(numId);
    setPost(data);
    setLoading(false);
  };

  useEffect(() => {
    loadPost();
  }, [id]);

  const handleLike = async () => {
    if (!post) return;
    await likePost(post.id);
    // Refresh to get updated counts
    const updated = await fetchPost(post.id);
    if (updated) setPost(updated);
  };

  const handleReply = async () => {
    if (!post || (!replyContent.trim() && replyImages.length === 0)) return;
    setSubmitting(true);
    try {
      await replyPost(post.id, replyContent.trim() || ' ', false, replyImages.length > 0 ? replyImages : undefined);
      setReplyContent('');
      setReplyImages([]);
      const updated = await fetchPost(post.id);
      if (updated) setPost(updated);
    } catch { /* error */ }
    setSubmitting(false);
  };

  // ---- 图片上传（回复）----
  const handleUploadReply = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const result: string[] = [...replyImages];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const formData = new FormData();
      formData.append('file', file);
      try {
        const tok = token.getAccess();
        const res = await fetch('/api/v1/upload/image', {
          method: 'POST',
          headers: tok ? { Authorization: `Bearer ${tok}` } : {},
          body: formData,
        });
        if (res.ok) {
          const json = await res.json();
          if (json.data?.url) result.push(json.data.url);
        }
      } catch { /* skip */ }
    }
    setReplyImages(result);
    setUploading(false);
    if (replyFileInputRef.current) replyFileInputRef.current.value = '';
  };

  const handleDelete = async () => {
    if (!post) return;
    if (!confirm('删除这个帖子？')) return;
    await deletePost(post.id);
    navigate('/app/community');
  };

  const startEdit = () => {
    if (!post) return;
    setEditTitle(post.title || '');
    setEditContent(post.content);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!post || !editContent.trim()) return;
    setSaving(true);
    try {
      await updatePost(post.id, { title: editTitle || undefined, content: editContent });
      setEditing(false);
      const updated = await fetchPost(post.id);
      if (updated) setPost(updated);
    } catch { /* error */ }
    setSaving(false);
  };

  const handleDeleteReply = async (replyId: number) => {
    if (!post) return;
    if (!confirm('删除这条回复？')) return;
    await deleteReply(post.id, replyId);
    const updated = await fetchPost(post.id);
    if (updated) setPost(updated);
  };

  // Reply editing
  const [editingReplyId, setEditingReplyId] = useState<number | null>(null);
  const [editReplyContent, setEditReplyContent] = useState('');

  const startEditReply = (reply: CommunityReply) => {
    setEditingReplyId(reply.id);
    setEditReplyContent(reply.content);
  };

  const handleSaveReply = async () => {
    if (!post || !editingReplyId || !editReplyContent.trim()) return;
    await updateReply(post.id, editingReplyId, editReplyContent);
    setEditingReplyId(null);
    const updated = await fetchPost(post.id);
    if (updated) setPost(updated);
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20">
        <Spinner />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center">
        <span className="text-4xl">💬</span>
        <p className="mt-4 text-gray-500 dark:text-zinc-400">帖子不存在或已被删除</p>
        <button
          onClick={() => navigate('/app/community')}
          className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          ← 返回社区
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/app/community')}
        className="text-sm text-gray-400 hover:text-gray-600 dark:text-zinc-500 dark:hover:text-zinc-300 mb-4 inline-block"
      >
        ← 返回社区
      </button>

      <Card className="p-6">
        {editing ? (
          /* Edit mode */
          <div className="space-y-3">
            <input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="标题（选填）"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300
                dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
            />
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="内容"
              rows={5}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-300
                dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>取消</Button>
              <Button size="sm" onClick={handleSaveEdit} loading={saving}>保存</Button>
            </div>
          </div>
        ) : (
          <>
            {/* Title */}
            {post.title && (
              <h1 className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-3">{post.title}</h1>
            )}

            {/* Content */}
            <div className="text-sm text-gray-700 dark:text-zinc-300 prose prose-sm max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{post.content}</ReactMarkdown>
            </div>

            {/* Post images */}
            {post.images && post.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {post.images.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt=""
                    className="max-w-[240px] max-h-[240px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                    onClick={() => window.open(url, '_blank')}
                  />
                ))}
              </div>
            )}

            {/* Meta bar */}
            <div className="flex items-center gap-3 mt-4 text-xs text-gray-400 dark:text-zinc-500">
              {post.is_anonymous ? (
                <span>匿名</span>
              ) : post.author ? (
                <span>{post.author.nickname}</span>
              ) : null}
              {post.created_at && <span>{formatDate(post.created_at)}</span>}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-zinc-700">
              <button
                onClick={handleLike}
                className={`inline-flex items-center gap-1 text-sm transition-colors ${post.is_liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'}`}
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill={post.is_liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                {post.like_count || 0}
              </button>
              <span className="text-sm text-gray-400">👁 {post.view_count || 0}</span>
              <span className="text-sm text-gray-400">
                💬 {post.reply_count || 0} 回复
              </span>
              {post.is_mine && (
                <>
                  <button
                    onClick={startEdit}
                    className="text-xs text-gray-400 hover:text-primary-500 transition-colors"
                    title="编辑"
                  >
                    ✏️ 编辑
                  </button>
                  <button
                    onClick={handleDelete}
                    className="ml-auto text-xs text-gray-400 hover:text-red-500 transition-colors"
                    title="删除"
                  >
                    🗑 删除
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </Card>

      {/* Replies */}
      {post.replies && post.replies.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-600 dark:text-zinc-400 mb-3">
            回复 ({post.replies.length})
          </h3>
          <div className="space-y-2">
            {post.replies.map((reply) => (
              <Card key={reply.id} className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-600 dark:text-zinc-400">
                    {reply.is_anonymous ? '匿名' : reply.author?.nickname || '用户'}
                  </span>
                  {reply.is_mine && (
                    <span className="text-xs text-primary-500">(自己)</span>
                  )}
                  <span className="text-xs text-gray-400">
                    {formatDate(reply.created_at)}
                  </span>
                  {reply.is_mine && editingReplyId !== reply.id && (
                    <div className="ml-auto flex gap-1">
                      <button
                        onClick={() => startEditReply(reply)}
                        className="text-xs text-gray-400 hover:text-primary-500 transition-colors"
                        title="编辑回复"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteReply(reply.id)}
                        className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        title="删除回复"
                      >
                        🗑
                      </button>
                    </div>
                  )}
                </div>
                {editingReplyId === reply.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editReplyContent}
                      onChange={(e) => setEditReplyContent(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-300
                        dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setEditingReplyId(null)} className="text-xs text-gray-400 hover:text-gray-600">取消</button>
                      <button onClick={handleSaveReply} className="text-xs px-3 py-1 bg-primary-500 text-white rounded-lg hover:bg-primary-600">保存</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-sm text-gray-700 dark:text-zinc-300 prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{reply.content}</ReactMarkdown>
                    </div>
                    {reply.images && reply.images.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {reply.images.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt=""
                            className="max-w-[160px] max-h-[160px] rounded-lg object-cover cursor-pointer hover:opacity-90 transition-opacity"
                            onClick={() => window.open(url, '_blank')}
                          />
                        ))}
                      </div>
                    )}
                  </>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Reply form */}
      {user && (
        <div className="mt-4">
          <div className="flex gap-2">
            <textarea
              name="reply"
              ref={replyTextareaRef}
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="写下你的回复..."
              rows={1}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-primary-300
                dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200 dark:placeholder:text-zinc-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleReply();
                }
              }}
            />
            <Button size="sm" onClick={handleReply} loading={submitting}>
              回复
            </Button>
          </div>

          {/* Reply image previews */}
          {replyImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {replyImages.map((url, i) => (
                <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setReplyImages(replyImages.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center
                      bg-black/50 text-white text-[10px] rounded-full hover:bg-black/70"
                    aria-label="删除图片"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* Reply upload button */}
          <input
            ref={replyFileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUploadReply}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => replyFileInputRef.current?.click()}
            disabled={uploading}
            className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-500 hover:bg-primary-50 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50 dark:hover:bg-zinc-700"
            title="上传图片"
          >
            {uploading ? (
              <span className="text-xs animate-spin">⏳</span>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            )}
            添加图片
          </button>
        </div>
      )}
    </div>
  );
}
