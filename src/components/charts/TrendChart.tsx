import { useMemo, useState } from 'react';
import { CHART_STYLE, SERIES_VARS, niceMax } from './palette';

export interface TrendSeries {
  label: string;
  points: { date: string; value: number }[];
}

interface Props {
  series: TrendSeries[];
  days?: number; // date-domain length; defaults to union of dates
  height?: number;
}

/**
 * 多序列每日趋势折线图（纯 SVG）。
 * - 2px 折线、≥8px 端点标记（带 2px surface ring）
 * - 悬停竖线 + tooltip；≥2 序列固定图例
 * - 「数据表」切换（relief：低对比色的兜底通道）
 */
export function TrendChart({ series, height = 220 }: Props) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  // 统一日期轴：所有序列日期的并集（升序），缺的日期补 0
  const dates = useMemo(() => {
    const s = new Set<string>();
    series.forEach((sr) => sr.points.forEach((p) => s.add(p.date)));
    return [...s].sort();
  }, [series]);

  const grid = useMemo(
    () => series.map((sr) => {
      const m = new Map(sr.points.map((p) => [p.date, p.value]));
      return dates.map((d) => m.get(d) ?? 0);
    }),
    [series, dates],
  );

  const W = 640;
  const H = height;
  const PAD = { top: 12, right: 16, bottom: 24, left: 36 };
  const iw = W - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;

  const yMax = niceMax(Math.max(1, ...grid.flat()));
  const x = (i: number) => PAD.left + (dates.length <= 1 ? iw / 2 : (i / (dates.length - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / yMax) * ih;

  if (dates.length === 0) {
    return <p className="text-sm text-gray-400 dark:text-zinc-500 py-8 text-center">暂无数据</p>;
  }

  const handleMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD.left) / iw) * (dates.length - 1));
    setHoverIdx(Math.max(0, Math.min(dates.length - 1, i)));
  };

  const fmtDate = (d: string) => d.slice(5); // MM-DD

  return (
    <div className="viz-root">
      <style>{CHART_STYLE}</style>

      {/* 图例（≥2 序列必有） */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 mb-2">
        {series.map((sr, si) => (
          <span key={sr.label} className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--viz-ink-2)' }}>
            <span className="inline-block w-3 h-0.5 rounded" style={{ background: SERIES_VARS[si] }} />
            {sr.label}
          </span>
        ))}
        <button
          onClick={() => setShowTable(!showTable)}
          className="ml-auto text-xs underline decoration-dotted"
          style={{ color: 'var(--viz-muted)' }}
        >
          {showTable ? '看图表' : '数据表'}
        </button>
      </div>

      {showTable ? (
        <div className="overflow-x-auto max-h-56 overflow-y-auto">
          <table className="w-full text-xs" style={{ color: 'var(--viz-ink-2)', fontVariantNumeric: 'tabular-nums' }}>
            <thead>
              <tr className="text-left" style={{ color: 'var(--viz-muted)' }}>
                <th className="py-1 pr-3 font-medium">日期</th>
                {series.map((sr) => <th key={sr.label} className="py-1 pr-3 font-medium">{sr.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {dates.map((d, i) => (
                <tr key={d} className="border-t" style={{ borderColor: 'var(--viz-grid)' }}>
                  <td className="py-1 pr-3">{d}</td>
                  {grid.map((g, si) => <td key={si} className="py-1 pr-3">{g[i]}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full"
            onMouseMove={handleMove}
            onMouseLeave={() => setHoverIdx(null)}
          >
            {/* 网格线（hairline，含 0 基线） */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => (
              <g key={t}>
                <line
                  x1={PAD.left} x2={W - PAD.right}
                  y1={y(yMax * t)} y2={y(yMax * t)}
                  stroke={t === 0 ? 'var(--viz-axis)' : 'var(--viz-grid)'} strokeWidth="1"
                />
                <text x={PAD.left - 6} y={y(yMax * t) + 3} textAnchor="end" fontSize="10" fill="var(--viz-muted)">
                  {Math.round(yMax * t)}
                </text>
              </g>
            ))}

            {/* X 轴日期（首/中/尾） */}
            {[0, Math.floor((dates.length - 1) / 2), dates.length - 1]
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((i) => (
                <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--viz-muted)">
                  {fmtDate(dates[i])}
                </text>
              ))}

            {/* 悬停竖线 */}
            {hoverIdx !== null && (
              <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={PAD.top} y2={PAD.top + ih} stroke="var(--viz-axis)" strokeWidth="1" />
            )}

            {/* 折线（2px round）+ 端点标记（8px + 2px surface ring） */}
            {grid.map((g, si) => (
              <g key={si}>
                <polyline
                  points={g.map((v, i) => `${x(i)},${y(v)}`).join(' ')}
                  fill="none" stroke={SERIES_VARS[si]} strokeWidth="2"
                  strokeLinejoin="round" strokeLinecap="round"
                />
                <circle
                  cx={x(g.length - 1)} cy={y(g[g.length - 1])} r="4"
                  fill={SERIES_VARS[si]} stroke="var(--viz-surface)" strokeWidth="2"
                />
                {hoverIdx !== null && (
                  <circle
                    cx={x(hoverIdx)} cy={y(g[hoverIdx])} r="4"
                    fill={SERIES_VARS[si]} stroke="var(--viz-surface)" strokeWidth="2"
                  />
                )}
              </g>
            ))}
          </svg>

          {/* Tooltip */}
          {hoverIdx !== null && (
            <div
              className="absolute top-0 pointer-events-none rounded-lg border px-2.5 py-1.5 text-xs shadow-sm"
              style={{
                left: `${(x(hoverIdx) / W) * 100}%`,
                transform: x(hoverIdx) > W / 2 ? 'translateX(calc(-100% - 8px))' : 'translateX(8px)',
                background: 'var(--viz-surface)',
                borderColor: 'var(--viz-grid)',
                color: 'var(--viz-ink-2)',
              }}
            >
              <div className="font-medium mb-0.5" style={{ color: 'var(--viz-ink)' }}>{dates[hoverIdx]}</div>
              {series.map((sr, si) => (
                <div key={sr.label} className="flex items-center gap-1.5" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: SERIES_VARS[si] }} />
                  {sr.label}: {grid[si][hoverIdx]}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
