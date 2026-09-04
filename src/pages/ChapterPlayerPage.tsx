/** AI 听书 · 章节播放页 (audio + 同步评析稿高亮 + 断点续听 + 连播 + 全书倒计时 + Media Session) */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import api from '../lib/axios';
import { ENDPOINTS } from '../config/api';

interface Chapter {
  chapter_idx: number;
  title: string;
  audio_url: string;
  audio_duration: number;
  explanation: string;
  explanation_chars: number;
}

interface ChapterListItem {
  chapter_idx: number;
  title: string;
  audio_duration: number;
  explanation_chars?: number;
}

interface Limit {
  enabled: boolean;
  limit_minutes: number;
  used_seconds: number;
  remaining_seconds: number;
}

interface Segment {
  text: string;
  estDuration: number;  // 估算这段占多少秒
  startSec: number;     // 在本章 audio 里的起始秒
  idx: number;
}

const REPORT_INTERVAL = 10;
const AUTO_NEXT_KEY = 'book_listen_auto_next';

// 把 explanation 拆成段: 以 \n\n 或 markdown 标题 / 列表项为界
function splitSegments(explanation: string, audioDuration: number): Segment[] {
  // 先把 markdown 简化 (去掉 # ** > 等, 但保留段落结构)
  const cleaned = explanation
    .replace(/^#+\s*/gm, '')
    .replace(/\*\*/g, '')
    .replace(/^>\s*/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[[^\]]{1,30}\]/g, '')
    .replace(/⚠️|💡|🎯|📌/g, '')
    // 末尾"鼓励支持正版：[购买链接](url)"整段删, UI 不显示购买字样
    .replace(/鼓励支持正版[\s\S]*$/, '')
    .trim();
  // 段落以空行 (\n\n) 分隔
  const paras = cleaned.split(/\n\n+/).map((p) => p.trim()).filter((p) => p.length > 0);
  const totalChars = paras.reduce((s, p) => s + p.length, 0) || 1;
  let cursor = 0;
  return paras.map((p, i) => {
    const est = (p.length / totalChars) * audioDuration;
    const seg: Segment = { text: p, estDuration: est, startSec: cursor, idx: i };
    cursor += est;
    return seg;
  });
}

// 找当前 high-light 段: 累计时长
function findActiveSegment(segments: Segment[], currentTime: number): number {
  for (let i = segments.length - 1; i >= 0; i--) {
    if (currentTime >= segments[i].startSec - 0.5) return i;
  }
  return 0;
}

