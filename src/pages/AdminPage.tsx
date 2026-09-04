import { useEffect, useState } from 'react';
import { useAdminStore } from '../stores/adminStore';
import { useAuthStore } from '../stores/authStore';
import { TrendChart } from '../components/charts/TrendChart';
import { BarChart } from '../components/charts/BarChart';
import { Card } from '../components/ui/Card';
import { Spinner } from '../components/ui/Spinner';
import { useToast } from '../components/ui/Toast';
import { MOOD_EMOJIS } from '../config/constants';

const TABS = [
  { key: 'overview', label: '📊 总览' },
  { key: 'users', label: '👥 用户' },
  { key: 'credits', label: '💎 Credits' },
  { key: 'ai', label: '🤖 AI 用量' },
  { key: 'online', label: '🟢 并发监控' },
  { key: 'logs', label: '📜 登录日志' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const MODE_LABELS: Record<string, string> = {
  science: '心理科普',
  counseling: '心理树洞',
  assessment: '心理评估',
  reading: '阅读模式',
};

const ROLE_OPTIONS = ['user', 'editor', 'moderator', 'admin'];

export function AdminPage() {
  const [tab, setTab] = useState<TabKey>('overview');
  const me = useAuthStore((s) => s.user);
  const { addToast } = useToast();
  const {
    analytics, users, usersTotal, loginLogs, logsTotal, aiUsage, loading,
    creditsSummary, adminOrders, ordersTotal, onlineData,
    fetchAnalytics, fetchUsers, updateUserRole, updateUserStatus, fetchLoginLogs, fetchAiUsage,
    fetchCreditsSummary, fetchAdminOrders, confirmOrder, adjustCredits, generateCodes,
    fetchOnlineUsers,
  } = useAdminStore();
  const [usersPage, setUsersPage] = useState(1);
  const [logsPage, setLogsPage] = useState(1);
  const [ordersPage, setOrdersPage] = useState(1);
  const [orderFilter, setOrderFilter] = useState<string>('pending');
  // 手动调整 & 兑换码表单
  const [adjUserId, setAdjUserId] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [codeCount, setCodeCount] = useState('5');
  const [codeCredits, setCodeCredits] = useState('500');
  const [newCodes, setNewCodes] = useState<string[]>([]);

  useEffect(() => {
    if (tab === 'overview' && !analytics) fetchAnalytics();
    if (tab === 'users') fetchUsers(usersPage);
    if (tab === 'ai' && !aiUsage) fetchAiUsage();
    if (tab === 'logs') fetchLoginLogs(logsPage);
    if (tab === 'credits') {
      fetchCreditsSummary();
      fetchAdminOrders(orderFilter || undefined, ordersPage);
    }
    if (tab === 'online') {
      fetchOnlineUsers();
      const timer = setInterval(fetchOnlineUsers, 5000);
      return () => clearInterval(timer);
    }
  }, [tab, usersPage, logsPage, ordersPage, orderFilter, analytics, aiUsage,
      fetchAnalytics, fetchUsers, fetchAiUsage, fetchLoginLogs, fetchCreditsSummary, fetchAdminOrders,
      fetchOnlineUsers]);

  const handleConfirmOrder = async (orderNo: string) => {
    if (!confirm(`核销订单 ${orderNo} 并发放 Credits？`)) return;
    try {
      addToast(await confirmOrder(orderNo), 'success');
    } catch {
      addToast('核销失败', 'error');
    }
  };

  const handleAdjust = async () => {
    const uid = parseInt(adjUserId, 10);
    const amount = parseInt(adjAmount, 10);
    if (!uid || !amount || !adjReason.trim()) {
      addToast('请填写用户 ID、数额（可为负）和原因', 'error');
      return;
    }
    try {
      await adjustCredits(uid, amount, adjReason.trim());
      addToast('已调整', 'success');
      setAdjUserId(''); setAdjAmount(''); setAdjReason('');
    } catch {
      addToast('调整失败（检查用户 ID）', 'error');
    }
  };

  const handleGenCodes = async () => {
    const count = parseInt(codeCount, 10);
    const credits = parseInt(codeCredits, 10);
    if (!count || !credits) return;
    try {
      const codes = await generateCodes(count, credits);
      setNewCodes(codes);
      addToast(`已生成 ${codes.length} 个兑换码`, 'success');
    } catch {
      addToast('生成失败', 'error');
    }
  };

  const handleRole = async (id: number, role: string) => {
    try {
      await updateUserRole(id, role);
      addToast('角色已更新', 'success');
    } catch {
      addToast('操作失败', 'error');
    }
  };

  const handleStatus = async (id: number, status: string) => {
    try {
      await updateUserStatus(id, status);
      addToast(status === 'banned' ? '已封禁' : '已解封', 'success');
    } catch {
      addToast('操作失败', 'error');
    }
  };

  const totalCards = analytics ? [
    { label: '注册用户', value: analytics.totals.users },
    { label: '对话会话', value: analytics.totals.chat_sessions },
    { label: 'AI 消息', value: analytics.totals.ai_messages },
    { label: '情绪日记', value: analytics.totals.diary_entries },
    { label: '呼吸练习', value: analytics.totals.breath_sessions },
    { label: '社区帖子', value: analytics.totals.community_posts },
    { label: '科普文章', value: analytics.totals.articles },
    { label: '文章阅读', value: analytics.totals.article_views },
  ] : [];

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200 mb-4">🛠 管理后台</h2>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium whitespace-nowrap transition-colors
              ${tab === t.key ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading && !analytics && tab === 'overview' ? (
        <div className="py-20"><Spinner /></div>
      ) : null}

      {/* ===== 总览 ===== */}
      {tab === 'overview' && analytics && (
        <div className="space-y-6">
          {/* Stat tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {totalCards.map((c) => (
              <Card key={c.label} className="p-4 text-center">
                <p className="text-2xl font-bold text-primary-600">{c.value.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">{c.label}</p>
              </Card>
            ))}
          </div>

          {/* 30 天活跃趋势 */}
          <Card className="p-5">
            <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">
              近 {analytics.period_days} 天活跃趋势
            </h3>
            <TrendChart
              series={[
                { label: '新增用户', points: analytics.daily.new_users.map((p) => ({ date: p.date, value: p.count })) },
                { label: 'AI 消息', points: analytics.daily.ai_messages.map((p) => ({ date: p.date, value: p.count })) },
                { label: '情绪日记', points: analytics.daily.diary_entries.map((p) => ({ date: p.date, value: p.count })) },
                { label: '呼吸练习', points: analytics.daily.breath_sessions.map((p) => ({ date: p.date, value: p.count })) },
                { label: '社区发帖', points: analytics.daily.community_posts.map((p) => ({ date: p.date, value: p.count })) },
              ]}
            />
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 情绪分布 */}
            <Card className="p-5">
              <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">全站情绪分布（近 {analytics.period_days} 天）</h3>
              <BarChart
                data={analytics.mood_distribution.map((m) => ({
                  label: `${MOOD_EMOJIS[m.score]?.emoji || ''} ${MOOD_EMOJIS[m.score]?.label || m.score}`,
                  value: m.count,
                }))}
              />
            </Card>

            {/* 全站情绪均分趋势 */}
            <Card className="p-5">
              <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">全站情绪均分趋势</h3>
              <TrendChart
                height={180}
                series={[{ label: '平均心情 (1-5)', points: analytics.mood_daily_avg.map((p) => ({ date: p.date, value: p.avg })) }]}
              />
            </Card>

            {/* 呼吸练习排行 */}
            <Card className="p-5">
              <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">呼吸练习排行</h3>
              <BarChart data={analytics.breath_by_exercise.map((b) => ({ label: b.title, value: b.count }))} />
            </Card>

            {/* 对话模式分布 */}
            <Card className="p-5">
              <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">对话模式分布</h3>
              <BarChart data={analytics.chat_by_mode.map((c) => ({ label: MODE_LABELS[c.mode] || c.mode, value: c.count }))} />
            </Card>
          </div>
        </div>
      )}

      {/* ===== 用户管理 ===== */}
      {tab === 'users' && (
        <Card className="p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 dark:text-zinc-500 border-b border-gray-100 dark:border-zinc-700">
                <th className="py-2 pr-3 font-medium">ID</th>
                <th className="py-2 pr-3 font-medium">邮箱</th>
                <th className="py-2 pr-3 font-medium">昵称</th>
                <th className="py-2 pr-3 font-medium">角色</th>
                <th className="py-2 pr-3 font-medium">状态</th>
                <th className="py-2 pr-3 font-medium">注册时间</th>
                <th className="py-2 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const isSelf = u.id === me?.id;
                return (
                  <tr key={u.id} className="border-b border-gray-50 dark:border-zinc-800 text-gray-700 dark:text-zinc-300">
                    <td className="py-2 pr-3 text-gray-400">{u.id}</td>
                    <td className="py-2 pr-3">{u.email}</td>
                    <td className="py-2 pr-3">{u.nickname || '—'}</td>
                    <td className="py-2 pr-3">
                      <select
                        value={u.role}
                        disabled={isSelf}
                        onChange={(e) => handleRole(u.id, e.target.value)}
                        className="text-xs border border-gray-200 dark:border-zinc-600 rounded px-1.5 py-0.5 bg-white dark:bg-zinc-800 disabled:opacity-50"
                      >
                        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.status === 'active' ? 'bg-green-50 text-green-600 dark:bg-green-900/30' : 'bg-red-50 text-red-600 dark:bg-red-900/30'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-xs text-gray-400">
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('zh-CN') : '—'}
                    </td>
                    <td className="py-2">
                      {!isSelf && (
                        <button
                          onClick={() => handleStatus(u.id, u.status === 'banned' ? 'active' : 'banned')}
                          className="text-xs text-gray-400 hover:text-red-500"
                        >
                          {u.status === 'banned' ? '解封' : '封禁'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <Pagination page={usersPage} total={usersTotal} pageSize={20} onChange={setUsersPage} />
        </Card>
      )}

      {/* ===== Credits ===== */}
      {tab === 'credits' && (
        <div className="space-y-6">
          {/* 总账 */}
          {creditsSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: '累计赠送', value: creditsSummary.gifted.toLocaleString() },
                { label: '累计消耗', value: creditsSummary.consumed.toLocaleString() },
                { label: '充值到账', value: creditsSummary.recharged.toLocaleString() },
                { label: '兑换发放', value: creditsSummary.redeemed.toLocaleString() },
                { label: '收入', value: `¥${(creditsSummary.revenue_fen / 100).toFixed(2)}` },
                { label: '待核销订单', value: creditsSummary.pending_orders },
              ].map((c) => (
                <Card key={c.label} className="p-3 text-center">
                  <p className="text-lg font-bold text-primary-600">{c.value}</p>
                  <p className="text-xs text-gray-400 mt-1">{c.label}</p>
                </Card>
              ))}
            </div>
          )}

          {/* 订单 */}
          <Card className="p-5 overflow-x-auto">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300">🧾 充值订单</h3>
              {['pending', '', 'delivered'].map((s) => (
                <button
                  key={s || 'all'}
                  onClick={() => { setOrderFilter(s); setOrdersPage(1); }}
                  className={`px-2 py-0.5 text-xs rounded-full ${orderFilter === s ? 'bg-primary-100 text-primary-700' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {s === 'pending' ? '待核销' : s === 'delivered' ? '已到账' : '全部'}
                </button>
              ))}
            </div>
            {adminOrders.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">暂无订单</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-gray-400 dark:text-zinc-500 border-b border-gray-100 dark:border-zinc-700">
                    <th className="py-2 pr-3 font-medium">订单号</th>
                    <th className="py-2 pr-3 font-medium">用户</th>
                    <th className="py-2 pr-3 font-medium">金额</th>
                    <th className="py-2 pr-3 font-medium">Credits</th>
                    <th className="py-2 pr-3 font-medium">渠道</th>
                    <th className="py-2 pr-3 font-medium">凭证</th>
                    <th className="py-2 pr-3 font-medium">状态</th>
                    <th className="py-2 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {adminOrders.map((o) => (
                    <tr key={o.order_no} className="border-b border-gray-50 dark:border-zinc-800 text-gray-700 dark:text-zinc-300">
                      <td className="py-2 pr-3 font-mono text-xs">{o.order_no}</td>
                      <td className="py-2 pr-3 text-xs">{o.email}</td>
                      <td className="py-2 pr-3" style={{ fontVariantNumeric: 'tabular-nums' }}>¥{(o.amount_fen / 100).toFixed(2)}</td>
                      <td className="py-2 pr-3" style={{ fontVariantNumeric: 'tabular-nums' }}>{o.credits.toLocaleString()}</td>
                      <td className="py-2 pr-3 text-xs">{o.channel}</td>
                      <td className="py-2 pr-3 text-xs max-w-[160px] truncate" title={o.proof}>{o.proof || '—'}</td>
                      <td className="py-2 pr-3 text-xs">
                        <span className={o.status === 'delivered' ? 'text-green-600' : o.status === 'pending' ? 'text-orange-500' : 'text-gray-400'}>
                          {o.status}
                        </span>
                      </td>
                      <td className="py-2">
                        {o.status === 'pending' && (
                          <button onClick={() => handleConfirmOrder(o.order_no)} className="text-xs text-primary-600 hover:underline">
                            核销发放
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <Pagination page={ordersPage} total={ordersTotal} pageSize={20} onChange={setOrdersPage} />
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 手动调整 */}
            <Card className="p-5">
              <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">⚙️ 手动调整</h3>
              <div className="space-y-2">
                <input value={adjUserId} onChange={(e) => setAdjUserId(e.target.value)} placeholder="用户 ID"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200" />
                <input value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} placeholder="数额（正加负减，如 500 或 -200）"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200" />
                <input value={adjReason} onChange={(e) => setAdjReason(e.target.value)} placeholder="原因（必填，记入流水）"
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200" />
                <button onClick={handleAdjust} className="w-full py-1.5 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600">
                  执行调整
                </button>
              </div>
            </Card>

            {/* 兑换码 */}
            <Card className="p-5">
              <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">🎫 生成兑换码</h3>
              <div className="flex gap-2 mb-2">
                <input value={codeCount} onChange={(e) => setCodeCount(e.target.value)} placeholder="数量"
                  className="w-1/2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200" />
                <input value={codeCredits} onChange={(e) => setCodeCredits(e.target.value)} placeholder="面值 Credits"
                  className="w-1/2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200" />
              </div>
              <button onClick={handleGenCodes} className="w-full py-1.5 text-sm rounded-lg bg-primary-500 text-white hover:bg-primary-600">
                生成
              </button>
              {newCodes.length > 0 && (
                <div className="mt-3 p-2 bg-gray-50 dark:bg-zinc-800 rounded-lg text-xs font-mono space-y-0.5 max-h-32 overflow-y-auto">
                  {newCodes.map((c) => <p key={c} className="text-gray-600 dark:text-zinc-400">{c}</p>)}
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {/* ===== AI 用量 ===== */}
      {tab === 'ai' && aiUsage && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: `AI 消息（${aiUsage.period_days} 天）`, value: aiUsage.total_ai_messages.toLocaleString() },
              { label: '输入 Token（估）', value: aiUsage.estimated_input_tokens.toLocaleString() },
              { label: '输出 Token（估）', value: aiUsage.estimated_output_tokens.toLocaleString() },
              { label: '成本估算', value: `¥${aiUsage.estimated_cost_cny}` },
            ].map((c) => (
              <Card key={c.label} className="p-4 text-center">
                <p className="text-xl font-bold text-primary-600">{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.label}</p>
              </Card>
            ))}
          </div>

          <Card className="p-5">
            <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">每日 AI 消息量</h3>
            <TrendChart
              height={180}
              series={[{ label: 'AI 消息', points: aiUsage.daily.map((d) => ({ date: d.date, value: d.messages })) }]}
            />
          </Card>

          <Card className="p-5">
            <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300 mb-3">Top 用户（按输出量）</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 dark:text-zinc-500 border-b border-gray-100 dark:border-zinc-700">
                  <th className="py-2 pr-3 font-medium">用户 ID</th>
                  <th className="py-2 pr-3 font-medium">消息数</th>
                  <th className="py-2 font-medium">Token（估）</th>
                </tr>
              </thead>
              <tbody>
                {aiUsage.top_users.map((u) => (
                  <tr key={u.user_id} className="border-b border-gray-50 dark:border-zinc-800 text-gray-700 dark:text-zinc-300" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <td className="py-2 pr-3">{u.user_id}</td>
                    <td className="py-2 pr-3">{u.messages}</td>
                    <td className="py-2">{u.tokens.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ===== 并发监控 ===== */}
      {tab === 'online' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: '当前在线用户', value: onlineData ? onlineData.online_count : '—', color: 'text-primary-600' },
              { label: 'AI 对话中', value: onlineData ? onlineData.ai_active_count : '—', color: 'text-emerald-600' },
              { label: 'DeepSeek 429 累计', value: onlineData ? onlineData.deepseek_429_total : '—', color: 'text-amber-600' },
              { label: '限流拦截累计', value: onlineData ? onlineData.chat_rate_limited_total : '—', color: 'text-rose-500' },
            ].map((c) => (
              <Card key={c.label} className="p-4 text-center">
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-gray-400 mt-1">{c.label}</p>
              </Card>
            ))}
          </div>

          <Card className="p-5 overflow-x-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-zinc-300">
                在线用户列表（5 分钟窗口，每 5 秒自动刷新）
              </h3>
              <span className="flex items-center gap-1 text-xs text-emerald-500">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                实时
              </span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 dark:text-zinc-500 border-b border-gray-100 dark:border-zinc-700">
                  <th className="py-2 pr-3 font-medium">邮箱</th>
                  <th className="py-2 pr-3 font-medium">昵称</th>
                  <th className="py-2 pr-3 font-medium">角色</th>
                  <th className="py-2 pr-3 font-medium">最后活跃</th>
                  <th className="py-2 font-medium">状态</th>
                </tr>
              </thead>
              <tbody>
                {onlineData?.users.length ? onlineData.users.map((u) => (
                  <tr key={u.user_id} className="border-b border-gray-50 dark:border-zinc-800 text-gray-700 dark:text-zinc-300">
                    <td className="py-2 pr-3">{u.email}</td>
                    <td className="py-2 pr-3">{u.nickname || '—'}</td>
                    <td className="py-2 pr-3 text-xs">{u.role}</td>
                    <td className="py-2 pr-3 text-xs text-gray-400 whitespace-nowrap">
                      {u.last_active_seconds_ago < 10
                        ? '刚刚'
                        : u.last_active_seconds_ago < 60
                          ? `${u.last_active_seconds_ago} 秒前`
                          : `${Math.floor(u.last_active_seconds_ago / 60)} 分钟前`}
                    </td>
                    <td className="py-2">
                      {u.ai_active
                        ? <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />AI 对话中</span>
                        : <span className="text-xs text-gray-400">在线</span>}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">当前无在线用户</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {/* ===== 登录日志 ===== */}
      {tab === 'logs' && (
        <Card className="p-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 dark:text-zinc-500 border-b border-gray-100 dark:border-zinc-700">
                <th className="py-2 pr-3 font-medium">时间</th>
                <th className="py-2 pr-3 font-medium">邮箱</th>
                <th className="py-2 pr-3 font-medium">动作</th>
                <th className="py-2 pr-3 font-medium">结果</th>
                <th className="py-2 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {loginLogs.map((l) => (
                <tr key={l.id} className="border-b border-gray-50 dark:border-zinc-800 text-gray-700 dark:text-zinc-300">
                  <td className="py-2 pr-3 text-xs text-gray-400 whitespace-nowrap">
                    {l.created_at ? new Date(l.created_at).toLocaleString('zh-CN') : '—'}
                  </td>
                  <td className="py-2 pr-3">{l.email}</td>
                  <td className="py-2 pr-3 text-xs">{l.action}</td>
                  <td className="py-2 pr-3 text-xs">{l.success ? '✅' : '❌'}</td>
                  <td className="py-2 text-xs text-gray-400">{l.ip_address}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={logsPage} total={logsTotal} pageSize={30} onChange={setLogsPage} />
        </Card>
      )}
    </div>
  );
}

function Pagination({ page, total, pageSize, onChange }: { page: number; total: number; pageSize: number; onChange: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-end gap-3 mt-3 text-xs text-gray-500 dark:text-zinc-400">
      <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="disabled:opacity-30 hover:text-primary-600">← 上一页</button>
      <span>{page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onChange(page + 1)} className="disabled:opacity-30 hover:text-primary-600">下一页 →</button>
    </div>
  );
}
