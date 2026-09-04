import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useScalesStore } from '../stores/scalesStore';
import type { ScaleResult } from '../stores/scalesStore';
import { useCreditsStore } from '../stores/creditsStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { BarChart } from '../components/charts/BarChart';

export function ScaleTestPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { current, loading, fetchScale, submit } = useScalesStore();

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [idx, setIdx] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<ScaleResult | null>(null);

  useEffect(() => {
    if (id) {
      fetchScale(id);
      setAnswers({});
      setIdx(0);
      setResult(null);
    }
  }, [id, fetchScale]);

  if (loading || !current) {
    return <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>;
  }

  const total = current.questions.length;
  const answered = Object.keys(answers).length;
  const question = current.questions[idx];

  const handleSelect = (value: number) => {
    const next = { ...answers, [`q${question.num}`]: value };
    setAnswers(next);
    // 自动前进到下一未答题
    if (idx < total - 1) {
      setIdx(idx + 1);
    }
  };

  const handleSubmit = async () => {
    if (!id || answered < total) {
      addToast(`还有 ${total - answered} 题未作答`, 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await submit(id, answers);
      setResult(res);
      useCreditsStore.getState().fetchBalance();
    } catch (err) {
      const resp = (err as { response?: { status?: number; data?: { detail?: string } } })?.response;
      addToast(resp?.data?.detail || '提交失败', 'error');
      if (resp?.status === 402) navigate('/app/credits');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== 结果视图 =====
  if (result) {
    const isScl90 = result.scale_id === 'scl90';
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <button onClick={() => navigate('/app/scales')} className="text-sm text-gray-400 hover:text-gray-600">
          ← 返回测评列表
        </button>

        <Card className="p-6 text-center">
          <div className="text-3xl mb-2">{current.emoji}</div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200">{current.name} · 结果</h2>
          <p className="text-4xl font-semibold text-primary-600 mt-4" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {isScl90 ? result.gsi : result.standard_score}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isScl90 ? 'GSI 总均分' : `标准分（粗分 ${result.raw_score}/${result.max_raw}）`}
          </p>
          <span className="inline-block mt-3 px-3 py-1 rounded-full text-sm bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
            {result.level}
          </span>
          <p className="text-sm text-gray-600 dark:text-zinc-400 mt-4 leading-relaxed">{result.description}</p>
        </Card>

        {/* SCL-90 维度分析 */}
        {isScl90 && result.dimensions && (
          <Card className="p-5">
            <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">十维度均分（≥2 为偏高）</h3>
            <BarChart data={result.dimensions.map((d) => ({ label: `${d.icon} ${d.name}`, value: d.avg }))} />
            <p className="text-xs text-gray-400 mt-3">
              阳性项目数 {result.pst} · 阳性症状均分 {result.psd}
            </p>
          </Card>
        )}

        <Card className="p-4">
          <p className="text-xs text-gray-400 leading-relaxed">
            ⚠️ 自评量表结果受当下状态影响，仅供自我了解参考，不构成临床诊断。
            如结果显示中度及以上，建议咨询专业心理咨询师或精神科医生。
          </p>
        </Card>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => navigate('/app/scales')}>完成</Button>
          <Button className="flex-1" onClick={() => navigate('/app/chat/counseling')}>和 AI 聊聊 💚</Button>
        </div>
      </div>
    );
  }

  // ===== 答题视图 =====
  return (
    <div className="max-w-lg mx-auto space-y-4">
      <button onClick={() => navigate('/app/scales')} className="text-sm text-gray-400 hover:text-gray-600">
        ← 退出测评
      </button>

      {/* 进度 */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>{current.emoji} {current.name}</span>
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{answered} / {total}</span>
        </div>
        <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-400 rounded-full transition-all"
            style={{ width: `${(answered / total) * 100}%` }}
          />
        </div>
      </div>

      {/* 题目 */}
      <Card className="p-6">
        <p className="text-xs text-gray-400 mb-2">第 {idx + 1} 题 · 根据最近一周的实际感受选择</p>
        <h3 className="text-base font-medium text-gray-800 dark:text-zinc-200 mb-5">{question.text}</h3>
        <div className="space-y-2">
          {current.options.map((o) => {
            const selected = answers[`q${question.num}`] === o.value;
            return (
              <button
                key={o.value}
                onClick={() => handleSelect(o.value)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-colors
                  ${selected
                    ? 'border-primary-400 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                    : 'border-gray-200 text-gray-600 hover:border-primary-200 hover:bg-gray-50 dark:border-zinc-600 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </Card>

      {/* 导航 */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={idx === 0} onClick={() => setIdx(idx - 1)}>
          ← 上一题
        </Button>
        {answered === total ? (
          <Button onClick={handleSubmit} loading={submitting}>提交测评（20 Credits）</Button>
        ) : (
          <Button variant="ghost" size="sm" disabled={idx >= total - 1} onClick={() => setIdx(idx + 1)}>
            下一题 →
          </Button>
        )}
      </div>
    </div>
  );
}
