import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Bot, Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from 'lucide-react';
import { isAxiosError } from 'axios';
import { authApi } from '@/api';
import { useAuthStore } from '@/stores/authStore';
import { LoginBackdrop } from './LoginBackdrop';
import './login.css';

const loginSchema = z.object({
  username: z.string().min(1, 'نام کاربری الزامی است'),
  password: z.string().min(1, 'رمز عبور الزامی است'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { setTokens } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setSubmitError('');
    try {
      const response = await authApi.login(data);
      setTokens(response.access_token, response.refresh_token);
      navigate('/');
    } catch (error) {
      setSubmitError(isAxiosError(error) && (!error.response || error.response.status >= 500)
        ? 'ارتباط با سرور برقرار نشد. لطفاً دوباره تلاش کنید.'
        : 'نام کاربری یا رمز عبور اشتباه است.');
    }
  };

  return <main className="admin-login" dir="rtl">
    <LoginBackdrop />
    <div className="admin-login-shell">
      <section className="admin-login-form-panel" aria-labelledby="login-title">
        <div className="admin-login-emblem" aria-hidden="true">
          <div className="admin-login-brand"><Bot size={34} strokeWidth={1.6} /></div>
        </div>
        <h1 id="login-title" className="sr-only">ورود به پنل مدیریت</h1>
        <div className="admin-login-form-content">
          <form onSubmit={handleSubmit(onSubmit)} noValidate aria-busy={isSubmitting}>
            <fieldset disabled={isSubmitting} className="admin-login-fields">
              <div className="admin-login-field">
                <label htmlFor="login-username">نام کاربری</label>
                <div className="admin-login-input">
                  <UserRound size={19} aria-hidden="true" />
                  <input {...register('username')} id="login-username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} dir="auto"
                    placeholder="نام کاربری شما"
                    aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? 'login-username-error' : undefined} />
                </div>
                {errors.username && <p id="login-username-error" className="admin-login-field-error" role="alert">{errors.username.message}</p>}
              </div>
              <div className="admin-login-field">
                <label htmlFor="login-password">رمز عبور</label>
                <div className="admin-login-input">
                  <LockKeyhole size={19} aria-hidden="true" />
                  <input {...register('password')} id="login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" dir="auto"
                    placeholder="رمز عبور شما"
                    aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? 'login-password-error' : undefined} />
                  <button type="button" className="admin-login-reveal" onClick={() => setShowPassword(value => !value)}
                    aria-label={showPassword ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'} aria-pressed={showPassword} aria-controls="login-password">
                    {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
                  </button>
                </div>
                {errors.password && <p id="login-password-error" className="admin-login-field-error" role="alert">{errors.password.message}</p>}
              </div>
              {submitError && <div className="admin-login-error" role="alert">{submitError}</div>}
              <button type="submit" className="admin-login-submit">
                <span>{isSubmitting ? 'در حال ورود…' : 'ورود به پنل'}</span>
                {isSubmitting ? <LoaderCircle size={20} className="admin-login-spinner" aria-hidden="true" /> : <ArrowLeft size={20} aria-hidden="true" />}
              </button>
            </fieldset>
          </form>
        </div>
      </section>
    </div>
  </main>;
}
