import { useEffect } from 'react';
import { useBreathStore } from '../../stores/breathStore';
import { ExerciseCard } from './ExerciseCard';
import { Spinner } from '../ui/Spinner';

export function ExerciseList() {
  const { exercises, fetchExercises } = useBreathStore();

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  if (exercises.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-gray-400">加载呼吸练习...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {exercises.map((ex) => (
        <ExerciseCard key={ex.id} exercise={ex} />
      ))}
    </div>
  );
}
