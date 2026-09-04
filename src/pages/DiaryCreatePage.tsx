import { DiaryForm } from '../components/diary/DiaryForm';

export function DiaryCreatePage() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-4">记录心情</h2>
      <DiaryForm />
    </div>
  );
}
