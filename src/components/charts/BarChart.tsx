import { CHART_STYLE } from './palette';

interface Props {
  data: { label: string; value: number }[];
  /** 可选：每条独立颜色（如情绪分布的序数色阶）；缺省单一蓝色 */
  colors?: string[];
}

/**
 * 横向条形图（纯 SVG-free，div 实现）。
 * - 单序列量级 → 单一色相；条 ≤24px、数据端 4px 圆角、基线端直角
 * - 值直接标在条端（文字色，不穿系列色）
 */
export function BarChart({ data, colors }: Props) {
  const max = Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-zinc-500 py-8 text-center">暂无数据</p>;
  }

  return (
    <div className="viz-root space-y-2">
      <style>{CHART_STYLE}</style>
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-2 group" title={`${d.label}: ${d.value}`}>
          <span
            className="w-24 flex-shrink-0 text-xs truncate text-right"
            style={{ color: 'var(--viz-ink-2)' }}
          >
            {d.label}
          </span>
          <div className="flex-1 flex items-center gap-2">
            <div
              className="h-5 rounded-r transition-opacity group-hover:opacity-80"
              style={{
                width: `${Math.max(1, (d.value / max) * 100)}%`,
                background: colors?.[i] || 'var(--viz-s1)',
                borderRadius: '0 4px 4px 0',
              }}
            />
            <span
              className="text-xs flex-shrink-0"
              style={{ color: 'var(--viz-ink)', fontVariantNumeric: 'tabular-nums' }}
            >
              {d.value}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
