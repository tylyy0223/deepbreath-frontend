import type { ReactNode } from 'react';
import { ProtectedRoute } from './ProtectedRoute';
import { AppShell } from '../layout/AppShell';

export function RequireAuth({ children }: { children: ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>
        {children}
      </AppShell>
    </ProtectedRoute>
  );
}
