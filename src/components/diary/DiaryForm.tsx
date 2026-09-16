import { isSafeImageUrl } from '../../lib/safeUrl';
import { useState, useRef, useEffect, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { MoodInput } from './MoodInput';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { BODY_SENSATIONS, WEATHER_OPTIONS } from '../../config/constants';
import { useDiaryStore, type DiaryDraft } from '../../stores/diaryStore';
import { useToast } from '../ui/Toast';
import { token } from '../../lib/token';
import type { DiaryUpdateRequest } from '../../types/diary';

interface DiaryFormProps {
  entryId?: number;
  initialData?: {
    mood_score: number;
    mood_label?: string;
    body_sensation?: string;
    note?: string;
    weather?: string;
    images?: string[];
  };
}

function draftFromInitial(data: DiaryFormProps['initialData']): DiaryDraft {
  if (!data) return { mood_score: 3, mood_label: '', body_sensation: '', note: '', weather: '', images: [] };
  return {
    mood_score: data.mood_score,
    mood_label: data.mood_label || '',
    body_sensation: data.body_sensation || '',
    note: data.note || '',
    weather: data.weather || '',
    images: data.images || [],
  };
}

export function DiaryForm({ entryId, initialData }: DiaryFormProps) {
  const navigate = useNavigate();
  const { createEntry, updateEntry, draft: storeDraft, setDraft } = useDiaryStore();
  const { addToast } = useToast();
  const isEditMode = entryId != null;

  // Create mode: restore draft from store; Edit mode: use initialData
  const saved = isEditMode ? draftFromInitial(initialData) : (storeDraft || draftFromInitial(initialData));
  const [moodScore, setMoodScore] = useState(saved.mood_score);
  const [moodLabel, setMoodLabel] = useState(saved.mood_label);
  const [bodySensation, setBodySensation] = useState(saved.body_sensation);
  const [note, setNote] = useState(saved.note);
  const [weather, setWeather] = useState(saved.weather);
  const [images, setImages] = useState<string[]>(saved.images);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist draft to store on every change (create mode only)
  const persist = useCallback(() => {
    if (!isEditMode) {
      setDraft({ mood_score: moodScore, mood_label: moodLabel, body_sensation: bodySensation, note, weather, images });
    }
  }, [isEditMode, moodScore, moodLabel, bodySensation, note, weather, images, setDraft]);

  // Auto-resize textarea
  useEffect(() => {
    const el = noteRef.current;
    if (!el) return;
    el.style.height = '0px';
    el.style.height = Math.min(el.scrollHeight, 300) + 'px';
  }, [note]);

  // ---- 图片上传（日记配图）----
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    const newImages: string[] = [...images];
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
          if (json.data?.url) newImages.push(json.data.url);
        }
      } catch { /* skip */ }
    }
    setImages(newImages);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!moodScore) return;

    setLoading(true);
    try {
      if (isEditMode) {
        const data: DiaryUpdateRequest = {
          mood_score: moodScore,
          mood_label: moodLabel || undefined,
          body_sensation: bodySensation || undefined,
          note: note || undefined,
          weather: weather || undefined,
          images: images.length > 0 ? images : undefined,
        };
        const ok = await updateEntry(entryId, data);
        if (ok) {
          addToast('日记已更新 🌿', 'success');
          navigate('/app/diary');
        } else {
          addToast('更新失败，请稍后重试', 'error');
        }
      } else {
        await createEntry({
          mood_score: moodScore,
          mood_label: moodLabel || undefined,
          body_sensation: bodySensation || undefined,
          note: note || undefined,
          weather: weather || undefined,
          images: images.length > 0 ? images : undefined,
        });
        setDraft(null); // clear draft on success
        addToast('日记已保存 🌿', 'success');
        navigate('/app/diary');
      }
    } catch {
      addToast(isEditMode ? '更新失败，请稍后重试' : '保存失败，请稍后重试', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6">
      {/* Mood selector */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-3 text-center">
          {isEditMode ? '修改心情' : '今天心情如何？'}
        </label>
        <MoodInput value={moodScore} onChange={(v) => { setMoodScore(v); if (!isEditMode) setTimeout(persist, 0); }} />
      </div>

      {/* Mood label */}
      <Input
        label="心情标签"
        placeholder="例：放松、焦虑、开心..."
        value={moodLabel}
        onChange={(e) => { setMoodLabel(e.target.value); setTimeout(persist, 0); }}
      />

      {/* Body sensation */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">身体感受</label>
        <div className="flex flex-wrap gap-2">
          {BODY_SENSATIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => { setBodySensation(s === bodySensation ? '' : s); setTimeout(persist, 0); }}
              className={`px-3 py-1 text-xs rounded-full border transition-colors
                ${bodySensation === s
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Weather */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-2">天气</label>
        <div className="flex flex-wrap gap-2">
          {WEATHER_OPTIONS.map((w) => (
            <button
              key={w.value}
              type="button"
              onClick={() => { setWeather(w.value === weather ? '' : w.value); setTimeout(persist, 0); }}
              className={`px-3 py-1 text-xs rounded-full border transition-colors
                ${weather === w.value
                  ? 'bg-amber-50 border-amber-300 text-amber-700'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
            >
              {w.emoji} {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Notes */}
      <div>
        <label htmlFor="diary-note" className="block text-sm font-medium text-gray-600 mb-1">日记内容</label>
        <textarea
          id="diary-note"
          name="note"
          ref={noteRef}
          rows={4}
          value={note}
          onChange={(e) => { setNote(e.target.value); setTimeout(persist, 0); }}
          placeholder="今天发生了什么？有什么想说的..."
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl resize-none
            focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-transparent
            placeholder:text-gray-400 overflow-y-auto dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200 dark:placeholder:text-zinc-500"
        />

        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {images.map((url, i) => (
              <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img src={isSafeImageUrl(url) ? url : ""} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-0.5 right-0.5 w-5 h-5 flex items-center justify-center
                    bg-black/50 text-white text-xs rounded-full hover:bg-black/70"
                  aria-label="删除图片"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="mt-2 flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-500 hover:bg-primary-50
            px-3 py-1.5 rounded-xl transition-colors disabled:opacity-50 dark:hover:bg-zinc-700"
          title="上传图片"
        >
          {uploading ? (
            <span className="text-xs animate-spin">⏳</span>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
          添加图片
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="ghost" className="flex-1" type="button" onClick={() => navigate('/app/diary')}>
          取消
        </Button>
        <Button className="flex-1" type="submit" loading={loading}>
          {isEditMode ? '保存修改' : '保存记录'}
        </Button>
      </div>
    </form>
  );
}
