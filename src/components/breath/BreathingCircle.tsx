import type { BreathPhase, PhaseConfig } from '../../types/breath';
import { DEFAULT_BREATH_CONFIG } from '../../config/constants';

interface BreathingCircleProps {
  phase: BreathPhase;
  config?: PhaseConfig;
}

function getScale(phase: BreathPhase): number {
  switch (phase) {
    case 'inhale': return 1.0;
    case 'hold': return 1.0;
    case 'exhale': return 0.5;
    case 'rest': return 0.5;
    default: return 0.5;
  }
}

function getDuration(phase: BreathPhase, config: PhaseConfig): number {
  if (phase === 'idle') return 1000;
  return config[phase];
}

export function BreathingCircle({ phase, config = DEFAULT_BREATH_CONFIG }: BreathingCircleProps) {
  const scale = getScale(phase);
  const duration = getDuration(phase, config);
  const isIdle = phase === 'idle';

  return (
    <div className="flex items-center justify-center py-12">
      <div className="relative flex items-center justify-center">
        {/* Outer glow */}
        <div
          className="absolute rounded-full bg-primary-200/30"
          style={{
            width: '240px',
            height: '240px',
            transform: `scale(${scale * 1.2})`,
            transition: `transform ${duration}ms ease-in-out`,
          }}
        />
        {/* Main circle */}
        <div
          className="rounded-full flex items-center justify-center"
          style={{
            width: '200px',
            height: '200px',
            backgroundColor: 'rgba(34, 197, 94, 0.25)',
            boxShadow: `0 0 ${60 * scale}px rgba(34, 197, 94, 0.3)`,
            transform: `scale(${scale})`,
            transition: isIdle ? 'none' : `transform ${duration}ms ease-in-out`,
          }}
        >
          {/* Inner circle */}
          <div
            className="rounded-full bg-white/80 flex items-center justify-center"
            style={{
              width: '120px',
              height: '120px',
              transform: `scale(${1 / scale})`,
              transition: isIdle ? 'none' : `transform ${duration}ms ease-in-out`,
            }}
          >
            <span className="text-4xl select-none">
              {phase === 'inhale' && '⬆️'}
              {phase === 'hold' && '✋'}
              {phase === 'exhale' && '⬇️'}
              {phase === 'rest' && '😌'}
              {phase === 'idle' && '🫁'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
