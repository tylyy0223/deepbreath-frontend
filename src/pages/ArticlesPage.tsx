import { useEffect, useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import { useContentStore } from '../stores/contentStore';
import { useCommunityStore } from '../stores/communityStore';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { checkBoundRefs, playTts, stopTts } from '../lib/ttsAudio';

interface DisplayArticle {
  slug: string;
  title: string;
  content?: string;
  excerpt?: string;
  category?: string;
  created_at?: string;
  source: 'content' | 'community';
}

export function ArticlesPage() {
  const { categories, articles: contentArticles, recommendations, loading, pageLoading, totalArticles, fetchCategories, fetchArticles, fetchArticle, fetchRecommendations } = useContentStore();
  const { posts: communityPosts, fetchPosts: fetchCommunity, fetchPost, deletePost } = useCommunityStore();
  const [activeCat, setActiveCat] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;  // 内容卡片 12/页 (ArticlesPage 是 2 列, 6 行)
  const [selected, setSelected] = useState<DisplayArticle | null>(null);
  const [audioRefs, setAudioRefs] = useState<Set<string>>(new Set());
  const [playingRef, setPlayingRef] = useState<string | null>(null);

  // 切类别/搜索时回到第 1 页
  useEffect(() => { setPage(1); }, [activeCat]);

  // 音频绑定标识：官方文章 article:<slug>，社区存档 post:<id>
  const refOf = (a: Pick<DisplayArticle, 'slug' | 'source'>) =>
    a.source === 'community' ? `post:${a.slug.replace('community-', '')}` : `article:${a.slug}`;

  // 批量检查文章卡片是否有绑定音频（显示 🔊 小图标）
  useEffect(() => {
    const refs: string[] = [];
    contentArticles.forEach((a) => { if (a.slug) refs.push(`article:${a.slug}`); });
    communityPosts.filter((p) => p.category === 'article').forEach((p) => refs.push(`post:${p.id}`));
    checkBoundRefs(refs).then((keys) => setAudioRefs(new Set(keys)));
  }, [contentArticles, communityPosts]);

  useEffect(() => {
    fetchCategories();
    fetchArticles(activeCat, page);
    fetchRecommendations();
    // mine=true: 科普存档只显示当前用户自己保存的文章
    fetchCommunity('article', true);
  }, [fetchCategories, fetchArticles, fetchRecommendations, fetchCommunity, activeCat, page]);

  // Merge content API articles + community articles (archived only shown in "全部")
  const allArticles: DisplayArticle[] = useMemo(() => {
    const content: DisplayArticle[] = contentArticles.map((a) => ({
      slug: a.slug,
      title: a.title,
      content: a.content,
      excerpt: a.excerpt,
      category: a.category,
      created_at: a.created_at,
      source: 'content' as const,
    }));
    if (activeCat) return content;
    const community: DisplayArticle[] = communityPosts
      .filter((p) => p.category === 'article')
      .map((p) => ({
        slug: `community-${p.id}`,
        title: p.title || '无标题',
        content: p.content,
        excerpt: p.content?.slice(0, 100),
        category: '科普存档',
        created_at: p.created_at,
        source: 'community' as const,
      }));
    // Sort: newest first
    return [...content, ...community].sort((a, b) => {
      const da = a.created_at ? new Date(a.created_at).getTime() : 0;
      const db = b.created_at ? new Date(b.created_at).getTime() : 0;
      return db - da;
    });
  }, [contentArticles, communityPosts, activeCat]);

  const handleArticle = async (a: DisplayArticle) => {
    if (a.source === 'content') {
      await fetchArticle(a.slug);
      const detail = useContentStore.getState().currentArticle;
      if (detail) {
        setSelected({
          ...a,
          content: detail.content || detail.excerpt,
        });
        return;
      }
    }
    // Community article — fetch full content via detail endpoint
    if (a.source === 'community') {
      const id = parseInt(a.slug.replace('community-', ''), 10);
      if (id) {
        const full = await fetchPost(id);
        if (full) {
          setSelected({ ...a, content: full.content || a.content });
          return;
        }
      }
    }
    setSelected(a);
  };

  const handleDelete = async (slug: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('确定要删除这篇文章吗？')) return;
    const id = parseInt(slug.replace('community-', ''), 10);
    if (id) {
      await deletePost(id);
      if (selected?.slug === slug) setSelected(null);
      fetchCommunity('article', true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-4">📰 科普文章</h2>

      {/* Category tabs */}
      {categories.length > 0 && (
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => { setActiveCat(undefined); setPage(1); }}
            className={`px-3 py-1.5 text-xs rounded-full font-medium whitespace-nowrap transition-colors
              ${!activeCat ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400'}`}
          >
            全部
          </button>
          {categories.map((c) => (
            <button
              key={c.slug}
              onClick={() => { setActiveCat(c.slug); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full font-medium whitespace-nowrap transition-colors
                ${activeCat === c.slug ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}

      {/* Personalized recommendations */}
      {!selected && recommendations && recommendations.articles.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300">✨ 为你推荐</h3>
            <span className="text-xs text-gray-400 dark:text-zinc-500">{recommendations.reason}</span>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {recommendations.articles.map((a) => (
              <Card
                key={a.slug}
                className="p-4 min-w-[220px] max-w-[260px] flex-shrink-0 cursor-pointer hover:shadow-md transition-shadow
                  bg-gradient-to-br from-primary-50/60 to-white dark:from-primary-900/20 dark:to-zinc-800"
                onClick={() => handleArticle({ slug: a.slug, title: a.title, excerpt: a.excerpt, source: 'content' })}
              >
                <h4 className="font-medium text-gray-800 dark:text-zinc-200 text-sm line-clamp-2">{a.title}</h4>
                {a.excerpt && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 line-clamp-2">{a.excerpt}</p>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Detail view */}
      {selected ? (
        <Card className="p-6">
          <button onClick={() => setSelected(null)} className="text-sm text-gray-400 hover:text-gray-600 mb-4">
            ← 返回列表
          </button>
          <h1 className="text-xl font-semibold text-gray-800 dark:text-zinc-200 mb-2">{selected.title}</h1>
          <div className="flex items-center gap-2">
            {selected.category && (
              <span className="text-xs text-primary-600 bg-primary-50 dark:bg-primary-900/30 dark:text-primary-400 px-2 py-0.5 rounded-full">
                {selected.category}
              </span>
            )}
            {selected.source === 'community' && (
              <button
                onClick={(e) => handleDelete(selected.slug, e)}
                className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 px-2 py-0.5 rounded-full"
              >
                🗑 删除
              </button>
            )}
            {(selected.content || selected.excerpt) && (
              <button
                onClick={async () => {
                  const key = refOf(selected);
                  if (playingRef === key) { stopTts(); setPlayingRef(null); return; }
                  setPlayingRef(key);
                  try {
                    await playTts(selected.content || selected.excerpt || '', { ref: key, onEnd: () => setPlayingRef(null) });
                    setAudioRefs((s) => new Set([...s, key]));
                  } catch { setPlayingRef(null); }
                }}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  playingRef === refOf(selected)
                    ? 'bg-red-50 border-red-200 text-red-500 dark:bg-red-900/20 dark:border-red-800'
                    : audioRefs.has(refOf(selected))
                      ? 'bg-primary-50 border-primary-200 text-primary-700 hover:bg-primary-100 dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-400'
                      : 'bg-white border-gray-200 text-gray-500 hover:text-primary-600 hover:border-primary-300 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400 dark:hover:text-primary-400 dark:hover:border-primary-600'
                }`}
                title={audioRefs.has(refOf(selected)) ? '此内容已生成音频，点击播放' : '生成语音朗读（15 Credits）'}
              >
                {playingRef === refOf(selected) ? '⏹ 停止' : audioRefs.has(refOf(selected)) ? '🔊 播放音频' : '🎵 生成音频'}
              </button>
            )}
          </div>
          <div className="mt-4 prose prose-sm prose-gray max-w-none dark:prose-invert">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
              {selected.content || selected.excerpt || '暂无内容'}
            </ReactMarkdown>
          </div>
        </Card>
      ) : loading ? (
        <div className="py-20"><Spinner /></div>
      ) : (
        <>
          {pageLoading && (
            <div className="text-center py-2 text-xs text-gray-400">加载中...</div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {allArticles.map((a) => (
              <Card
                key={a.slug}
                className="p-5 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleArticle(a)}
              >
                <div className="flex items-start justify-between">
                  <h3 className="font-medium text-gray-800 dark:text-zinc-200 text-sm line-clamp-2 flex-1">{a.title}</h3>
                </div>
                {a.excerpt && (
                  <p className="text-xs text-gray-500 dark:text-zinc-400 mt-2 line-clamp-2">{a.excerpt}</p>
                )}
                <div className="flex items-center gap-3 mt-3 text-xs text-gray-400 dark:text-zinc-500">
                  {a.category && <span className="bg-gray-100 dark:bg-zinc-700 px-2 py-0.5 rounded-full">{a.category}</span>}
                  {audioRefs.has(refOf(a)) && <span className="bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400 px-2 py-0.5 rounded-full" title="已绑定音频">🔊</span>}
                  {a.created_at && <span>{new Date(a.created_at).toLocaleDateString('zh-CN')}</span>}
                  {a.source === 'community' && (
                    <button
                      onClick={(e) => handleDelete(a.slug, e)}
                      className="text-gray-400 hover:text-red-500 ml-auto"
                      title="删除"
                    >
                      <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H3a1 1 0 000 2h1v11a2 2 0 002 2h8a2 2 0 002-2V6h1a1 1 0 100-2h-2V3a1 1 0 00-1-1H6zm2 1h4v1H8V3zm-1 4a1 1 0 011 1v6a1 1 0 11-2 0V8a1 1 0 011-1zm5 1a1 1 0 10-2 0v6a1 1 0 102 0V8z" clipRule="evenodd" />
                      </svg>
                    </button>
                  )}
                </div>
              </Card>
            ))}
            {allArticles.length === 0 && (
              <div className="col-span-2 text-center py-12 text-gray-400">
                <span className="text-4xl">📰</span>
                <p className="mt-2 text-sm">暂无文章，把 AI 回答「存为文章」后在这里查看</p>
              </div>
            )}
          </div>

          {/* 分页 */}
          {totalArticles > PAGE_SIZE && (
            <div className="mt-6 flex items-center justify-between text-sm">
              <div className="text-xs text-gray-400">
                {activeCat ? '本类目' : '全部'} 共 {totalArticles} 篇 · 第 {page} / {Math.ceil(totalArticles / PAGE_SIZE)} 页
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="px-2.5 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="首页"
                >«</button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                >‹ 上一页</button>
                <span className="px-3 py-1.5 text-gray-800 font-medium">
                  {page} / {Math.ceil(totalArticles / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(Math.ceil(totalArticles / PAGE_SIZE), p + 1))}
                  disabled={page * PAGE_SIZE >= totalArticles}
                  className="px-3 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                >下一页 ›</button>
                <button
                  onClick={() => setPage(Math.ceil(totalArticles / PAGE_SIZE))}
                  disabled={page * PAGE_SIZE >= totalArticles}
                  className="px-2.5 py-1.5 rounded-md text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:hover:bg-transparent"
                  title="末页"
                >»</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
