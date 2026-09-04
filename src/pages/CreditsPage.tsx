import { useEffect, useState } from 'react';
import { useCreditsStore } from '../stores/creditsStore';
import type { CreditOrder } from '../stores/creditsStore';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';

const TX_TYPE_LABELS: Record<string, string> = {
  gift: '🎁 赠送',
  consume: '💬 消费',
  recharge: '💰 充值',
  redeem: '🎫 兑换',
  adjust: '⚙️ 调整',
  refund: '↩️ 退款',
};

const CHANNEL_LABELS: Record<string, { label: string; icon: string }> = {
  wechat: { label: '微信支付', icon: '💚' },
  alipay: { label: '支付宝', icon: '🔵' },
  card: { label: '银行卡', icon: '💳' },
  corporate: { label: '对公转账', icon: '🏦' },
};

const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: '待支付/核销',
  paid: '已支付',
  delivered: '已到账',
  cancelled: '已取消',
  refunded: '已退款',
};

export function CreditsPage() {
  const {
    balance, pricing, packages, channels, transactions, txTotal, orders,
    fetchBalance, fetchPricing, fetchTransactions, fetchOrders,
    createOrder, submitProof, redeem,
  } = useCreditsStore();
  const { addToast } = useToast();

  const [selectedPkg, setSelectedPkg] = useState<string | null>(null);
  const [pendingOrder, setPendingOrder] = useState<CreditOrder | null>(null);
  const [proof, setProof] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [txPage, setTxPage] = useState(1);

  useEffect(() => {
    fetchBalance();
    fetchPricing();
    fetchOrders();
  }, [fetchBalance, fetchPricing, fetchOrders]);

  useEffect(() => {
    fetchTransactions(txPage);
  }, [fetchTransactions, txPage]);

  const handlePay = async (channel: string) => {
    if (!selectedPkg) {
      addToast('请先选择充值档位', 'error');
      return;
    }
    setBusy(true);
    try {
      const order = await createOrder(selectedPkg, null, channel);
      if (channel === 'corporate') {
        setPendingOrder(order);
      }
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      addToast(detail || '创建订单失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleProof = async () => {
    if (!pendingOrder || !proof.trim()) return;
    setBusy(true);
    try {
      await submitProof(pendingOrder.order_no, proof.trim());
      addToast('凭证已提交，管理员核销后自动到账', 'success');
      setPendingOrder(null);
      setProof('');
    } catch {
      addToast('提交失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleRedeem = async () => {
    if (!code.trim()) return;
    setBusy(true);
    try {
      const msg = await redeem(code.trim());
      addToast(msg, 'success');
      setCode('');
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      addToast(detail || '兑换失败', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200">💎 我的 Credits</h2>

      {/* 余额 */}
      <Card className="p-6 text-center bg-gradient-to-br from-primary-50/60 to-white dark:from-primary-900/20 dark:to-zinc-800">
        <p className="text-4xl font-semibold text-primary-600">{balance !== null ? balance.toLocaleString() : '—'}</p>
        <p className="text-xs text-gray-400 mt-2">当前余额 · 1 Credit = ¥0.01 · 呼吸/日记/社区/文章永久免费</p>
      </Card>

      {/* 充值 */}
      <Card className="p-5">
        <h3 className="font-medium text-gray-700 dark:text-zinc-300 mb-4">💰 充值</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {packages.map((p) => (
            <button
              key={p.id}
              onClick={() => setSelectedPkg(p.id)}
              className={`p-3 rounded-xl border text-center transition-colors
                ${selectedPkg === p.id
                  ? 'border-primary-400 bg-primary-50 dark:bg-primary-900/30'
                  : 'border-gray-200 hover:border-primary-200 dark:border-zinc-600'}`}
            >
              <p className="text-sm font-semibold text-gray-800 dark:text-zinc-200">¥{(p.amount_fen / 100).toFixed(0)}</p>
              <p className="text-xs text-primary-600 mt-1">{p.credits.toLocaleString()} Credits</p>
              {p.credits > p.amount_fen && (
                <p className="text-[10px] text-orange-500 mt-0.5">
                  加赠 {Math.round((p.credits / p.amount_fen - 1) * 100)}%
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-0.5">{p.name}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(CHANNEL_LABELS).map(([key, ch]) => {
            const ready = channels[key];
            return (
              <button
                key={key}
                disabled={!ready || busy}
                onClick={() => handlePay(key)}
                className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors
                  ${ready
                    ? 'border-primary-300 text-primary-700 hover:bg-primary-50 dark:hover:bg-primary-900/30'
                    : 'border-gray-200 text-gray-400 cursor-not-allowed dark:border-zinc-700 dark:text-zinc-600'}`}
                title={ready ? '' : '商户号申请中，敬请期待'}
              >
                {ch.icon} {ch.label}
                {!ready && <span className="block text-[10px]">接入中</span>}
              </button>
            );
          })}
        </div>

        {/* 对公转账信息 + 凭证提交 */}
        {pendingOrder?.corporate_account && (
          <div className="mt-4 p-4 rounded-xl bg-gray-50 dark:bg-zinc-800 text-sm space-y-1.5">
            <p className="font-medium text-gray-700 dark:text-zinc-300">🏦 对公转账信息（订单号 {pendingOrder.order_no}）</p>
            <p className="text-gray-600 dark:text-zinc-400">户名：{pendingOrder.corporate_account.company}</p>
            <p className="text-gray-600 dark:text-zinc-400">开户行：{pendingOrder.corporate_account.bank}</p>
            <p className="text-gray-600 dark:text-zinc-400">账号：{pendingOrder.corporate_account.account_no}</p>
            <p className="text-gray-600 dark:text-zinc-400">金额：¥{(pendingOrder.amount_fen / 100).toFixed(2)} → {pendingOrder.credits.toLocaleString()} Credits</p>
            <p className="text-xs text-gray-400">{pendingOrder.corporate_account.note}</p>
            <textarea
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              placeholder="转账后请填写：转账时间 / 金额 / 付款户名 / 银行流水号"
              rows={2}
              className="w-full mt-2 px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none
                focus:outline-none focus:ring-2 focus:ring-primary-300 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200"
            />
            <Button size="sm" onClick={handleProof} loading={busy} disabled={!proof.trim()}>提交转账凭证</Button>
          </div>
        )}
      </Card>

      {/* 兑换码 */}
      <Card className="p-5">
        <h3 className="font-medium text-gray-700 dark:text-zinc-300 mb-3">🎫 兑换码</h3>
        <div className="flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="输入兑换码" />
          <Button onClick={handleRedeem} loading={busy} disabled={!code.trim()}>兑换</Button>
        </div>
      </Card>

      {/* 价目表 */}
      <Card className="p-5">
        <h3 className="font-medium text-gray-700 dark:text-zinc-300 mb-3">📋 价目表</h3>
        <div className="space-y-2">
          {pricing.map((p) => (
            <div key={p.key} className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-zinc-400">{p.label}</span>
              <span className="text-gray-800 dark:text-zinc-200 font-medium">
                {p.cost === 0 ? '免费' : `${p.cost} Credits/${p.unit}`}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* 我的订单 */}
      {orders.length > 0 && (
        <Card className="p-5">
          <h3 className="font-medium text-gray-700 dark:text-zinc-300 mb-3">🧾 充值订单</h3>
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.order_no} className="flex items-center justify-between text-xs text-gray-600 dark:text-zinc-400">
                <span className="font-mono">{o.order_no}</span>
                <span>¥{(o.amount_fen / 100).toFixed(2)} → {o.credits.toLocaleString()}</span>
                <span className={o.status === 'delivered' ? 'text-green-600' : 'text-orange-500'}>
                  {ORDER_STATUS_LABELS[o.status] || o.status}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 流水 */}
      <Card className="p-5">
        <h3 className="font-medium text-gray-700 dark:text-zinc-300 mb-3">📜 收支明细</h3>
        {transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">暂无记录</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-sm border-b border-gray-50 dark:border-zinc-800 pb-2">
                <div>
                  <span className="text-gray-700 dark:text-zinc-300">{TX_TYPE_LABELS[t.type] || t.type}</span>
                  {t.note && <span className="text-xs text-gray-400 ml-2">{t.note}</span>}
                </div>
                <div className="text-right">
                  <span className={`font-medium ${t.amount > 0 ? 'text-green-600' : 'text-gray-700 dark:text-zinc-300'}`} style={{ fontVariantNumeric: 'tabular-nums' }}>
                    {t.amount > 0 ? '+' : ''}{t.amount}
                  </span>
                  <p className="text-[10px] text-gray-400">
                    余 {t.balance_after} · {t.created_at ? new Date(t.created_at).toLocaleString('zh-CN') : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {txTotal > 20 && (
          <div className="flex items-center justify-end gap-3 mt-3 text-xs text-gray-500">
            <button disabled={txPage <= 1} onClick={() => setTxPage(txPage - 1)} className="disabled:opacity-30">← 上一页</button>
            <span>{txPage} / {Math.ceil(txTotal / 20)}</span>
            <button disabled={txPage >= Math.ceil(txTotal / 20)} onClick={() => setTxPage(txPage + 1)} className="disabled:opacity-30">下一页 →</button>
          </div>
        )}
      </Card>
    </div>
  );
}
