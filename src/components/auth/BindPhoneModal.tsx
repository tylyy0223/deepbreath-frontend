import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { SmsCodeInput } from './SmsCodeInput';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

/**
 * 存量用户强制补绑手机号弹窗。
 * user.phone_bound === false 时由 RequireAuth 渲染，全屏遮罩，仅保留「退出登录」出口。
 */
export function BindPhoneModal() {
  const bindPhone = useAuthStore((s) => s.bindPhone);
  const logout = useAuthStore((s) => s.logout);
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleBind = async () => {
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setError('请输入正确的手机号');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await bindPhone(phone, smsCode);
      // 绑定成功：authStore 已更新 user.phone_bound，本组件随之卸载
    } catch (err) {
      const resp = (err as { response?: { data?: { detail?: string } } })?.response;
      setError(typeof resp?.data?.detail === 'string' ? resp.data.detail : '绑定失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/app/login';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <Card className="w-full max-w-sm p-6">
        <div className="text-center mb-4">
          <div className="text-3xl mb-2">📱</div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200">绑定手机号</h2>
          <p className="text-xs text-gray-400 mt-1 leading-relaxed">
            为保障你的账号与数据安全，请绑定手机号后继续使用。
            一个手机号只能绑定一个账号。
          </p>
        </div>
        <div className="space-y-4">
          <SmsCodeInput
            phone={phone}
            code={smsCode}
            onPhoneChange={setPhone}
            onCodeChange={setSmsCode}
            scene="bind"
            onError={setError}
          />
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}
          <Button onClick={handleBind} loading={loading} className="w-full">
            绑定并继续
          </Button>
          <button
            onClick={handleLogout}
            className="w-full text-center text-xs text-gray-400 hover:text-gray-600"
          >
            退出登录
          </button>
        </div>
      </Card>
    </div>
  );
}
