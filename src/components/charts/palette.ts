// 轻量 SVG 图表 — 调色板经 dataviz 六项校验（明/暗两套，adjacent pairs 全过）
// 系列色按固定槽位分配，不循环；文本一律用文字色，不穿系列色

export const CHART_STYLE = `
.viz-root {
  --viz-s1: #2a78d6; --viz-s2: #008300; --viz-s3: #e87ba4; --viz-s4: #eda100; --viz-s5: #1baf7a;
  --viz-ink: #0b0b0b; --viz-ink-2: #52514e; --viz-muted: #898781;
  --viz-grid: #e1e0d9; --viz-axis: #c3c2b7; --viz-surface: #ffffff;
}
.dark .viz-root {
  --viz-s1: #3987e5; --viz-s2: #008300; --viz-s3: #d55181; --viz-s4: #c98500; --viz-s5: #199e70;
  --viz-ink: #ffffff; --viz-ink-2: #c3c2b7; --viz-muted: #898781;
  --viz-grid: #2c2c2a; --viz-axis: #383835; --viz-surface: #27272a;
}
`;

export const SERIES_VARS = ['var(--viz-s1)', 'var(--viz-s2)', 'var(--viz-s3)', 'var(--viz-s4)', 'var(--viz-s5)'];

/** Round a max value up to a clean axis number (1/2/5 × 10^n) */
export function niceMax(v: number): number {
  if (v <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(v)));
  for (const m of [1, 2, 5, 10]) {
    if (m * pow >= v) return m * pow;
  }
  return 10 * pow;
}
