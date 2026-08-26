import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from '@/context/I18nContext';
import { authApi } from '@/lib/auth/auth';
import UpgradeModal from '@/components/billing/UpgradeModal';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const isExempt =
    user?.role === 'admin' ||
    user?.role === 'payment_exempt' ||
    user?.has_unlimited_bypass === true ||
    (user?.subscription_status === 'active' && ['starter', 'pro', 'enterprise'].includes(user?.subscription_tier));

  const getPlanLabel = () => {
    if (user?.role === 'admin') return 'Super-Admin';
    if (user?.role === 'payment_exempt') return 'VIP Member / All Features Unlocked';
    if (user?.subscription_tier === 'starter') return 'Starter Plan';
    if (user?.subscription_tier === 'enterprise') return 'Enterprise Plan';
    return user?.subscription_tier === 'pro' ? 'Pro Plan' : 'Free Trial';
  };

  const isAdmin = user?.role === 'admin';
  const isPaymentExempt = user?.role === 'payment_exempt';

  const credits = typeof user?.trial_uses_remaining === 'number' ? user.trial_uses_remaining : 5;

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!oldPassword) {
      setErr(t('accountSettings.currentPasswordRequired', 'Current password is required'));
      return;
    }
    setErr('');
    setMsg('');
    setLoading(true);
    try {
      const res = await authApi.updatePassword({ oldPassword, newPassword });
      setMsg(res.message || 'Password updated successfully.');
      setOldPassword('');
      setNewPassword('');
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (error) {
      setErr(error.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="flex items-center gap-3">
      {/* Usage Meter Badge */}
      {isExempt ? (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-sm">
          <svg className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{getPlanLabel()}</span>
        </span>
      ) : (
        <button
          onClick={() => setShowUpgradeModal(true)}
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all ${
            credits > 0
              ? 'bg-amber-50/80 text-amber-800 border-amber-200 hover:bg-amber-100/80'
              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100 animate-pulse'
          }`}
          title="Click to view upgrade plans"
        >
          <span className="text-amber-500 font-bold">⚡</span>
          <span>{credits} {credits === 1 ? 'credit' : 'credits'} left</span>
          <span className="font-semibold underline ml-0.5">Upgrade</span>
        </button>
      )}

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 border border-slate-200 transition text-sm text-slate-700 font-medium"
        >
          <span className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
            {user.first_name ? user.first_name[0].toUpperCase() : user.username[0].toUpperCase()}
          </span>
          <span className="max-w-[120px] truncate">{user.first_name || user.username}</span>
          <span className="text-xs text-slate-400">▼</span>
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 z-50">
            <div className="px-4 py-2 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-800">
                {user.first_name} {user.last_name}
              </p>
              <p className="text-xs text-slate-500 truncate">@{user.username}</p>
              {user.email && <p className="text-xs text-slate-400 truncate">{user.email}</p>}
              <div className="mt-2 pt-2 border-t border-slate-100">
                <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 block mb-0.5">
                  {t('userMenu.signInName')}
                </span>
                <p className="text-xs font-medium text-slate-700">
                  {isExempt ? t('userMenu.unlimitedExports') : t('userMenu.freeTrialExports', { credits })}
                </p>
              </div>
            </div>

            {!isExempt && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowUpgradeModal(true);
                }}
                className="w-full text-left px-4 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 transition flex items-center justify-between cursor-pointer"
              >
                <span>Upgrade Plan</span>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Pro</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  navigate('/admin');
                }}
                className="w-full text-left px-4 py-2 text-sm text-purple-700 font-semibold hover:bg-purple-50 transition flex items-center gap-2 cursor-pointer"
              >
                <span>⚡</span>
                <span>{t('userMenu.superAdminPortal')}</span>
              </button>
            )}

            <button
              onClick={() => {
                setIsOpen(false);
                navigate(`/${user.username}/settings`);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>{t('userMenu.accountSettings')}</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                navigate('/home');
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span>{t('userMenu.publicSite')}</span>
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                setShowPasswordModal(true);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              {t('userMenu.changePassword')}
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition cursor-pointer"
            >
              {t('userMenu.logOut')}
            </button>
          </div>
        )}
      </div>

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-2"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-800 mb-4">{t('userMenu.updatePasswordTitle')}</h3>

            {err && (
              <div className="mb-3 p-2 text-xs rounded bg-red-50 text-red-700 border border-red-200">
                {err}
              </div>
            )}
            {msg && (
              <div className="mb-3 p-2 text-xs rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                {msg}
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('accountSettings.currentPasswordLabel', 'Current Password')}
                </label>
                <div className="relative">
                  <input
                    type={showOldPassword ? 'text' : 'password'}
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-sm focus:outline-none"
                    aria-label={showOldPassword ? t('loginPage.hidePassword', 'Hide password') : t('loginPage.showPassword', 'Show password')}
                  >
                    {showOldPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  {t('userMenu.newPassword')}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-sm focus:outline-none"
                    aria-label={showNewPassword ? t('loginPage.hidePassword', 'Hide password') : t('loginPage.showPassword', 'Show password')}
                  >
                    {showNewPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !oldPassword || !newPassword}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition mt-2"
              >
                {loading ? t('userMenu.saving') : t('userMenu.updatePassword')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
