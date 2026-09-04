import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCommunityStore } from '../../stores/communityStore';
import { useToast } from '../ui/Toast';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface Props {
  content: string;
  mode: string;
  onClose: () => void;
}

const MODE_TYPE: Record<string, string> = {
  science: 'insight',
  counseling: 'mood',
  assessment: 'mood',
  reading: 'insight',
};

/** 对话分享到社区弹窗（P2-#14） */
export function ShareToCommunityModal({ content, mode, onClose }: Props) {
  const [title, setTitle] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [saving, setSaving] = useState(false);
  const { t } = useTranslation();
  const { addToast } = useToast();
  const createPost = useCommunityStore((s) => s.createPost);

  const quotedContent = `> ${content.slice(0, 500)}${content.length > 500 ? '...' : ''}`;

  const handleShare = async () => {
    setSaving(true);
    try {
      await createPost({
        title: title || content.slice(0, 50),
        content: `${quotedContent}\n\n*—— 来自 DeepBreath ${MODE_TYPE[mode] === 'insight' ? '阅读' : '聊天'}分享*`,
        category: 'general',
        is_anonymous: anonymous,
      });
      addToast(t('community.share_success'), 'success');
      onClose();
    } catch {
      addToast('分享失败，请稍后重试', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
         onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
        <h3 className="font-semibold text-gray-800 dark:text-zinc-200">{t('community.share_title')}</h3>
        <Input
          label={t('articles.title')}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={content.slice(0, 50)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">{t('community.share_preview')}</label>
          <div className="text-sm text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-700 rounded-xl p-3 max-h-40 overflow-auto whitespace-pre-wrap">
            {quotedContent}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
          {t('community.anonymous')}
        </label>
        <div className="flex gap-3">
          <Button onClick={onClose} className="flex-1" variant="secondary">{t('community.share_cancel')}</Button>
          <Button onClick={handleShare} loading={saving} className="flex-1">{t('community.share_publish')}</Button>
        </div>
      </div>
    </div>
  );
}
