import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DiaryForm } from '../components/diary/DiaryForm';
import { Spinner } from '../components/ui/Spinner';
import { useDiaryStore } from '../stores/diaryStore';
import type { MoodEntry } from '../types/diary';

export function DiaryEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { fetchEntry } = useDiaryStore();
  const [entry, setEntry] = useState<MoodEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      const numId = Number(id);
      if (isNaN(numId)) {
        navigate('/app/diary', { replace: true });
        return;
      }
      fetchEntry(numId).then((data) => {
        if (!data) {
          navigate('/app/diary', { replace: true });
        } else {
          setEntry(data);
        }
        setLoading(false);
      });
    }
  }, [id, fetchEntry, navigate]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-20">
        <Spinner />
      </div>
    );
  }

  if (!entry) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-4">编辑心情</h2>
      <DiaryForm
        entryId={entry.id}
        initialData={{
          mood_score: entry.mood_score,
          mood_label: entry.mood_label,
          body_sensation: entry.body_sensation,
          note: entry.note,
          weather: entry.weather,
        }}
      />
    </div>
  );
}
