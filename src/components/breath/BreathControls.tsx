import { Button } from '../ui/Button';

interface BreathControlsProps {
  isActive: boolean;
  isPaused: boolean;
  phase: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

export function BreathControls({
  isActive,
  isPaused,
  phase,
  onStart,
  onPause,
  onResume,
  onStop,
}: BreathControlsProps) {
  if (phase === 'idle' && !isActive) {
    return (
      <div className="flex justify-center">
        <Button size="lg" onClick={onStart}>
          开始练习
        </Button>
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-3">
      {isPaused ? (
        <Button variant="primary" onClick={onResume}>
          继续
        </Button>
      ) : (
        <Button variant="secondary" onClick={onPause}>
          暂停
        </Button>
      )}
      <Button variant="ghost" onClick={onStop}>
        结束
      </Button>
    </div>
  );
}
