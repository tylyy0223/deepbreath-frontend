import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuthStore } from '../../stores/authStore';

type LoginTab = 'phone' | 'email';
type PhoneMode = 'pwd' | 'sms';

export function LoginForm() {
  const login = useAuthStore((s) => s.login);
  const loginByPhone = useAuthStore((s) => s.loginByPhone);
  const loginBySms = useAuthStore((s) => s.loginBySms);
  const sendSmsCode = useAuthStore((s) => s.sendSmsCode);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const [tab, setTab] = useState<LoginTab>('phone');   // 默认手机号登录
  const [phoneMode, setPhoneMode] = useState<PhoneMode>('pwd'); // 手机号下默认密码登录

  // 手机号 + 密码
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  // 手机号 + 验证码
  const [smsCode, setSmsCode] = useState('');
  // 邮箱登录（次要入口）
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  // 忘记密码（手机验证码重置）
  const [showReset, setShowReset] = useState(false);
  const [resetPhone, setResetPhone] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPwd, setResetPwd] = useState('');
  const [resetPwd2, setResetPwd2] = useState('');

  const [countdown, setCountdown] = useState(0);
  const [sendingSms, setSendingSms] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  const errMsg = (err: unknown, fallback: string) => {
    if (err && typeof err === 'object' && 'response' in err) {
      const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
      return axiosErr.response?.data?.detail || fallback;
    }
    return '网络连接失败，请检查网络';
  };

  // 发验证码（scene: login 登录 / reset 重置）
  const handleSendSms = async (scene: 'login' | 'reset') => {
    setError('');
    setSuccess('');
    const p = scene === 'login' ? phone.trim() : resetPhone.trim();
    if (!/^1[3-9]\d{9}$/.test(p)) {
      setError('请输入正确的手机号');
      return;
    }
    setSendingSms(true);
    try {
      await sendSmsCode(p, scene);
      startCountdown();
      setSuccess(scene === 'reset' ? '验证码已发送（用于重置密码）' : '验证码已发送');
    } catch (err: unknown) {
      setError(errMsg(err, '验证码发送失败，请稍后重试'));
    } finally {
      setSendingSms(false);
    }
  };

  // 登录提交
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (tab === 'phone') {
      if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
        setError('请输入正确的手机号');
        return;
      }
      if (phoneMode === 'pwd') {
        if (!password) {
          setError('请输入密码');
          return;
        }
        setLoading(true);
        try {
          await loginByPhone(phone.trim(), password);
          window.location.href = '/app/chat/science';
        } catch (err: unknown) {
          setError(errMsg(err, '手机号或密码错误'));
        } finally {
          setLoading(false);
        }
      } else {
        if (!smsCode.trim()) {
          setError('请输入验证码');
          return;
        }
        setLoading(true);
        try {
          await loginBySms(phone.trim(), smsCode.trim());
          window.location.href = '/app/chat/science';
        } catch (err: unknown) {
          setError(errMsg(err, '验证码错误或已过期'));
        } finally {
          setLoading(false);
        }
      }
    } else {
      if (!email.trim() || !emailPassword) {
        setError('请填写邮箱和密码');
        return;
      }
      setLoading(true);
      try {
        await login(email.trim(), emailPassword);
        window.location.href = '/app/chat/science';
      } catch (err: unknown) {
        setError(errMsg(err, '邮箱或密码错误'));
      } finally {
        setLoading(false);
      }
    }
  };

  // 重置密码提交
  const handleReset = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!/^1[3-9]\d{9}$/.test(resetPhone.trim())) {
      setError('请输入正确的手机号');
      return;
    }
    if (!resetCode.trim()) {
      setError('请输入验证码');
      return;
    }
    if (resetPwd.length < 6) {
      setError('新密码至少 6 位');
      return;
    }
    if (resetPwd !== resetPwd2) {
      setError('两次输入的密码不一致');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(resetPhone.trim(), resetCode.trim(), resetPwd);
      setSuccess('密码已重置，请用新密码登录');
      // 清空重置表单，回到登录
      setShowReset(false);
      setResetPhone(''); setResetCode(''); setResetPwd(''); setResetPwd2('');
      setTab('phone'); setPhoneMode('pwd');
    } catch (err: unknown) {
      setError(errMsg(err, '重置失败，请稍后重试'));
    } finally {
      setLoading(false);
    }
  };

  const tabClass = (active: boolean) =>
    `flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
      active
        ? 'bg-primary-500 text-white shadow-sm'
        : 'text-gray-500 hover:bg-gray-100 dark:text-zinc-400 dark:hover:bg-zinc-700'
    }`;

  // ---------- 忘记密码视图 ----------
  if (showReset) {
    return (
      <form onSubmit={handleReset}>
        <div className="space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-100">重置密码</h2>
            <p className="text-xs text-gray-400 mt-1">通过手机号验证码重置（邮箱用户需已绑定手机号）</p>
          </div>
          <Input
            label="手机号"
            type="tel"
            placeholder="请输入已注册的手机号"
            value={resetPhone}
            onChange={(e) => setResetPhone(e.target.value)}
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
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
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
                onClick={() => handleSendSms('reset')}
                disabled={countdown > 0 || sendingSms}
                className="shrink-0 whitespace-nowrap"
              >
                {sendingSms ? '发送中…' : countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
              </Button>
            </div>
          </div>
          <Input
            label="新密码"
            type="password"
            placeholder="至少 6 位"
            value={resetPwd}
            onChange={(e) => setResetPwd(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            label="确认新密码"
            type="password"
            placeholder="再次输入新密码"
            value={resetPwd2}
            onChange={(e) => setResetPwd2(e.target.value)}
            autoComplete="new-password"
          />
          {error && <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>}
          {success && <div className="bg-emerald-50 text-emerald-600 text-sm px-3 py-2 rounded-lg">{success}</div>}
          <Button type="submit" loading={loading} className="w-full" size="lg">确认重置</Button>
          <button
            type="button"
            onClick={() => { setShowReset(false); setError(''); setSuccess(''); }}
            className="w-full text-center text-sm text-gray-400 hover:text-gray-600"
          >
            ← 返回登录
          </button>
        </div>
      </form>
    );
  }

  // ---------- 登录视图 ----------
  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {/* 登录方式切换：手机号（默认）| 邮箱（次要） */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-zinc-700 rounded-xl">
          <button type="button" className={tabClass(tab === 'phone')} onClick={() => { setTab('phone'); setError(''); }}>
            手机号登录
          </button>
          <button type="button" className={tabClass(tab === 'email')} onClick={() => { setTab('email'); setError(''); }}>
            邮箱登录
          </button>
        </div>

        {tab === 'phone' ? (
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

            {phoneMode === 'pwd' ? (
              <Input
                label="密码"
                type="password"
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            ) : (
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
                    onClick={() => handleSendSms('login')}
                    disabled={countdown > 0 || sendingSms}
                    className="shrink-0 whitespace-nowrap"
                  >
                    {sendingSms ? '发送中…' : countdown > 0 ? `${countdown}s 后重发` : '获取验证码'}
                  </Button>
                </div>
              </div>
            )}

            {/* 方式切换 + 忘记密码 */}
            <div className="flex items-center justify-between text-sm">
              <button
                type="button"
                className="text-primary-600 hover:text-primary-700 font-medium"
                onClick={() => { setPhoneMode(phoneMode === 'pwd' ? 'sms' : 'pwd'); setError(''); setSmsCode(''); }}
              >
                {phoneMode === 'pwd' ? '验证码登录' : '密码登录'}
              </button>
              <button
                type="button"
                className="text-gray-400 hover:text-gray-600"
                onClick={() => { setShowReset(true); setError(''); setSuccess(''); }}
              >
                忘记密码？
              </button>
            </div>
          </>
        ) : (
          <>
            <Input
              label="邮箱"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              label="密码"
              type="password"
              placeholder="输入密码"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              autoComplete="current-password"
            />
            <div className="flex justify-end">
              <button
                type="button"
                className="text-sm text-gray-400 hover:text-gray-600"
                onClick={() => { setShowReset(true); setError(''); setSuccess(''); }}
              >
                忘记密码？
              </button>
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
        )}
        {success && (
          <div className="bg-emerald-50 text-emerald-600 text-sm px-3 py-2 rounded-lg">{success}</div>
        )}
        <Button type="submit" loading={loading} className="w-full" size="lg">
          {tab === 'phone' ? (phoneMode === 'pwd' ? '登录' : '验证码登录') : '登录'}
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
