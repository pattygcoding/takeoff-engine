import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/auth';
import UpgradeModal from './UpgradeModal';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const isExempt =
    user?.role === 'admin' ||
    user?.role === 'payment_exempt' ||
    user?.role === 'user_payment_exempt' ||
    user?.has_unlimited_bypass === true ||
    user?.subscription_status === 'active' ||
    ['starter', 'pro', 'enterprise'].includes(user?.subscription_tier);

  const getPlanLabel = () => {
    if (user?.role === 'admin') return 'Admin';
    if (user?.role === 'payment_exempt' || user?.role === 'user_payment_exempt') return 'VIP Unlimited';
    if (user?.subscription_tier === 'starter') return 'Starter Plan';
    if (user?.subscription_tier === 'enterprise') return 'Enterprise';
    return 'Pro Plan';
  };

  const isAdmin = user?.role === 'admin';
  const isPaymentExempt = user?.role === 'payment_exempt' || user?.role === 'user_payment_exempt';

  const credits = typeof user?.trial_uses_remaining === 'number' ? user.trial_uses_remaining : 5;

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErr('');
    setMsg('');
    setLoading(true);
    try {
      const res = await authApi.updatePassword({ newPassword });
      setMsg(res.message || 'Password updated successfully.');
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
                  Plan Quota
                </span>
                <p className="text-xs font-medium text-slate-700">
                  {isExempt ? 'Unlimited Exports' : `${credits} of 5 free trial exports remaining`}
                </p>
              </div>
            </div>

            {!isExempt && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowUpgradeModal(true);
                }}
                className="w-full text-left px-4 py-2 text-sm text-indigo-600 font-medium hover:bg-indigo-50 transition flex items-center justify-between"
              >
                <span>Upgrade Plan</span>
                <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded">Pro</span>
              </button>
            )}

            <a
              href={`#/${user.username}/settings`}
              onClick={() => setIsOpen(false)}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Account Settings</span>
            </a>

            <button
              onClick={() => {
                setIsOpen(false);
                setShowPasswordModal(true);
              }}
              className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition"
            >
              Change Password
            </button>

            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition"
            >
              Log Out
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
            <h3 className="text-lg font-bold text-slate-800 mb-4">Update Password</h3>

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
                  New Password (min 6 chars)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition mt-2"
              >
                {loading ? 'Saving...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
