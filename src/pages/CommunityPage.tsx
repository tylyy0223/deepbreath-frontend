import { isSafeImageUrl } from '../lib/safeUrl';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useCommunityStore } from '../stores/communityStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useAuthStore } from '../stores/authStore';
import { token } from '../lib/token';

export function CommunityPage() {
  const navigate = useNavigate();
  const { posts, loading, fetchPosts, createPost, likePost, replyPost, deletePost } = useCommunityStore();
  const user = useAuthStore((s) => s.user);
  const [mineOnly, setMineOnly] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newImages, setNewImages] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [replyTo, setReplyTo] = useState<number | null>(null);
  const [replyContent, setReplyContent] = useState('');
  const [replyImages, setReplyImages] = useState<string[]>([]);
  const postTextareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);
  const postFileInputRef = useRef<HTMLInputElement>(null);
  const replyFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize post textarea
  useEffect(() => {
    const el = postTextareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 300) + 'px';
  }, [newContent]);

  // Auto-resize reply textarea
  useEffect(() => {
    const el = replyTextareaRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [replyContent]);

  useEffect(() => { fetchPosts('general', mineOnly); }, [fetchPosts, mineOnly]);

  // ---- 图片上传（发帖）----
  const handleUploadPost = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const result: string[] = [...newImages];
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
    setNewImages(result);
    setUploading(false);
    if (postFileInputRef.current) postFileInputRef.current.value = '';
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

  const handleCreate = async () => {
    if (!newContent.trim() && newImages.length === 0) return;
    setSubmitting(true);
    try {
      await createPost({
        title: newTitle || undefined,
        content: newContent.trim() || ' ',
        images: newImages.length > 0 ? newImages : undefined,
      });
      setShowCreate(false);
      setNewTitle('');
      setNewContent('');
      setNewImages([]);
      fetchPosts('general', mineOnly);
    } catch { /* error */ }
    setSubmitting(false);
  };

  const handleLike = async (id: number) => {
    await likePost(id);
    fetchPosts('general', mineOnly);
  };

  const handleReply = async (postId: number) => {
    if (!replyContent.trim() && replyImages.length === 0) return;
    await replyPost(postId, replyContent.trim() || ' ', false, replyImages.length > 0 ? replyImages : undefined);
    setReplyTo(null);
    setReplyContent('');
    setReplyImages([]);
    fetchPosts('general', mineOnly);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('删除这个帖子？')) return;
    await deletePost(id);
    fetchPosts('general', mineOnly);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200">💬 心情社区</h2>
        <div className="flex items-center gap-2">
          {user && (
            <button
              onClick={() => setMineOnly(!mineOnly)}
              className={`px-3 py-1.5 text-xs rounded-full font-medium transition-colors
                ${mineOnly ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400'}`}
            >
              我的帖子
            </button>
          )}
          {user && (
            <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
              + 发帖
            </Button>
          )}
        </div>
      </div>

      {/* Create post */}
      {showCreate && (
        <Card className="p-4 mb-4">
          <input
            value={newTitle}
            name="title"
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="标题（选填）"
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg mb-2 focus:outline-none focus:ring-2 focus:ring-primary-300
              dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200 dark:placeholder:text-zinc-500"
          />
          <textarea
            name="content"
            ref={postTextareaRef}
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="分享你的想法..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-primary-300
              dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200 dark:placeholder:text-zinc-500"
          />

          {/* Post image previews */}
          {newImages.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {newImages.map((url, i) => (
                <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  <img src={isSafeImageUrl(url) ? url : ""} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setNewImages(newImages.filter((_, j) => j !== i))}
                    className="absolute top-0.5 right-0.5 w-4 h-4 flex items-center justify-center
                      bg-black/50 text-white text-[10px] rounded-full hover:bg-black/70"
                    aria-label="删除图片"
                  >×</button>
                </div>
              ))}
            </div>
          )}

          {/* Post upload button */}
          <input
            ref={postFileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUploadPost}
            className="hidden"
          />
          <div className="flex justify-between items-center mt-2">
            <button
              type="button"
              onClick={() => postFileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-primary-500 hover:bg-primary-50 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50 dark:hover:bg-zinc-700"
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
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}>取消</Button>
              <Button size="sm" onClick={handleCreate} loading={submitting}>发布</Button>
            </div>
          </div>
        </Card>
      )}

      {/* Posts list */}
      {loading ? (
        <div className="py-20"><Spinner /></div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <span className="text-4xl">💬</span>
          <p className="mt-2 text-sm">暂无帖子，来发第一帖吧</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="p-4 cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => navigate(`/app/community/${post.id}`)}
            >
              {post.title && <h3 className="font-medium text-gray-800 dark:text-zinc-200 text-sm mb-1">{post.title}</h3>}
              <div className="text-sm text-gray-700 dark:text-zinc-300 prose prose-sm max-w-none dark:prose-invert line-clamp-4">
  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>{post.content}</ReactMarkdown>
</div>
              {post.images && post.images.length > 0 && (
                <div className="flex gap-2 mt-2">
                  {post.images.slice(0, 3).map((url, i) => (
                    <img
                      key={i}
                      src={isSafeImageUrl(url) ? url : ""}
                      alt=""
                      className="w-16 h-16 rounded-lg object-cover"
                      onClick={(e) => { e.stopPropagation(); window.open(url, '_blank'); }}
                    />
                  ))}
                  {post.images.length > 3 && (
                    <span className="w-16 h-16 rounded-lg bg-gray-100 dark:bg-zinc-700 flex items-center justify-center text-xs text-gray-500 dark:text-zinc-400">
                      +{post.images.length - 3}
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
                {post.author && <span>{post.is_anonymous ? '匿名' : post.author.nickname}</span>}
                <button
                  onClick={(e) => { e.stopPropagation(); handleLike(post.id); }}
                  className={`inline-flex items-center gap-1 transition-colors ${post.is_liked ? 'text-rose-500' : 'text-gray-400 hover:text-rose-400'}`}
                >
                  <svg width="14" height="14" viewBox="0 0 20 20" fill={post.is_liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                  {post.like_count || 0}
                </button>
                <span className="text-xs text-gray-400 dark:text-zinc-500">👁 {post.view_count || 0}</span>
                <button onClick={(e) => { e.stopPropagation(); setReplyTo(replyTo === post.id ? null : post.id); }}>
                  💬 {post.reply_count || 0} 回复
                </button>
                {post.is_mine && (
                  <button onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }} className="ml-auto hover:text-red-500" title="删除">
                    🗑
                  </button>
                )}
              </div>

              {/* Reply box */}
              {replyTo === post.id && (
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-2">
                    <textarea
                      name="reply"
                      ref={replyTextareaRef}
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="写回复..."
                      rows={1}
                      className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg resize-none overflow-y-auto focus:outline-none focus:ring-2 focus:ring-primary-300
                        dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200 dark:placeholder:text-zinc-500"
                    />
                    <Button size="sm" onClick={() => handleReply(post.id)}>回复</Button>
                  </div>
                  {/* Reply image previews */}
                  {replyImages.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {replyImages.map((url, i) => (
                        <div key={i} className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                          <img src={isSafeImageUrl(url) ? url : ""} alt="" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setReplyImages(replyImages.filter((_, j) => j !== i))}
                            className="absolute top-0.5 right-0.5 w-3.5 h-3.5 flex items-center justify-center
                              bg-black/50 text-white text-[9px] rounded-full hover:bg-black/70"
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
                    className="mt-1.5 flex items-center gap-1 text-xs text-gray-400 hover:text-primary-500 transition-colors disabled:opacity-50"
                    title="上传图片"
                  >
                    {uploading ? (
                      <span className="text-xs animate-spin">⏳</span>
                    ) : (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                    )}
                    添加图片
                  </button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
