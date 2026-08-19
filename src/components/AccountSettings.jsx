import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../lib/auth';
import { useNavigate } from 'react-router';

export default function AccountSettings() {
  const { user, setUser, logout } = useAuth();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');
  const [profileErr, setProfileErr] = useState('');

  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteErr, setDeleteErr] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileErr('');
    setProfileMsg('');
    setProfileLoading(true);

    try {
      const res = await authApi.updateProfile({ firstName, lastName, phoneNumber });
      setProfileMsg(res.message || 'Profile updated successfully.');
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('takeoff_user', JSON.stringify(res.user));
      }
      setTimeout(() => setProfileMsg(''), 4000);
    } catch (err) {
      setProfileErr(err.message || 'Failed to update profile.');
    } finally {
      setProfileLoading(false);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setPasswordErr('');
    setPasswordMsg('');

    if (newPassword.length < 6) {
      setPasswordErr('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErr('New passwords do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await authApi.updatePassword({ newPassword });
      setPasswordMsg(res.message || 'Password updated successfully.');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordMsg(''), 4000);
    } catch (err) {
      setPasswordErr(err.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== user?.username) {
      setDeleteErr(`Please type "${user?.username}" to confirm.`);
      return;
    }

    setDeleteLoading(true);
    setDeleteErr('');

    try {
      await authApi.deleteAccount();
      await logout();
      navigate('/login');
    } catch (err) {
      setDeleteErr(err.message || 'Failed to delete account.');
      setDeleteLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Account Settings</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your personal profile, security credentials, and account lifecycle.
          </p>
        </div>
        <button
          onClick={() => navigate(`/${user?.username}`)}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
        >
          ← Back to Dashboard
        </button>
      </div>

      <div className="space-y-8">
        {/* Contact Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Contact Information</h2>
              <p className="text-xs text-slate-500">Update your name and primary phone number.</p>
            </div>
          </div>

          {profileMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm border border-emerald-200">
              ✓ {profileMsg}
            </div>
          )}
          {profileErr && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-800 text-sm border border-red-200">
              ✕ {profileErr}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  First Name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Last Name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Username
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.username || ''}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-xl cursor-not-allowed"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Username cannot be changed.</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-xl cursor-not-allowed"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">Managed by Supabase Auth security.</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="(555) 000-0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full sm:w-1/2 px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold shadow-xs transition"
              >
                {profileLoading ? 'Saving Changes...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>

        {/* Change Password Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Change Password</h2>
              <p className="text-xs text-slate-500">Ensure your account is using a secure password.</p>
            </div>
          </div>

          {passwordMsg && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-sm border border-emerald-200">
              ✓ {passwordMsg}
            </div>
          )}
          {passwordErr && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-800 text-sm border border-red-200">
              ✕ {passwordErr}
            </div>
          )}

          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  New Password (min 6 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading || !newPassword}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-semibold shadow-xs transition"
              >
                {passwordLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Danger Zone: Delete Account */}
        <div className="bg-red-50/50 rounded-2xl border border-red-200 p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-red-900">Delete Account & Cloud Data</h2>
              <p className="text-xs text-red-700 mt-1 max-w-xl">
                Permanently delete your account, saved cloud estimates, project version history, and subscription access. This action cannot be undone.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setDeleteConfirmText('');
                setDeleteErr('');
                setShowDeleteModal(true);
              }}
              className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 relative">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Are you absolutely sure?</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              This will permanently delete your user account <strong>@{user?.username}</strong> and all associated cloud estimates and projects.
            </p>

            {deleteErr && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                ✕ {deleteErr}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Type your username <strong className="text-slate-900">{user?.username}</strong> to confirm:
              </label>
              <input
                type="text"
                placeholder={user?.username}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
              />
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== user?.username || deleteLoading}
                onClick={handleDeleteAccount}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition"
              >
                {deleteLoading ? 'Deleting Account...' : 'Permanently Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
