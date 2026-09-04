import type { BreathPhase } from '../../types/breath';

const GUIDANCE: Record<BreathPhase, { text: string; subtext: string }> = {
  idle: { text: '准备开始', subtext: '调整到一个舒适的姿势' },
  inhale: { text: '吸气', subtext: '缓缓地、深深地吸气' },
  hold: { text: '屏息', subtext: '自然地保持住' },
  exhale: { text: '呼气', subtext: '缓慢地、完全地呼出' },
  rest: { text: '放松', subtext: '自然呼吸，感受平静' },
};

export function BreathGuidance({
  phase,
  cycleCount,
  totalCycles,
}: {
  phase: BreathPhase;
  cycleCount: number;
  totalCycles: number;
}) {
  const g = GUIDANCE[phase];

  return (
    <div className="text-center">
      <h2 className="text-2xl font-semibold text-gray-700 dark:text-zinc-300 mb-1">{g.text}</h2>
      <p className="text-sm text-gray-400 mb-3">{g.subtext}</p>
      <p className="text-xs text-gray-400 dark:text-zinc-500">
        第 {cycleCount} / {totalCycles} 轮
      </p>
    </div>
  );
}
