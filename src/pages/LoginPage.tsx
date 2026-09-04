import { GuestLayout } from '../components/layout/GuestLayout';
import { LoginForm } from '../components/auth/LoginForm';

export function LoginPage() {
  return (
    <GuestLayout>
      <LoginForm />
    </GuestLayout>
  );
}
