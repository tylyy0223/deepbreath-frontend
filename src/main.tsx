import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './i18n';  // 初始化 i18n（P2 国际化）
import './index.css';
import App from './App';
import { ToastProvider } from './components/ui/Toast';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </StrictMode>,
);
