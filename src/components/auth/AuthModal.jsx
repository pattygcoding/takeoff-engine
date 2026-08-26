import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/auth/auth';
import { useTranslation } from '@/context/I18nContext';

export default function AuthModal({ isOpen, onClose, initialView = 'login' }) {
  const { login, register } = useAuth();
  const { t } = useTranslation();
  const [view, setView] = useState(initialView); // 'login' | 'register' | 'forgot' | 'reset'

  // Form states
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [registerUsername, setRegisterUsername] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerFirstName, setRegisterFirstName] = useState('');
  const [registerLastName, setRegisterLastName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [honeypot, setHoneypot] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const resetForm = () => {
    setError('');
    setMessage('');
    setLoginPassword('');
    setRegisterPassword('');
    setNewPassword('');
  };

  const switchView = (newView) => {
    resetForm();
    setView(newView);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login({ usernameOrEmail: loginIdentifier, password: loginPassword });
      onClose();
    } catch (err) {
      setError(err.message || t('authModal.errLoginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register({
        username: registerUsername,
        password: registerPassword,
        firstName: registerFirstName,
        lastName: registerLastName,
        email: registerEmail,
        phoneNumber: registerPhone,
        _gotcha: honeypot,
      });
      onClose();
    } catch (err) {
      setError(err.message || t('authModal.errRegisterFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);
    try {
      const res = await authApi.forgotPassword(forgotEmail);
      setMessage(res.message || t('authModal.resetLinkSent'));
    } catch (err) {
      setError(err.message || t('authModal.errResetFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 relative my-8 border border-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-100 transition"
          aria-label="Close"
        >
          ✕
        </button>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        {message && (
          <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {/* LOGIN VIEW */}
        {view === 'login' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">{t('authModal.welcomeBack')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('authModal.loginSubtitle')}</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('authModal.usernameOrEmail')}
                </label>
                <input
                  type="text"
                  required
                  value={loginIdentifier}
                  onChange={(e) => setLoginIdentifier(e.target.value)}
                  placeholder={t('authModal.usernameOrEmailPlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    {t('authModal.password')}
                  </label>
                  <button
                    type="button"
                    onClick={() => switchView('forgot')}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    {t('authModal.forgotPassword')}
                  </button>
                </div>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder={t('authModal.passwordPlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition mt-2 text-sm"
              >
                {loading ? t('authModal.loggingIn') : t('authModal.logIn')}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-500">
              {t('authModal.dontHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => switchView('register')}
                className="text-indigo-600 font-semibold hover:underline"
              >
                {t('authModal.createAccount')}
              </button>
            </div>
          </div>
        )}

        {/* REGISTER VIEW */}
        {view === 'register' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">{t('authModal.createAccount')}</h2>
              <p className="text-sm text-slate-500 mt-1">{t('authModal.getStartedSubtitle')}</p>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t('authModal.firstName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={registerFirstName}
                    onChange={(e) => setRegisterFirstName(e.target.value)}
                    placeholder={t('authModal.firstNamePlaceholder')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    {t('authModal.lastName')}
                  </label>
                  <input
                    type="text"
                    required
                    value={registerLastName}
                    onChange={(e) => setRegisterLastName(e.target.value)}
                    placeholder={t('authModal.lastNamePlaceholder')}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('authModal.username')}
                </label>
                <input
                  type="text"
                  required
                  value={registerUsername}
                  onChange={(e) => setRegisterUsername(e.target.value)}
                  placeholder={t('authModal.usernamePlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* Anti-bot Honeypot field (hidden from real users) */}
              <div style={{ display: 'none', position: 'absolute', left: '-9999px' }} aria-hidden="true">
                <input
                  type="text"
                  name="_gotcha"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('authModal.email')}
                </label>
                <input
                  type="email"
                  required
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder={t('authModal.emailPlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('authModal.phoneOptional')}
                </label>
                <input
                  type="tel"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  placeholder={t('authModal.phonePlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('authModal.passwordMinChars')}
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder={t('authModal.passwordPlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition mt-2 text-sm"
              >
                {loading ? t('authModal.creatingAccount') : t('authModal.createAccount')}
              </button>
            </form>

            <div className="mt-5 text-center text-sm text-slate-500">
              {t('authModal.alreadyHaveAccount')}{' '}
              <button
                type="button"
                onClick={() => switchView('login')}
                className="text-indigo-600 font-semibold hover:underline"
              >
                {t('authModal.logIn')}
              </button>
            </div>
          </div>
        )}

        {/* FORGOT PASSWORD VIEW */}
        {view === 'forgot' && (
          <div>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-slate-800">{t('authModal.forgotPasswordTitle')}</h2>
              <p className="text-sm text-slate-500 mt-1">
                {t('authModal.forgotPasswordSubtitle')}
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('authModal.emailAddress')}
                </label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder={t('authModal.yourEmailPlaceholder')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium rounded-lg shadow-sm transition mt-2 text-sm"
              >
                {loading ? t('authModal.submitting') : t('authModal.sendResetInstructions')}
              </button>

              <div className="flex justify-between items-center text-xs text-slate-500 pt-2">
                <button
                  type="button"
                  onClick={() => switchView('login')}
                  className="text-indigo-600 hover:underline"
                >
                  {t('authModal.backToLogIn')}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
