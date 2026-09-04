import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuthStore } from '../../stores/authStore';

export function RegisterForm() {
  const register = useAuthStore((s) => s.register);

  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('请填写邮箱和密码');
      return;
    }
    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }
    if (password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    setLoading(true);
    try {
      await register(email.trim(), password, nickname.trim() || undefined);
      window.location.href = '/app/chat/science';
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const axiosErr = err as { response?: { status?: number; data?: { detail?: string | { msg?: string }[] } } };
        const detail = axiosErr.response?.data?.detail;
        if (axiosErr.response?.status === 409) {
          setError('该邮箱已被注册');
        } else if (typeof detail === 'string') {
          setError(detail);
        } else if (Array.isArray(detail) && detail[0]?.msg) {
          setError(detail[0].msg.replace('Value error, ', ''));
        } else {
          setError('注册失败，请稍后重试');
        }
      } else {
        setError('网络连接失败，请检查网络');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
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
          label="昵称（选填）"
          placeholder="给自己取个名字"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
        <Input
          label="密码"
          type="password"
          placeholder="至少6位密码"
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
      </div>
    </form>
  );
}
