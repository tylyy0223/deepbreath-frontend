import { GuestLayout } from '../components/layout/GuestLayout';
import { RegisterForm } from '../components/auth/RegisterForm';

export function RegisterPage() {
  return (
    <GuestLayout>
      <RegisterForm />
    </GuestLayout>
  );
}