export function ChapterPlayerPage() {
  const { serial, idx } = useParams<{ serial: string; idx: string }>();
  const chapterIdx = parseInt(idx || '1', 10);
  const navigate = useNavigate();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [chapters, setChapters] = useState<ChapterListItem[]>([]);
  const [limit, setLimit] = useState<Limit | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pos, setPos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoNext, setAutoNext] = useState<boolean>(() => {
    try { return localStorage.getItem(AUTO_NEXT_KEY) !== 'false'; } catch { return true; }
  });
  const [countdown, setCountdown] = useState<number>(0);
  const [activeSeg, setActiveSeg] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const lastReportRef = useRef<number>(0);  // 累计已听秒 (跨章节, 上报游标)
  const listenedRef = useRef<number>(0);    // 累计"实际播放"秒 (排除 seek 跳过的)
  const lastTickRef = useRef<number>(0);     // 上一帧的 audio.currentTime (用于算 delta)
  const isPlayingRef = useRef<boolean>(false);
  const wantPlayRef = useRef<boolean>(false);
  const segmentsRef = useRef<HTMLElement[]>([]);
  const countdownTimerRef = useRef<number | null>(null);

  useEffect(() => {
    load();
  }, [serial, idx]);

  const load = async () => {
    setLoading(true);
    setError(null);
    setActiveSeg(0);
    setPos(0);
    // 重置 tick (lastReportRef/listenedRef 跨章节保留, 是用户总已听秒)
    lastTickRef.current = 0;
    isPlayingRef.current = false;
    try {
      const [ch, lm, list] = await Promise.all([
        api.get(ENDPOINTS.BOOK_LISTEN_CHAPTER(serial!, chapterIdx)),
        api.get(ENDPOINTS.BOOK_LISTEN_LIMIT),
        api.get(ENDPOINTS.BOOK_LISTEN_SERIAL(serial!)),
      ]);
      setChapter(ch.data.data);
      setLimit(lm.data.data);
      setChapters(list.data.data?.chapters || []);
    } catch (e: any) {
      setError(e?.response?.data?.detail || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const audioUrl = chapter
    ? (chapter.audio_url.startsWith('http')
        ? chapter.audio_url
        : `${window.location.origin}${chapter.audio_url}`)
    : '';

  // 拆段 (按 audio 长度比例分配)
  const segments = useMemo<Segment[]>(() => {
    if (!chapter) return [];
    return splitSegments(chapter.explanation, chapter.audio_duration);
  }, [chapter]);

  // 切章后 wantPlayRef → 自动 play
  useEffect(() => {
    if (!loading && chapter && wantPlayRef.current) {
      const audio = audioRef.current;
      if (audio) {
        audio.play().catch(() => {});
      }
      wantPlayRef.current = false;
    }
  }, [loading, chapter]);

  // 上报进度 + 累加限流 + 同步高亮
  // 关键: listened_sec 只算"实际播放"过的秒, 不算 seek 跳过的部分
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = async () => {
      const t = audio.currentTime;
      setPos(Math.floor(t));
      // 同步高亮
      const segIdx = findActiveSegment(segments, t);
      setActiveSeg(segIdx);
      const el = segmentsRef.current[segIdx];
      if (el && el.scrollIntoView) {
        try { el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch {}
      }
      // 累计"已听秒": delta 在 (0, 1.5s) 之内才算播放, 否则视为 seek 跳过
      if (isPlayingRef.current) {
        const delta = t - lastTickRef.current;
        if (delta > 0 && delta < 1.5) {
          listenedRef.current += delta;
        }
      }
      lastTickRef.current = t;
      // 上报 (听够 10s 就报一次)
      const since = listenedRef.current - lastReportRef.current;
      if (since >= REPORT_INTERVAL) {
        const deltaSec = Math.floor(since);
        try {
          await api.post(ENDPOINTS.BOOK_LISTEN_PROGRESS(serial!, chapterIdx), {
            chapter_idx: chapterIdx,
            position_sec: Math.floor(t),
            listened_sec: deltaSec,
          });
          lastReportRef.current += deltaSec;
          // 顺便刷新 limit
          const lm = await api.get(ENDPOINTS.BOOK_LISTEN_LIMIT);
          setLimit(lm.data.data);
        } catch (e: any) {
          if (e?.response?.status === 429) {
            audio.pause();
            setPlaying(false);
            setError('⛔ 今日听书时间已用完, 明天可以继续');
          }
        }
      }
    };
    audio.addEventListener('timeupdate', onTime);
    return () => audio.removeEventListener('timeupdate', onTime);
  }, [chapter, segments, serial, chapterIdx, limit?.limit_minutes]);

  // 监听 play/pause, 设 isPlayingRef (决定是否累计 listened)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onPlay = () => { isPlayingRef.current = true; lastTickRef.current = audio.currentTime; };
    const onPause = () => { isPlayingRef.current = false; lastTickRef.current = audio.currentTime; };
    const onSeeked = () => { lastTickRef.current = audio.currentTime; };  // seek 后重置 tick
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('seeked', onSeeked);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('seeked', onSeeked);
    };
  }, [chapter]);

  // Media Session (mac 锁屏 / 通知中心控制)
  useEffect(() => {
    if (!('mediaSession' in navigator) || !chapter) return;
    const bookName = serial === '004-271' ? '蛤蟆先生去看心理医生'
      : serial === '004-028' ? '弗洛伊德文集'
      : serial === '004-176' ? '7个顶级心理预言'
      : serial === '004-175' ? '20个心理学典型现象'
      : serial === '004-211' ? '少有人走的路'
      : serial === '004-213' ? '自控力'
                        : serial === '004-007' ? '衰老的真相'
                        : serial === '004-006' ? '荣格分析心理学导论'
                        : serial === '004-005' ? '女性心灵成长图鉴'
                        : serial === '004-004' ? '超级心智'
      : serial === '004-002' ? '遇见未知的自己'
      : serial === '004-003' ? '走出孤独'
      : serial;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: chapter.title,
      artist: bookName,
      album: 'AI 听书 · 深呼吸',
    });
    const audio = audioRef.current;
    if (!audio) return;
    const play = () => audio.play();
    const pause = () => audio.pause();
    const seekFwd = () => { audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 30); };
    const seekBwd = () => { audio.currentTime = Math.max(0, audio.currentTime - 30); };
    const prev = () => { if (chapterIdx > 1) gotoChapter(chapterIdx - 1, true); };
    const next = () => { if (chapters.some((c) => c.chapter_idx === chapterIdx + 1)) gotoChapter(chapterIdx + 1, true); };
    navigator.mediaSession.setActionHandler('play', play);
    navigator.mediaSession.setActionHandler('pause', pause);
    navigator.mediaSession.setActionHandler('seekforward', seekFwd);
    navigator.mediaSession.setActionHandler('seekbackward', seekBwd);
    navigator.mediaSession.setActionHandler('previoustrack', prev);
    navigator.mediaSession.setActionHandler('nexttrack', next);
    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('previoustrack', null);
      navigator.mediaSession.setActionHandler('nexttrack', null);
    };
  }, [chapter, chapterIdx, chapters, serial]);

  // 更新 Media Session 播放状态
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.playbackState = playing ? 'playing' : 'paused';
  }, [playing]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause(); else audio.play();
    setPlaying(!playing);
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const v = parseInt(e.target.value, 10);
    audio.currentTime = v;
    setPos(v);
  };

  // 跳 30s
  const seekDelta = (delta: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.duration || 0, audio.currentTime + delta));
  };

  // 跳到指定段
  const jumpToSegment = (segIdx: number) => {
    const audio = audioRef.current;
    const seg = segments[segIdx];
    if (!audio || !seg) return;
    audio.currentTime = seg.startSec;
    setPos(Math.floor(seg.startSec));
    setActiveSeg(segIdx);
  };

  const gotoChapter = (targetIdx: number, autoplay: boolean) => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(0);
    wantPlayRef.current = autoplay;
    navigate(`/app/knowledge/listen/${serial}/${targetIdx}`);
  };

  const onAudioEnded = () => {
    setPlaying(false);
    if (!autoNext) return;
    const nextIdx = chapterIdx + 1;
    if (!chapters.some((c) => c.chapter_idx === nextIdx)) {
      setError('🎉 本书已听完, 感谢你的专注!');
      return;
    }
    if (limit && limit.remaining_seconds < 30) {
      setError('⛔ 今日听书时间已用完, 明天可以继续');
      return;
    }
    setCountdown(3);
    countdownTimerRef.current = window.setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          if (countdownTimerRef.current) {
            clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
          }
          gotoChapter(nextIdx, true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const cancelCountdown = () => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCountdown(0);
  };

  const goNext = () => gotoChapter(chapterIdx + 1, true);
  const goPrev = () => { if (chapterIdx > 1) gotoChapter(chapterIdx - 1, true); };

  const toggleAutoNext = () => {
    const next = !autoNext;
    setAutoNext(next);
    try { localStorage.setItem(AUTO_NEXT_KEY, String(next)); } catch {}
  };

  const fmt = (sec: number) => {
    if (!isFinite(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const fmtLong = (sec: number) => {
    if (!isFinite(sec) || sec < 0) return '0分';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}时${m}分`;
    return `${m}分`;
  };

  // 全书剩余秒数: 当前章剩余 + 之后所有章
  const bookRemaining = useMemo(() => {
    if (!chapter) return 0;
    const cur = Math.max(0, chapter.audio_duration - pos);
    const later = chapters
      .filter((c) => c.chapter_idx > chapterIdx)
      .reduce((s, c) => s + c.audio_duration, 0);
    return cur + later;
  }, [chapter, pos, chapters, chapterIdx]);

  // 当前章剩余
  const chapterRemaining = chapter ? Math.max(0, chapter.audio_duration - pos) : 0;

  const hasNext = chapters.some((c) => c.chapter_idx === chapterIdx + 1);
  const hasPrev = chapterIdx > 1;

  if (loading) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }
  if (error && !chapter) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <Card className="p-6 text-red-500">{error}</Card>
        <Link to={`/app/knowledge/listen/${serial}`} className="block mt-4 text-sm text-emerald-600">← 返回章节列表</Link>
      </div>
    );
  }
  if (!chapter) return null;

  return (
    <div className="p-6 max-w-3xl mx-auto pb-32">
      <div className="flex items-center justify-between mb-4">
        <div>
          <Link to={`/app/knowledge/listen/${serial}`} className="text-sm text-emerald-600 hover:underline">
            ← 章节列表
          </Link>
          <div className="text-xs text-gray-400 mt-0.5">
            📚 {serial === '004-271' ? '蛤蟆先生去看心理医生'
              : serial === '004-028' ? '弗洛伊德文集'
              : serial === '004-176' ? '7个顶级心理预言'
              : serial === '004-175' ? '20个心理学典型现象'
              : serial === '004-211' ? '少有人走的路'
              : serial === '004-213' ? '自控力'
              : serial === '004-002' ? '遇见未知的自己'
              : serial === '004-003' ? '走出孤独'
              : serial}
          </div>
          <h1 className="text-xl font-semibold text-gray-800 mt-1">{chapter.title}</h1>
        </div>
        {limit && (
          <div className="text-xs text-gray-500 text-right">
            <div>今日 {fmt(limit.used_seconds)} / {limit.limit_minutes}min</div>
            <div className="text-emerald-600 font-medium mt-0.5">
              本书剩 {fmtLong(bookRemaining)}
            </div>
          </div>
        )}
      </div>

      <Card className="p-4 mb-4 sticky top-0 z-10 bg-white shadow">
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onEnded={onAudioEnded}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onSeeked={() => { lastTickRef.current = audioRef.current?.currentTime || 0; }}
        />
        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            disabled={!hasPrev}
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 text-sm"
            title="上一章"
          >⏮</button>
          <button
            onClick={() => seekDelta(-30)}
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs"
            title="后退 30 秒"
          >30⏪</button>
          <button
            onClick={togglePlay}
            className="w-12 h-12 rounded-full bg-emerald-500 text-white text-xl hover:bg-emerald-600"
          >
            {playing ? '⏸' : '▶'}
          </button>
          <button
            onClick={() => seekDelta(30)}
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 text-xs"
            title="快进 30 秒"
          >⏩30</button>
          <button
            onClick={goNext}
            disabled={!hasNext}
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-30 text-sm"
            title="下一章"
          >⏭</button>
        </div>
        <div className="mt-3">
          <input
            type="range"
            min={0}
            max={chapter.audio_duration}
            value={pos}
            onChange={seek}
            className="w-full accent-emerald-500"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{fmt(pos)} / {fmt(chapter.audio_duration)}</span>
            <span>剩 {fmt(chapterRemaining)}</span>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-4 text-gray-500">
            <span>评析稿 {chapter.explanation_chars} 字</span>
            {limit && limit.remaining_seconds < 60 && (
              <span className="text-red-500 font-medium">⚠️ 今日不足 1 分钟</span>
            )}
          </div>
          <button
            onClick={toggleAutoNext}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              autoNext
                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {autoNext ? '🔁 连播开' : '⏹ 连播关'}
          </button>
        </div>

        {countdown > 0 && (
          <div className="mt-3 p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-sm">
            <span className="text-emerald-700">⏭ {countdown} 秒后自动播放下一章...</span>
            <button onClick={cancelCountdown} className="text-emerald-600 hover:underline text-xs">取消</button>
          </div>
        )}

        {error && countdown === 0 && (
          <div className="mt-2 text-xs text-center text-amber-600">{error}</div>
        )}
      </Card>

      <Card className="p-6">
        {segments.length === 0 ? (
          <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
            {chapter.explanation}
          </pre>
        ) : (
          <div className="space-y-3 text-sm text-gray-700 leading-relaxed">
            {segments.map((seg, i) => (
              <p
                key={i}
                ref={(el) => { if (el) segmentsRef.current[i] = el; }}
                onClick={() => jumpToSegment(i)}
                className={`cursor-pointer rounded px-2 py-1 transition ${
                  i === activeSeg
                    ? 'bg-yellow-100 text-gray-900 font-medium border-l-4 border-emerald-500'
                    : 'hover:bg-gray-50'
                }`}
                title="点击跳到这段"
              >
                {seg.text}
              </p>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
