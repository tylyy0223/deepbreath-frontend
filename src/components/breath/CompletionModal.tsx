import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';

interface CompletionModalProps {
  exerciseName: string;
  durationSec: number;
  onSave: () => Promise<void>;
}

export function CompletionModal({ exerciseName, durationSec, onSave }: CompletionModalProps) {
  const navigate = useNavigate();
  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;

  const handleSave = async () => {
    await onSave();
    navigate('/app/breath');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <Card className="w-full max-w-sm p-6 text-center">
        <span className="text-5xl">🎉</span>
        <h3 className="mt-3 text-lg font-semibold text-gray-800 dark:text-zinc-200">练习完成！</h3>
        <p className="text-sm text-gray-500 mt-1">{exerciseName}</p>
        <p className="text-2xl font-bold text-primary-600 mt-3">
          {minutes > 0 ? `${minutes}分` : ''}{seconds}秒
        </p>
        <div className="flex gap-3 mt-6">
          <Button variant="ghost" className="flex-1" onClick={() => navigate('/app/breath')}>
            放弃记录
          </Button>
          <Button className="flex-1" onClick={handleSave}>
            保存记录
          </Button>
        </div>
      </Card>
    </div>
  );
}
