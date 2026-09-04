import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-light p-4">
      <div className="text-center">
        <span className="text-6xl">🍃</span>
        <h1 className="mt-4 text-2xl font-semibold text-gray-800 dark:text-zinc-200">404</h1>
        <p className="mt-1 text-gray-400">页面不存在</p>
        <Link to="/app/chat/science" className="inline-block mt-6 no-underline">
          <Button variant="secondary">返回首页</Button>
        </Link>
      </div>
    </div>
  );
}
