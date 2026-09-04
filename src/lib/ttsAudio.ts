import api from './axios';
import { ENDPOINTS } from '../config/api';

let currentAudio: HTMLAudioElement | null = null;

const VOICE_STORAGE_KEY = 'tts_voice';

export type TtsVoice = 'female' | 'male';

/** 读取用户语音偏好 */
export function getTtsVoice(): TtsVoice {
  try {
    const v = localStorage.getItem(VOICE_STORAGE_KEY);
    if (v === 'male') return 'male';
  } catch {}
  return 'female';
}

/** 保存用户语音偏好 */
export function setTtsVoice(voice: TtsVoice): void {
  try {
    localStorage.setItem(VOICE_STORAGE_KEY, voice);
  } catch {}
}

/** 停止当前播放 */
export function stopTts() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.currentTime = 0;
    currentAudio = null;
  }
}

/**
 * 播放文本音频（已有缓存则免费秒播；无缓存则生成并扣费）。
 * ref 用于把音频绑定到内容（article:<slug> / post:<id>），列表小图标据此显示。
 */
export async function playTts(
  text: string,
  opts: { ref?: string; onEnd?: () => void } = {},
): Promise<void> {
  stopTts();
  const voiceId = getTtsVoice();
  const res = await api.post(
    ENDPOINTS.TTS_SYNTHESIZE,
    { text, ref: opts.ref, voice_id: voiceId },
    { responseType: 'blob' },
  );
  const url = URL.createObjectURL(res.data);
  const audio = new Audio(url);
  currentAudio = audio;
  audio.onended = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
    opts.onEnd?.();
  };
  audio.onerror = () => {
    URL.revokeObjectURL(url);
    if (currentAudio === audio) currentAudio = null;
    opts.onEnd?.();
  };
  await audio.play();
}

/** 批量检查文本是否已有音频（key → text），返回有音频的 key 列表 */
export async function checkAudioKeys(texts: Record<string, string>): Promise<string[]> {
  const entries = Object.entries(texts).filter(([, t]) => t);
  if (entries.length === 0) return [];
  try {
    const res = await api.post(ENDPOINTS.TTS_EXISTS, { texts: Object.fromEntries(entries) });
    return res.data.data?.keys || [];
  } catch {
    return [];
  }
}

/** 批量检查内容标识是否绑定音频（文章卡片小图标） */
export async function checkBoundRefs(refs: string[]): Promise<string[]> {
  if (refs.length === 0) return [];
  try {
    const res = await api.post(ENDPOINTS.TTS_BOUND, { refs });
    return res.data.data?.refs || [];
  } catch {
    return [];
  }
}
