import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';

/** 功能卡片数据 */
const FEATURES: { icon: string; title: string; desc: string }[] = [
  {
    icon: '💬',
    title: 'AI 心理对话',
    desc: '四种对话模式：心理科普、心理咨询、心理测评、阅读学习，随时随地倾诉',
  },
  {
    icon: '🌬️',
    title: '呼吸练习',
    desc: '引导式呼吸放松训练，帮你缓解焦虑、调节情绪、改善睡眠',
  },
  {
    icon: '📖',
    title: '电子书阅读',
    desc: '内置心理学经典书库，支持整书阅读、学习与研究',
  },
  {
    icon: '📝',
    title: '情绪日记',
    desc: '记录每日心情，可视化情绪变化趋势，更懂自己的内心',
  },
  {
    icon: '📊',
    title: '心理测评',
    desc: '专业心理量表，系统评估你的情绪状态与人格特质',
  },
  {
    icon: '❤️',
    title: '心情社区',
    desc: '温暖安全的空间，和同路人分享感受、互相支持',
  },
];

export function IntroPage() {
  const navigate = useNavigate();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const handleStart = () => {
    if (isAuthenticated) {
      navigate('/app/dashboard');
    } else {
      navigate('/app/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50/60 to-surface-light dark:from-zinc-800 dark:to-zinc-900">
      {/* 第一屏：品牌 + 开始使用按钮（占满视口，垂直居中） */}
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary-100 mb-5">
            <span className="text-4xl">🍃</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-zinc-100">深呼吸 DeepBreath</h1>
          <p className="text-base text-gray-500 dark:text-zinc-400 mt-2">你的 AI 心理陪伴平台</p>
        </div>

        {/* 开始使用（第一屏中部） */}
        <div className="text-center">
          <Button size="lg" onClick={handleStart}>
            {isAuthenticated ? '进入工作台 →' : '开始使用 →'}
          </Button>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-3">
            登录后即可使用全部功能 · 首次使用请先注册
          </p>
        </div>

        {/* 下滑提示 */}
        <div className="absolute bottom-6 left-0 right-0 flex justify-center text-gray-400 dark:text-zinc-500 animate-bounce">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      {/* 第二屏起：详细介绍 */}
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* 是什么 */}
        <div className="bg-white dark:bg-zinc-800 rounded-2xl p-6 mb-8 shadow-card">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-3">🫂 这是什么？</h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-300">
            DeepBreath 是一款基于科学心理学的 <b>AI 心理陪伴应用</b>。
            它像一位随时在线的朋友，用认知行为疗法、积极心理学等专业框架，
            陪你梳理情绪、解答困惑、养成自我觉察的习惯。
            无论你是想倾诉、想学习心理学知识，还是想练习放松，这里都有一个温暖的空间。
          </p>
        </div>

        {/* 功能 */}
        <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-4">✨ 核心功能</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white dark:bg-zinc-800 rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-shadow"
            >
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="font-semibold text-gray-800 dark:text-zinc-100 text-sm mb-1">{f.title}</h3>
              <p className="text-xs leading-relaxed text-gray-500 dark:text-zinc-400">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* 意义 */}
        <div className="bg-primary-50/70 dark:bg-zinc-800 rounded-2xl p-6 mb-10">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-zinc-100 mb-3">🌟 它的意义</h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-zinc-300">
            心理困扰不该独自承受。DeepBreath 希望用 AI 的力量，让每个人都<wbr />
            能 <b>随时获得专业的心理支持</b>——不评判、不打扰、不缺席。
            每一次倾诉都被认真对待，每一次练习都让你离内心平静更近一步。
          </p>
        </div>
      </div>
    </div>
  );
}
