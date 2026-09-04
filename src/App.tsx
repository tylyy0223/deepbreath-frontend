import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './router';
import { useAuthStore } from './stores/authStore';
// 强制入口引用，防 Vite tree-shaking 误删（音频图标功能依赖此模块）
import './lib/ttsAudio';

function App() {
  useEffect(() => {
    // Init auth
    useAuthStore.getState().init();
    // Init theme from localStorage
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  return <RouterProvider router={router} />;
}

export default App;
