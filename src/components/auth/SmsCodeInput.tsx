import { useEffect, useRef, useState } from 'react';
import { Input } from '../ui/Input';
import { useAuthStore } from '../../stores/authStore';

interface Props {
  phone: string;
  code: string;
  onPhoneChange: (v: string) => void;
  onCodeChange: (v: string) => void;
  scene: 'register' | 'bind';
  onError: (msg: string) => void;
}

/** 手机号 + 获取验证码（60s 倒计时）+ 验证码输入，注册与补绑共用 */
export function SmsCodeInput({ phone, code, onPhoneChange, onCodeChange, scene, onError }: Props) {
  const sendSmsCode = useAuthStore((s) => s.sendSmsCode);
  const [countdown, setCountdown] = useState(0);
  const [sending, setSending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const validPhone = /^1[3-9]\d{9}$/.test(phone);

  const handleSend = async () => {
    if (!validPhone) {
      onError('请输入正确的手机号');
      return;
    }
    setSending(true);
    try {
      await sendSmsCode(phone, scene);
      onError('');
      setCountdown(60);
      timerRef.current = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1 && timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return c - 1;
        });
      }, 1000);
    } catch (err) {
      const resp = (err as { response?: { data?: { detail?: string } } })?.response;
      onError(typeof resp?.data?.detail === 'string' ? resp.data.detail : '发送失败，请稍后重试');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Input
        label="手机号"
        type="tel"
        placeholder="11 位手机号"
        value={phone}
        onChange={(e) => onPhoneChange(e.target.value.trim())}
        autoComplete="tel"
        maxLength={11}
      />
      <div className="flex gap-2 items-end">
        <Input
          label="短信验证码"
          placeholder="6 位验证码"
          value={code}
          onChange={(e) => onCodeChange(e.target.value.trim())}
          maxLength={6}
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!validPhone || countdown > 0 || sending}
          className="flex-shrink-0 px-3 py-2 text-sm rounded-lg border border-primary-300 text-primary-700
            hover:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap
            dark:border-primary-700 dark:text-primary-400 dark:hover:bg-primary-900/30"
        >
          {countdown > 0 ? `${countdown}s 后重发` : sending ? '发送中…' : '获取验证码'}
        </button>
      </div>
    </>
  );
}
