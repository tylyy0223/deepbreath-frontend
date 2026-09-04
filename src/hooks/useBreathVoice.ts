import { useCallback, useRef, useState } from 'react';

// 预生成的引导语音（MiniMax TTS，随前端静态部署，零运行成本）
const CLIPS = ['start', 'inhale', 'hold', 'exhale', 'rest', 'complete'] as const;
export type VoiceClip = (typeof CLIPS)[number];

const STORAGE_KEY = 'breath_voice_enabled';

export function useBreathVoice() {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(STORAGE_KEY) !== '0');
  const audioRef = useRef<Map<VoiceClip, HTMLAudioElement> | null>(null);
  const playingRef = useRef<HTMLAudioElement | null>(null);

  // 懒加载：首次播放时创建（避免未进练习就请求音频）
  const getAudio = useCallback((clip: VoiceClip) => {
    if (!audioRef.current) {
      audioRef.current = new Map(
        CLIPS.map((c) => [c, new Audio(`${import.meta.env.BASE_URL}audio/breath/${c}.mp3`)]),
      );
    }
    return audioRef.current.get(clip)!;
  }, []);

  const play = useCallback((clip: VoiceClip) => {
    if (localStorage.getItem(STORAGE_KEY) === '0') return;
    // 停掉上一段，避免快节奏练习中语音叠音
    if (playingRef.current) {
      playingRef.current.pause();
      playingRef.current.currentTime = 0;
    }
    const audio = getAudio(clip);
    playingRef.current = audio;
    audio.currentTime = 0;
    audio.play().catch(() => { /* 浏览器策略拦截时静默失败 */ });
  }, [getAudio]);

  const stop = useCallback(() => {
    if (playingRef.current) {
      playingRef.current.pause();
      playingRef.current.currentTime = 0;
      playingRef.current = null;
    }
  }, []);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      if (!next && playingRef.current) {
        playingRef.current.pause();
        playingRef.current.currentTime = 0;
      }
      return next;
    });
  }, []);

  return { enabled, toggle, play, stop };
}
