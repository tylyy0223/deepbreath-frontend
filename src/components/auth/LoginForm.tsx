import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuthStore } from '../../stores/authStore';

type LoginTab = 'email' | 'phone';

export function LoginForm() {
  const login = useAuthStore((s) => s.login);
  const loginBySms = useAuthStore((s) => s.loginBySms);
  const sendSmsCode = useAuthStore((s) => s.sendSmsCode);

  const [tab, setTab] = useState<LoginTab>('email');

  // 邮箱登录
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // 手机号登录
  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [sendingSms, setSendingSms] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 倒计时清理
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSendSms = async () => {
    setError('');
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      setError('请输入正确的手机号');
      return;
    }
    setSendingSms(true);
    try {
      await sendSmsCode(phone.trim(), 'login');
      startCountdown();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || '验证码发送失败，请稍后重试');
      } else {
        setError('网络连接失败，请检查网络');
      }
    } finally {
      setSendingSms(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (tab === 'email') {
      if (!email.trim() || !password) {
        setError('请填写邮箱和密码');
        return;
      }
      setLoading(true);
      try {
        await login(email.trim(), password);
        window.location.href = '/app/chat/science';
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
          if (axiosErr.response?.status === 401) {
            setError('邮箱或密码错误');
          } else if (axiosErr.response?.data?.detail) {
            setError(axiosErr.response.data.detail);
          } else {
            setError('登录失败，请稍后重试');
          }
        } else {
          setError('网络连接失败，请检查网络');
        }
      } finally {
        setLoading(false);
      }
    } else {
      // 手机号登录
      if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
        setError('请输入正确的手机号');
        return;
      }
      if (!smsCode.trim()) {
        setError('请输入验证码');
        return;
      }
      setLoading(true);
      try {
        await loginBySms(phone.trim(), smsCode.trim());
        window.location.href = '/app/chat/science';
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'response' in err) {
          const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
          if (axiosErr.response?.status === 401) {
            setError(axiosErr.response?.data?.detail || '验证码错误或已过期');
          } else if (axiosErr.response?.data?.detail) {
            setError(axiosErr.response.data.detail);
          } else {
            setError('登录失败，请稍后重试');
          }
        } else {
          setError('网络连接失败，请检查网络');
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const tabClass = (active: boolean) =>
    `flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
      active
        ? 'bg-primary-500 text-white shadow-sm'
        : 'text-gray-500 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
    }`;

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {/* 登录方式切换 */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-zinc-700 rounded-xl">
          <button type="button" className={tabClass(tab === 'email')} onClick={() => { setTab('email'); setError(''); }}>
            邮箱登录
          </button>
          <button type="button" className={tabClass(tab === 'phone')} onClick={() => { setTab('phone'); setError(''); }}>
            手机号登录
          </button>
        </div>

        {tab === 'email' ? (
          <>
            <Input
              label="邮箱"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
            />
            <Input
              label="密码"
              type="password"
              placeholder="输入密码"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </>
        ) : (
          <>
            <Input
              label="手机号"
              type="tel"
              placeholder="请输入手机号"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
              maxLength={11}
              autoFocus
            />
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1 dark:text-zinc-300">验证码</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="输入验证码"
                  value={smsCode}
                  onChange={(e) => setSmsCode(e.target.value)}
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="flex-1 px-3 py-2 text-sm border rounded-xl bg-white shadow-sm
                    placeholder:text-gray-400
                    focus:outline-none focus:ring-2 focus:ring-primary-400/60 focus:border-primary-400
                    disabled:bg-gray-50 disabled:text-gray-400
                    dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-200
                    border-gray-200/80 dark:border-zinc-600"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={handleSendSms}
                  disabled={countdown > 0 || sendingSms}
                  className="shrink-0 whitespace-nowrap"
                >
                  {sendingSms ? '发送中…' : countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                </Button>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}
        <Button type="submit" loading={loading} className="w-full" size="lg">
          {tab === 'email' ? '登录' : '验证码登录'}
        </Button>
        <p className="text-center text-sm text-gray-500">
          还没有账号？{' '}
          <Link to="/app/register" className="text-primary-600 hover:text-primary-700 font-medium">
            立即注册
          </Link>
        </p>
      </div>
    </form>
  );
}
