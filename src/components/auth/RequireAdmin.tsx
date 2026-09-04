import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { RequireAuth } from './RequireAuth';
import { useAuthStore } from '../../stores/authStore';

function AdminGate({ children }: { children: ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const isInitializing = useAuthStore((s) => s.isInitializing);

  if (isInitializing) return null;
  if (user?.role !== 'admin') return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  return (
    <RequireAuth>
      <AdminGate>{children}</AdminGate>
    </RequireAuth>
  );
}
