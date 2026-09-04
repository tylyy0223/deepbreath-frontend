import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import type { BreathExercise } from '../../types/breath';

export function ExerciseCard({ exercise }: { exercise: BreathExercise }) {
  const navigate = useNavigate();

  return (
    <Card
      className="p-5 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => navigate(`/app/breath/${exercise.id}`)}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-xl flex-shrink-0">
          🫁
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-800 dark:text-zinc-200 text-sm">{exercise.name}</h3>
          <p className="text-xs text-gray-500 mt-1 line-clamp-2">{exercise.description}</p>
          <div className="flex items-center gap-3 mt-3 text-xs text-gray-400">
            <span>⏱ {exercise.duration_min} 分钟</span>
            {exercise.difficulty && <span>📊 {exercise.difficulty}</span>}
          </div>
        </div>
      </div>
    </Card>
  );
}
