import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card } from '../components/ui/Card';
import { useToast } from '../components/ui/Toast';
import api from '../lib/axios';
import { ENDPOINTS } from '../config/api';
import { getTtsVoice, setTtsVoice, type TtsVoice } from '../lib/ttsAudio';
import { switchLang } from '../i18n';

export function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const setTokens = useAuthStore((s) => s.setTokens);
  const { addToast } = useToast();

  // Profile form
  const [nickname, setNickname] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [province, setProvince] = useState('');
  const [saving, setSaving] = useState(false);

  // Theme
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));

  // TTS voice
  const [ttsVoice, setTtsVoiceLocal] = useState<TtsVoice>(getTtsVoice);

  // Password form
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  useEffect(() => {
    if (user) {
      setNickname(user.nickname || '');
    }
    // Fetch current profile
    api.get(ENDPOINTS.AUTH_ME).then((r) => {
      const p = r.data;
      if (p.bio) setBio(p.bio);
      if (p.gender) setGender(p.gender);
      if (p.birth_year) setBirthYear(String(p.birth_year));
      if (p.province) setProvince(p.province);
    }).catch(() => {});
  }, [user]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const data: Record<string, unknown> = {};
      if (nickname.trim()) data.nickname = nickname.trim();
      if (bio.trim()) data.bio = bio.trim();
      if (gender) data.gender = gender;
      if (birthYear) data.birth_year = Number(birthYear);
      if (province.trim()) data.province = province.trim();

      await api.put(ENDPOINTS.AUTH_PROFILE, data);

      // Refresh user info (include profile fields so UI stays in sync)
      if (user) {
        const updated = {
          ...user,
          nickname: nickname.trim() || user.nickname,
          bio: bio.trim(),
          gender,
          birth_year: birthYear ? Number(birthYear) : null,
          province: province.trim(),
        };
        setTokens(useAuthStore.getState().accessToken!, updated);
      }
      addToast('保存成功', 'success');
    } catch {
      addToast('保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!oldPwd || !newPwd) return;
    if (newPwd.length < 6) {
      addToast('新密码至少 6 位', 'error');
      return;
    }
    if (newPwd !== confirmPwd) {
      addToast('两次输入的新密码不一致', 'error');
      return;
    }
    setChangingPwd(true);
    try {
      await api.put(ENDPOINTS.AUTH_PASSWORD, { old_password: oldPwd, new_password: newPwd });
      setOldPwd('');
      setNewPwd('');
      setConfirmPwd('');
      addToast('密码已修改，其他设备将退出登录', 'success');
    } catch (err) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      addToast(detail || '修改失败', 'error');
    } finally {
      setChangingPwd(false);
    }
  };

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-200">⚙️ 系统设置</h2>

      {/* Profile */}
      <Card className="p-5">
        <h3 className="font-medium text-gray-700 dark:text-zinc-300 mb-4">👤 个人信息</h3>
        <div className="space-y-3">
          <Input label="邮箱" value={user?.email || ''} disabled />
          <Input label="手机号" value={user?.phone || '未绑定'} disabled />
          <Input label="昵称" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="设置昵称" />
          <Input label="简介" value={bio} onChange={(e) => setBio(e.target.value)} placeholder="简单介绍一下自己" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-600 mb-1">性别</label>
              <select
                id="gender"
                name="gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white
                  focus:outline-none focus:ring-2 focus:ring-primary-300"
              >
                <option value="">不设置</option>
                <option value="male">男</option>
                <option value="female">女</option>
                <option value="other">其他</option>
              </select>
            </div>
            <Input label="出生年份" type="number" value={birthYear} onChange={(e) => setBirthYear(e.target.value)} placeholder="1990" />
          </div>
          <Input label="省份" name="province" autoComplete="address-level1" value={province} onChange={(e) => setProvince(e.target.value)} placeholder="如：广东" />
          <Button onClick={handleSaveProfile} loading={saving} className="w-full">保存</Button>
        </div>
      </Card>

      {/* Password */}
      <Card className="p-5">
        <h3 className="font-medium text-gray-700 dark:text-zinc-300 mb-4">🔒 修改密码</h3>
        <div className="space-y-3">
          <Input label="当前密码" type="password" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} placeholder="输入当前密码" autoComplete="current-password" />
          <Input label="新密码" type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="至少 6 位" autoComplete="new-password" />
          <Input label="确认新密码" type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} placeholder="再输入一次新密码" autoComplete="new-password" />
          <Button
            onClick={handleChangePassword}
            loading={changingPwd}
            disabled={!oldPwd || !newPwd || !confirmPwd}
            className="w-full"
          >
            修改密码
          </Button>
        </div>
      </Card>

      {/* TTS Voice */}
      <Card className="p-5">
        <h3 className="font-medium text-gray-700 dark:text-zinc-300 mb-4">🔊 TTS 语音</h3>
        <p className="text-xs text-gray-400 mb-3">选择语音朗读的音色（已生成的音频需重新生成）</p>
        <div className="flex gap-2">
          {(['female', 'male'] as TtsVoice[]).map((v) => (
            <button
              key={v}
              onClick={() => { setTtsVoice(v); setTtsVoiceLocal(v); }}
              className={`flex-1 px-4 py-2.5 text-sm rounded-xl border transition-colors
                ${ttsVoice === v
                  ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-400'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400'
                }`}
            >
              {v === 'female' ? '👩 女声' : '👨 男声'}
            </button>
          ))}
        </div>
      </Card>

      {/* Language 语言 */}
      <Card className="p-5">
        <h3 className="font-medium text-gray-700 dark:text-zinc-300 mb-4">🌐 语言 / Language</h3>
        <div className="flex gap-2">
          {(['zh-CN', 'en'] as const).map((l) => (
            <button
              key={l}
              onClick={() => switchLang(l)}
              className={`flex-1 px-4 py-2.5 text-sm rounded-xl border transition-colors ${
                (localStorage.getItem('i18n_lang') || 'zh-CN') === l
                  ? 'bg-primary-50 border-primary-300 text-primary-700 font-medium dark:bg-primary-900/30 dark:border-primary-700 dark:text-primary-400'
                  : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50 dark:bg-zinc-800 dark:border-zinc-600 dark:text-zinc-400'
              }`}
            >
              {l === 'zh-CN' ? '🇨🇳 中文' : '🇺🇸 English'}
            </button>
          ))}
        </div>
      </Card>

      {/* Theme */}
      <Card className="p-5">
        <h3 className="font-medium text-gray-700 dark:text-zinc-300 mb-4">🎨 外观</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-700 dark:text-zinc-300">深色模式</p>
            <p className="text-xs text-gray-400">切换暗色主题</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative w-12 h-6 rounded-full transition-colors ${dark ? 'bg-primary-500' : 'bg-gray-300'}`}
          >
            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${dark ? 'translate-x-6' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </Card>

      {/* About */}
      <Card className="p-5">
        <h3 className="font-medium text-gray-700 dark:text-zinc-300 mb-2">ℹ️ 关于</h3>
        <p className="text-sm text-gray-500">DeepBreath v1.4</p>
        <p className="text-xs text-gray-400 mt-1">你的心理陪伴平台</p>
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-zinc-700">
          <a
            href="/app/download/deepbreath-latest.apk"
            className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium no-underline"
          >
            📲 下载安卓 APP
          </a>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-gray-600 dark:text-zinc-300 font-medium">💻 下载 Mac APP</p>
            <a
              href="/app/download/deepbreath-latest-mac-apple.zip"
              className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium no-underline"
            >
              🍎 Apple 芯片（M1/M2/M3/M4）
            </a>
            <br />
            <a
              href="/app/download/deepbreath-latest-mac-intel.zip"
              className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium no-underline"
            >
              💾 Intel 芯片
            </a>
            <p className="text-xs text-gray-400 mt-1">
              解压后把「深呼吸 DeepBreath」拖入「应用程序」即可。首次打开如提示无法验证开发者，请右键 → 打开。
            </p>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            iPhone 用户：Safari 打开本站 → 分享 → 添加到主屏幕
          </p>
        </div>
      </Card>
    </div>
  );
}
