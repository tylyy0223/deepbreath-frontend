import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuthStore } from '../../stores/authStore';

export function RegisterForm() {
  const register = useAuthStore((s) => s.register);
  const sendSmsCode = useAuthStore((s) => s.sendSmsCode);

  const [phone, setPhone] = useState('');
  const [smsCode, setSmsCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState(''); // 选填

  const [countdown, setCountdown] = useState(0);
  const [sendingSms, setSendingSms] = useState(false);
  const [error, setError] = useState('');
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

  const handleSendSms = async () => {
    setError('');
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      setError('请输入正确的手机号');
      return;
    }
    setSendingSms(true);
    try {
      await sendSmsCode(phone.trim(), 'register');
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

    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      setError('请输入正确的手机号');
      return;
    }
    if (!smsCode.trim()) {
      setError('请输入验证码');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    // 邮箱选填：填了才校验基本格式
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('邮箱格式不正确（可不填）');
      return;
    }

    setLoading(true);
    try {
      await register(
        phone.trim(),
        smsCode.trim(),
        password,
        email.trim() || undefined,
        nickname.trim() || undefined
      );
      window.location.href = '/app/chat/science';
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
        setError(axiosErr.response?.data?.detail || '注册失败，请稍后重试');
      } else {
        setError('网络连接失败，请检查网络');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-xs text-gray-400">手机号注册 · 验证码确认 · 邮箱选填</p>
      </div>

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
            placeholder="输入短信验证码"
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

      <Input
        label="设置密码"
        type="password"
        placeholder="至少 6 位"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="new-password"
      />
      <Input
        label="确认密码"
        type="password"
        placeholder="再次输入密码"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        autoComplete="new-password"
      />

      <Input
        label="昵称（选填）"
        type="text"
        placeholder="给自己取个名字"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        maxLength={50}
      />
      <Input
        label="邮箱（选填）"
        type="email"
        placeholder="your@email.com（可不填）"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
      )}
      <Button type="submit" loading={loading} className="w-full" size="lg">
        注册
      </Button>
      <p className="text-center text-sm text-gray-500">
        已有账号？{' '}
        <Link to="/app/login" className="text-primary-600 hover:text-primary-700 font-medium">
          去登录
        </Link>
      </p>
    </form>
  );
}
