import React, { useState, useEffect } from 'react';
import { adminApi } from '@/core/lib/admin/admin';
import { formatCurrency, formatNumber } from '@/product/lib/calculations';
import { useAuth } from '@/core/components/context/AuthContext';
import { useModal } from '@/core/components/context/ModalContext';
import { useNavigate } from 'react-router-dom';
import { isValidPhoneNumber } from '@/core/lib/shared/validators';
import {
  STARTER_MONTHLY_PRICE,
  PRO_MONTHLY_PRICE,
  ENTERPRISE_MONTHLY_PRICE,
} from '@/core/constants';

export default function AdminPortal() {
  const { user } = useAuth();
  const { showAlert, showPrompt, showConfirm } = useModal();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'promos', 'audit'

  // Promo Code Creation Form
  const [newCode, setNewCode] = useState('');
  const [grantTier, setGrantTier] = useState('pro');
  const [grantUnlimited, setGrantUnlimited] = useState(true);
  const [grantCredits, setGrantCredits] = useState(10);
  const [maxUses, setMaxUses] = useState(10);
  const [creatingPromo, setCreatingPromo] = useState(false);
  const [promoSuccessMsg, setPromoSuccessMsg] = useState('');

  // Create User Modal Form
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [createUserError, setCreateUserError] = useState('');
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    companyName: '',
    role: 'user',
    subscriptionTier: 'free',
    hasUnlimitedBypass: false,
    isTestUser: false,
    trialUsesRemaining: 5,
    reason: 'Admin created account',
  });

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/');
      return;
    }
    loadAdminData();
  }, [user]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      setError('');
      const [statsData, usersData, promoData, auditData] = await Promise.all([
        adminApi.getStats(),
        adminApi.listUsers(),
        adminApi.listPromoCodes(),
        adminApi.listAuditLogs().catch(() => []),
      ]);
      setStats(statsData);
      setUsers(usersData);
      setPromoCodes(promoData);
      setAuditLogs(auditData);
    } catch (err) {
      setError(err.message || 'Failed to load admin portal data.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBypass = async (u) => {
    const isGranting = !u.has_unlimited_bypass;
    const reason = await showPrompt({
      title: isGranting ? 'Grant VIP Unlimited Bypass' : 'Revoke VIP Bypass',
      message: `Please specify the reason for ${isGranting ? 'granting' : 'revoking'} VIP bypass for ${u.email}:`,
      defaultValue: isGranting ? 'Executive Account Courtesy' : 'Trial concluded',
      confirmText: isGranting ? 'Grant Bypass' : 'Revoke Bypass',
    });

    if (reason === null) return; // User cancelled

    try {
      const updated = await adminApi.grantBypass(u.id, {
        hasUnlimitedBypass: isGranting,
        bypassReason: reason,
        role: isGranting ? 'payment_exempt' : 'user',
        tier: isGranting ? 'pro' : 'free',
      });
      setUsers((prev) => prev.map((item) => (item.id === u.id ? { ...item, ...updated } : item)));
      const freshLogs = await adminApi.listAuditLogs().catch(() => []);
      setAuditLogs(freshLogs);
    } catch (err) {
      await showAlert({
        title: 'Bypass Error',
        message: err.message || 'Failed to toggle VIP bypass.',
        variant: 'error',
      });
    }
  };

  const handleSetCredits = async (targetUser) => {
    const input = await showPrompt({
      title: 'Set Takeoff Credits',
      message: `Enter the exact number of takeoff credits to set for ${targetUser.email} (current: ${targetUser.trial_uses_remaining ?? 0}):`,
      defaultValue: String(targetUser.trial_uses_remaining ?? 5),
      confirmText: 'Set Credits',
    });

    if (input === null) return;
    const num = Number(input);
    if (isNaN(num) || num < 0) {
      await showAlert({
        title: 'Invalid Input',
        message: 'Please provide a valid non-negative number of credits.',
        variant: 'error',
      });
      return;
    }

    const reason = await showPrompt({
      title: 'Credit Update Reason',
      message: `Enter an audit note / reason for setting credits to ${num}:`,
      defaultValue: `Set credits to ${num}`,
      confirmText: 'Confirm & Save',
    });

    if (reason === null) return;

    try {
      const updated = await adminApi.setCredits(targetUser.id, num, reason);
      setUsers((prev) => prev.map((item) => (item.id === targetUser.id ? { ...item, ...updated } : item)));
      const freshLogs = await adminApi.listAuditLogs().catch(() => []);
      setAuditLogs(freshLogs);
      await showAlert({
        title: 'Credits Updated',
        message: `Successfully set credits for ${targetUser.email} to ${updated.trial_uses_remaining}.`,
        variant: 'info',
      });
    } catch (err) {
      await showAlert({
        title: 'Credits Error',
        message: err.message || 'Failed to set credits.',
        variant: 'error',
      });
    }
  };

  const handleToggleStatus = async (targetUser) => {
    const isCurrentlySuspended = targetUser.is_disabled || targetUser.status === 'suspended' || targetUser.status === 'disabled';
    const actionName = isCurrentlySuspended ? 'Activate' : 'Suspend';

    if (!isCurrentlySuspended && targetUser.id === user.id) {
      await showAlert({
        title: 'Action Prohibited',
        message: 'You cannot suspend or disable your own administrator account.',
        variant: 'error',
      });
      return;
    }

    const confirmed = await showConfirm({
      title: `${actionName} Account`,
      message: isCurrentlySuspended
        ? `Are you sure you want to restore access for ${targetUser.email}? They will be able to log in immediately.`
        : `Are you sure you want to suspend access for ${targetUser.email}? Their API requests and login sessions will be immediately blocked.`,
      confirmText: `${actionName} Account`,
      confirmVariant: isCurrentlySuspended ? 'primary' : 'danger',
    });

    if (!confirmed) return;

    const reason = await showPrompt({
      title: 'Reason for Moderation Action',
      message: `Enter an audit reason for ${actionName.toLowerCase()}ing ${targetUser.email}:`,
      defaultValue: isCurrentlySuspended ? 'Account reactivation authorized' : 'Terms of service violation or delinquent account',
      confirmText: 'Submit Action',
    });

    if (reason === null) return;

    try {
      const updated = await adminApi.updateStatus(targetUser.id, {
        is_disabled: !isCurrentlySuspended,
        status: isCurrentlySuspended ? 'active' : 'suspended',
        reason,
      });
      setUsers((prev) => prev.map((item) => (item.id === targetUser.id ? { ...item, ...updated } : item)));
      const freshLogs = await adminApi.listAuditLogs().catch(() => []);
      setAuditLogs(freshLogs);
      await showAlert({
        title: 'Account Status Updated',
        message: `Account for ${targetUser.email} is now ${isCurrentlySuspended ? 'active' : 'suspended'}.`,
        variant: 'info',
      });
    } catch (err) {
      await showAlert({
        title: 'Status Update Error',
        message: err.message || 'Failed to update user status.',
        variant: 'error',
      });
    }
  };

  const handleUnlockAccount = async (targetUser) => {
    const confirmed = await showConfirm({
      title: 'Unlock Account',
      message: `Unlock ${targetUser.email} and reset their failed password attempt counter immediately?`,
      confirmText: 'Unlock Account',
      confirmVariant: 'primary',
    });

    if (!confirmed) return;

    try {
      const updated = await adminApi.unlockAccount(targetUser.id, { reason: 'Admin manual unlock' });
      setUsers((prev) => prev.map((item) => (item.id === targetUser.id ? { ...item, ...updated } : item)));
      const freshLogs = await adminApi.listAuditLogs().catch(() => []);
      setAuditLogs(freshLogs);
      await showAlert({
        title: 'Account Unlocked',
        message: `Account for ${targetUser.email} has been unlocked and failed login attempts reset to 0.`,
        variant: 'info',
      });
    } catch (err) {
      await showAlert({
        title: 'Unlock Failed',
        message: err.message || 'Failed to unlock user account.',
        variant: 'error',
      });
    }
  };

  const handleToggleTestUser = async (targetUser) => {
    const isNowTest = !targetUser.is_test_user;
    const actionLabel = isNowTest ? 'Mark as Test User' : 'Unmark as Test User';

    const confirmed = await showConfirm({
      title: actionLabel,
      message: isNowTest
        ? `Mark ${targetUser.email} as a test user? This will EXCLUDE their subscription from estimated active MRR and paying metrics.`
        : `Unmark ${targetUser.email} as a test user? This will INCLUDE their subscription in active MRR and paying metrics.`,
      confirmText: isNowTest ? 'Mark as Test' : 'Unmark Test',
      confirmVariant: 'primary',
    });

    if (!confirmed) return;

    try {
      const updated = await adminApi.updateUser(targetUser.id, {
        is_test_user: isNowTest,
        reason: `Toggled test user status to ${isNowTest}`,
      });
      setUsers((prev) => prev.map((item) => (item.id === targetUser.id ? { ...item, ...updated } : item)));
      const [freshStats, freshLogs] = await Promise.all([
        adminApi.getStats(),
        adminApi.listAuditLogs().catch(() => []),
      ]);
      setStats(freshStats);
      setAuditLogs(freshLogs);
      await showAlert({
        title: 'Test Status Updated',
        message: `${targetUser.email} is now ${isNowTest ? 'marked as a test user' : 'marked as a live user'}.`,
        variant: 'info',
      });
    } catch (err) {
      await showAlert({
        title: 'Update Error',
        message: err.message || 'Failed to update test user status.',
        variant: 'error',
      });
    }
  };

  const handleResetPassword = async (targetUser) => {
    const confirmed = await showConfirm({
      title: 'Send Password Reset Email',
      message: `Send an automated password reset recovery link to ${targetUser.email}?`,
      confirmText: 'Send Reset Link',
      confirmVariant: 'primary',
    });

    if (!confirmed) return;

    const reason = await showPrompt({
      title: 'Audit Note',
      message: `Enter the reason for dispatching a password reset:`,
      defaultValue: 'User requested password recovery via support',
      confirmText: 'Dispatch Email',
    });

    if (reason === null) return;

    try {
      await adminApi.resetPassword(targetUser.id, { reason });
      const freshLogs = await adminApi.listAuditLogs().catch(() => []);
      setAuditLogs(freshLogs);
      await showAlert({
        title: 'Password Reset Dispatched',
        message: `A password reset link has been emailed to ${targetUser.email}.`,
        variant: 'info',
      });
    } catch (err) {
      await showAlert({
        title: 'Password Reset Error',
        message: err.message || 'Failed to send password reset email.',
        variant: 'error',
      });
    }
  };

  const handleRoleChange = async (targetUser, newRole) => {
    if (targetUser.id === user.id && newRole !== 'admin') {
      await showAlert({
        title: 'Action Prohibited',
        message: 'You cannot demote your own administrator account. Another admin must perform this action.',
        variant: 'error',
      });
      return;
    }

    if (newRole === 'admin') {
      const confirmed = await showConfirm({
        title: 'Elevate to Super-Admin',
        message: `Grant full Super-Admin privileges to ${targetUser.email}? They will gain complete access to sensitive platform metrics, user moderation, and promotional codes.`,
        confirmText: 'Grant Admin Privileges',
        confirmVariant: 'danger',
      });
      if (!confirmed) return;
    }

    const reason = await showPrompt({
      title: `Update Role to ${newRole.toUpperCase()}`,
      message: `Please enter an audit reason for changing the role of ${targetUser.email} to "${newRole}":`,
      defaultValue: newRole === 'admin' ? 'Promoted to platform administrator' : 'Role tier adjustment',
      confirmText: 'Confirm Role Change',
    });

    if (reason === null) return;

    try {
      const updated = await adminApi.updateRole(targetUser.id, { role: newRole, reason });
      setUsers((prev) => prev.map((item) => (item.id === targetUser.id ? { ...item, ...updated } : item)));
      const freshLogs = await adminApi.listAuditLogs().catch(() => []);
      setAuditLogs(freshLogs);
      await showAlert({
        title: 'Role Updated',
        message: `Role for ${targetUser.email} changed to ${newRole}.`,
        variant: 'info',
      });
    } catch (err) {
      await showAlert({
        title: 'Role Update Error',
        message: err.message || 'Failed to change role.',
        variant: 'error',
      });
    }
  };

  const handleSubscriptionTierChange = async (targetUser, newTier) => {
    const reason = await showPrompt({
      title: `Update Subscription to ${newTier.toUpperCase()}`,
      message: `Enter an audit reason for updating ${targetUser.email}'s plan tier to "${newTier}":`,
      defaultValue: `Admin manually adjusted tier to ${newTier}`,
      confirmText: 'Update Plan Tier',
    });

    if (reason === null) return;

    try {
      const updated = await adminApi.updateSubscriptionTier(targetUser.id, { subscription_tier: newTier, reason });
      setUsers((prev) => prev.map((item) => (item.id === targetUser.id ? { ...item, ...updated } : item)));
      const freshLogs = await adminApi.listAuditLogs().catch(() => []);
      setAuditLogs(freshLogs);
      await showAlert({
        title: 'Subscription Tier Updated',
        message: `Subscription for ${targetUser.email} set to ${newTier.toUpperCase()}.`,
        variant: 'info',
      });
    } catch (err) {
      await showAlert({
        title: 'Tier Update Error',
        message: err.message || 'Failed to update subscription tier.',
        variant: 'error',
      });
    }
  };

  const handleCreatePromo = async (e) => {
    e.preventDefault();
    if (!newCode.trim()) return;

    setCreatingPromo(true);
    setPromoSuccessMsg('');
    try {
      const created = await adminApi.createPromoCode({
        code: newCode.trim(),
        grantTier,
        grantUnlimited,
        grantCredits: grantUnlimited ? null : Number(grantCredits),
        maxUses: Number(maxUses),
      });
      setNewCode('');
      setPromoSuccessMsg(`Promo code "${created.code}" created successfully!`);
      const [updatedPromos, freshLogs] = await Promise.all([
        adminApi.listPromoCodes(),
        adminApi.listAuditLogs().catch(() => []),
      ]);
      setPromoCodes(updatedPromos);
      setAuditLogs(freshLogs);
    } catch (err) {
      await showAlert({
        title: 'Promo Creation Error',
        message: err.message || 'Failed to create promo code.',
        variant: 'error',
      });
    } finally {
      setCreatingPromo(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setCreateUserError('');
    setCreatingUser(true);

    try {
      if (!userFormData.email || !userFormData.password || !userFormData.username) {
        throw new Error('Email, username, and password are required.');
      }
      if (userFormData.password.length < 6) {
        throw new Error('Password must be at least 6 characters.');
      }
      if (!isValidPhoneNumber(userFormData.phoneNumber)) {
        throw new Error('Please enter a valid 10-digit phone number.');
      }

      const res = await adminApi.createUser({
        email: userFormData.email.trim(),
        password: userFormData.password,
        username: userFormData.username.trim(),
        firstName: userFormData.firstName.trim(),
        lastName: userFormData.lastName.trim(),
        phoneNumber: userFormData.phoneNumber.trim(),
        companyName: userFormData.companyName.trim(),
        role: userFormData.role,
        subscriptionTier: userFormData.subscriptionTier,
        hasUnlimitedBypass: userFormData.hasUnlimitedBypass,
        isTestUser: userFormData.isTestUser,
        trialUsesRemaining: parseInt(userFormData.trialUsesRemaining, 10) || 0,
        reason: userFormData.reason || 'Admin created account from portal',
      });

      setShowCreateUserModal(false);
      setUserFormData({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        companyName: '',
        role: 'user',
        subscriptionTier: 'free',
        hasUnlimitedBypass: false,
        isTestUser: false,
        trialUsesRemaining: 5,
        reason: 'Admin created account',
      });

      await showAlert({
        title: 'Account Created Successfully',
        message: `User "${res.user?.username || res.user?.email}" has been created with role "${res.user?.role || 'user'}" and subscription tier "${(res.user?.subscription_tier || 'free').toUpperCase()}".`,
        variant: 'info',
      });

      // Refresh data
      fetchData();
    } catch (err) {
      setCreateUserError(err.message || 'Failed to create user account');
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredUsers = users
    .filter((u) => {
      const q = searchTerm.toLowerCase();
      return (
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.first_name && u.first_name.toLowerCase().includes(q)) ||
        (u.last_name && u.last_name.toLowerCase().includes(q)) ||
        (u.company_name && u.company_name.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      const aIsPatty =
        (a.username && a.username.toLowerCase() === 'patty_g7') ||
        (a.email && a.email.toLowerCase().includes('patty_g7')) ||
        (a.email && a.email.toLowerCase().includes('pattygsocials@gmail.com'));
      const bIsPatty =
        (b.username && b.username.toLowerCase() === 'patty_g7') ||
        (b.email && b.email.toLowerCase().includes('patty_g7')) ||
        (b.email && b.email.toLowerCase().includes('pattygsocials@gmail.com'));
      if (aIsPatty && !bIsPatty) return -1;
      if (!aIsPatty && bIsPatty) return 1;
      return 0;
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium text-slate-400">Loading Super-Admin Portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚡</span>
              <h1 className="text-2xl font-black tracking-tight text-white">Super-Admin Platform Portal</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Security &amp; Audit Logs Active
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Live SaaS metrics, user bypass provisioning, immutable audit logging, and promo code management.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'users'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('promos')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'promos'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Promo Codes ({promoCodes.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                activeTab === 'audit'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Audit Trail ({auditLogs.length})
            </button>
            <button
              onClick={() => navigate(`/${user?.username || ''}`)}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl border border-slate-700 transition ml-2"
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 border border-red-500/50 text-red-300 text-xs rounded-2xl">
            ✕ {error}
          </div>
        )}

        {/* High-Level Metric Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Registered Users
              </span>
              <div className="text-3xl font-black text-white">{formatNumber(stats.totalUsers, 0)}</div>
              <span className="text-[11px] text-emerald-400 mt-1 block">
                +{stats.newSignupsWeek} new signups this week
              </span>
            </div>

            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Estimated Active MRR
              </span>
              <div className="text-3xl font-black text-emerald-400">
                {formatCurrency(stats.estimatedMRR)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {stats.activeSubscriptionsCount} active paid subscriptions
              </span>
            </div>

            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Projects &amp; Estimates
              </span>
              <div className="text-3xl font-black text-indigo-400">
                {formatNumber(stats.totalProjects, 0)}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {stats.totalEstimates} versions computed
              </span>
            </div>

            <div className="bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-lg">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Client Proposals &amp; E-Signs
              </span>
              <div className="text-3xl font-black text-cyan-400">
                {formatNumber(stats.totalProposals, 0)}
              </div>
              <span className="text-[11px] text-emerald-400 mt-1 block">
                ✓ {stats.signedProposals} proposals signed &amp; accepted
              </span>
            </div>
          </div>
        )}

        {/* Active Tab Content */}
        {activeTab === 'users' && (
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white">Registered Users ({users.length})</h2>
                <p className="text-xs text-slate-400">Search users, elevate roles, grant VIP bypasses, create new accounts, or add export credits.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="w-full sm:w-72">
                  <input
                    type="text"
                    placeholder="Search by name, email, or username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  onClick={() => {
                    setCreateUserError('');
                    setShowCreateUserModal(true);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 shadow-lg shadow-indigo-600/20 whitespace-nowrap cursor-pointer"
                >
                  <span>+</span> Create User Account
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-2xl">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 text-left">User</th>
                    <th className="py-3 px-4 text-left">Role</th>
                    <th className="py-3 px-4 text-left">Plan / Tier</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Trial Credits</th>
                    <th className="py-3 px-4 text-center">VIP Bypass</th>
                    <th className="py-3 px-4 text-left">Joined</th>
                    <th className="py-3 px-4 text-right">Moderation Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {filteredUsers.map((u) => {
                    const isSuspended = u.is_disabled || u.status === 'suspended' || u.status === 'disabled';
                    const isLocked = u.locked_until && new Date(u.locked_until).getTime() > Date.now();
                    const isTest = u.is_test_user || ['free_user', 'standard_user', 'pro_user', 'enterprise_user'].includes(u.username);
                    return (
                      <tr key={u.id} className={`hover:bg-slate-800/30 ${isSuspended ? 'bg-red-950/20' : isLocked ? 'bg-amber-950/20' : ''}`}>
                        <td className="py-3 px-4 font-medium text-slate-200">
                          <div className="flex items-center gap-2">
                            <span className={isSuspended ? 'line-through text-slate-400' : ''}>
                              @{u.username || 'user'}
                            </span>
                            {u.id === user?.id && (
                              <span className="px-1.5 py-0.2 bg-indigo-500/20 text-indigo-300 text-[10px] rounded font-bold border border-indigo-500/30">
                                YOU
                              </span>
                            )}
                            {isLocked && (
                              <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 text-[10px] rounded font-bold border border-amber-500/30" title={`Locked until ${new Date(u.locked_until).toLocaleTimeString()} (5 failed attempts)`}>
                                🔒 LOCKED
                              </span>
                            )}
                            {isTest && (
                              <span className="px-1.5 py-0.2 bg-cyan-500/20 text-cyan-300 text-[10px] rounded font-bold border border-cyan-500/30" title="Test user - excluded from estimated MRR">
                                TEST USER
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400">{u.email}</div>
                          {u.company_name && (
                            <div className="text-[10px] text-indigo-400">🏢 {u.company_name}</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={u.role || 'user'}
                            disabled={u.id === user?.id}
                            onChange={(e) => handleRoleChange(u, e.target.value)}
                            className={`bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                              u.id === user?.id ? 'opacity-60 cursor-not-allowed' : ''
                            }`}
                          >
                            <option value="user">User</option>
                            <option value="payment_exempt">Payment Exempt (VIP)</option>
                            <option value="admin">Super-Admin</option>
                          </select>
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={u.subscription_tier || 'free'}
                            onChange={(e) => handleSubscriptionTierChange(u, e.target.value)}
                            className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                          >
                            <option value="free">Free ($0)</option>
                            <option value="starter">Starter (${STARTER_MONTHLY_PRICE})</option>
                            <option value="pro">Pro (${PRO_MONTHLY_PRICE})</option>
                            <option value="enterprise">Enterprise (${ENTERPRISE_MONTHLY_PRICE})</option>
                          </select>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              isSuspended
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : isLocked
                                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {isSuspended ? 'Suspended' : isLocked ? 'Locked' : 'Active'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-slate-200">
                          {u.has_unlimited_bypass || (u.subscription_tier && u.subscription_tier !== 'free') ? (
                            <span className="text-emerald-400 font-mono text-base font-black cursor-default" title="Unlimited access (paid tier or VIP bypass)">
                              ∞
                            </span>
                          ) : (
                            <button
                              type="button"
                              title="Click to edit free trial credits"
                              onClick={() => handleSetCredits(u)}
                              className="inline-flex items-center justify-center gap-1 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white border border-slate-700 hover:border-indigo-500/50 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              <span>{u.trial_uses_remaining ?? 5}</span>
                              <span className="text-[10px] text-slate-400">✎</span>
                            </button>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleBypass(u)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] uppercase transition ${
                              u.has_unlimited_bypass
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                            }`}
                          >
                            {u.has_unlimited_bypass ? '✓ Active' : 'Disabled'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            <button
                              type="button"
                              title={isTest ? 'Unmark Test User' : 'Mark as Test User (exclude from MRR)'}
                              onClick={() => handleToggleTestUser(u)}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold border transition ${
                                isTest
                                  ? 'bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border-cyan-500/40'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-400 border-slate-700'
                              }`}
                            >
                              {isTest ? '🧪 Test' : 'Live'}
                            </button>
                            <button
                              type="button"
                              title="Dispatch Password Reset Link"
                              onClick={() => handleResetPassword(u)}
                              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-semibold transition"
                            >
                              🔑 Reset
                            </button>
                            {isLocked && (
                              <button
                                type="button"
                                title="Unlock account & clear failed attempts"
                                onClick={() => handleUnlockAccount(u)}
                                className="px-2 py-1 bg-amber-900/40 hover:bg-amber-900/60 text-amber-300 border border-amber-500/50 rounded-lg text-xs font-semibold transition"
                              >
                                🔓 Unlock
                              </button>
                            )}
                            <button
                              type="button"
                              title={isSuspended ? 'Reactivate Account' : 'Suspend Account'}
                              disabled={u.id === user?.id}
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2 py-1 rounded-lg text-xs font-semibold border transition ${
                                isSuspended
                                  ? 'bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 border-emerald-600/50'
                                  : 'bg-red-900/30 hover:bg-red-900/50 text-red-300 border-red-500/40'
                              } ${u.id === user?.id ? 'opacity-40 cursor-not-allowed' : ''}`}
                            >
                              {isSuspended ? 'Activate' : 'Suspend'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'promos' && (
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 space-y-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Promo Codes &amp; Campaign Generator</h2>
                <p className="text-xs text-slate-400">Create shareable discount &amp; VIP trial codes for promotional campaigns.</p>
              </div>
            </div>

            {promoSuccessMsg && (
              <div className="p-3 bg-emerald-900/30 border border-emerald-500/50 text-emerald-300 text-xs rounded-xl">
                ✓ {promoSuccessMsg}
              </div>
            )}

            {/* New Promo Form */}
            <form onSubmit={handleCreatePromo} className="bg-slate-800/40 p-4 rounded-2xl border border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Code String</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. VIP2026"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white uppercase font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Grant Tier</label>
                <select
                  value={grantTier}
                  onChange={(e) => setGrantTier(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="pro">Pro Plan</option>
                  <option value="starter">Starter Plan</option>
                  <option value="enterprise">Enterprise Plan</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Max Redemptions</label>
                <input
                  type="number"
                  min="1"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pb-2">
                <input
                  type="checkbox"
                  id="grantUnlimited"
                  checked={grantUnlimited}
                  onChange={(e) => setGrantUnlimited(e.target.checked)}
                  className="rounded border-slate-700 text-indigo-600 focus:ring-indigo-500"
                />
                <label htmlFor="grantUnlimited" className="text-xs text-slate-300">
                  Unlimited VIP
                </label>
              </div>

              <button
                type="submit"
                disabled={creatingPromo || !newCode.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl disabled:opacity-50 shadow-lg shadow-indigo-600/30 transition"
              >
                {creatingPromo ? 'Creating...' : '+ Create Promo'}
              </button>
            </form>

            {/* Active Promo Codes Table */}
            <div className="overflow-x-auto border border-slate-800 rounded-2xl">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 text-left">Code</th>
                    <th className="py-3 px-4 text-left">Tier Granted</th>
                    <th className="py-3 px-4 text-center">Unlimited VIP</th>
                    <th className="py-3 px-4 text-center">Uses Left</th>
                    <th className="py-3 px-4 text-left">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {promoCodes.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">{p.code}</td>
                      <td className="py-3 px-4 uppercase text-slate-300 font-semibold">{p.grant_tier || 'Pro'}</td>
                      <td className="py-3 px-4 text-center">
                        {p.grant_unlimited ? (
                          <span className="text-emerald-400 font-bold">Yes (Unlimited)</span>
                        ) : (
                          <span className="text-slate-400">+{p.grant_credits} Credits</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-slate-200">
                        {(p.max_uses || 1) - (p.times_used || 0)} / {p.max_uses || 1}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="bg-slate-900/90 rounded-3xl border border-slate-800 p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Immutable Security Audit Trail ({auditLogs.length})</h2>
                <p className="text-xs text-slate-400">Comprehensive, tamper-proof logs of all administrative elevation and access modifications.</p>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-2xl">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 text-left">Timestamp</th>
                    <th className="py-3 px-4 text-left">Admin</th>
                    <th className="py-3 px-4 text-left">Target User</th>
                    <th className="py-3 px-4 text-left">Action</th>
                    <th className="py-3 px-4 text-left">Details &amp; Reason</th>
                    <th className="py-3 px-4 text-left">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 font-mono">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-sans text-xs">
                        No administrative audit logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30">
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-sans text-indigo-300 font-semibold">
                          {log.admin?.email || log.admin?.username || log.admin_id?.slice(0, 8)}
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-300">
                          {log.target_user?.email || log.target_user?.username || log.target_user_id?.slice(0, 8) || '— (System/Promo)'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/30">
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-sans text-slate-300 max-w-xs truncate text-[11px]">
                          {log.details?.reason ? (
                            <span className="text-slate-200 font-medium">"{log.details.reason}"</span>
                          ) : (
                            <span className="text-slate-400">{JSON.stringify(log.details)}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px]">
                          {log.ip_address || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create User Account Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-indigo-400">👤</span> Create New User Account
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Provision a new user account with custom credentials, role, and subscription tier.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="text-slate-400 hover:text-white text-lg px-2.5 py-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            {createUserError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <span>⚠️</span> {createUserError}
              </div>
            )}

            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Username <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. john_doe"
                    value={userFormData.username}
                    onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. john@company.com"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password <span className="text-red-400">*</span> (min. 6 characters)
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">First Name</label>
                  <input
                    type="text"
                    placeholder="e.g. John"
                    value={userFormData.firstName}
                    onChange={(e) => setUserFormData({ ...userFormData, firstName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Last Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Doe"
                    value={userFormData.lastName}
                    onChange={(e) => setUserFormData({ ...userFormData, lastName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Company Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Acme Construction"
                    value={userFormData.companyName}
                    onChange={(e) => setUserFormData({ ...userFormData, companyName: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="e.g. (555) 000-0000"
                    value={userFormData.phoneNumber}
                    onChange={(e) => setUserFormData({ ...userFormData, phoneNumber: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Account Role</label>
                  <select
                    value={userFormData.role}
                    onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="user">User (Standard)</option>
                    <option value="admin">Super-Admin</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Subscription Tier</label>
                  <select
                    value={userFormData.subscriptionTier}
                    onChange={(e) => setUserFormData({ ...userFormData, subscriptionTier: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="free">Free ($0/mo)</option>
                    <option value="starter">Starter (${STARTER_MONTHLY_PRICE}/mo)</option>
                    <option value="pro">Pro (${PRO_MONTHLY_PRICE}/mo)</option>
                    <option value="enterprise">Enterprise (${ENTERPRISE_MONTHLY_PRICE}/mo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Trial Credits</label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={userFormData.trialUsesRemaining}
                    onChange={(e) => setUserFormData({ ...userFormData, trialUsesRemaining: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="hasUnlimitedBypass"
                  checked={userFormData.hasUnlimitedBypass}
                  onChange={(e) => setUserFormData({ ...userFormData, hasUnlimitedBypass: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                />
                <label htmlFor="hasUnlimitedBypass" className="text-xs text-slate-300 cursor-pointer select-none">
                  <span className="font-semibold text-amber-400">Grant VIP Unlimited Bypass</span> — exempts user from all trial meter deductions and subscription checks.
                </label>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="isTestUser"
                  checked={userFormData.isTestUser}
                  onChange={(e) => setUserFormData({ ...userFormData, isTestUser: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-800 border-slate-700"
                />
                <label htmlFor="isTestUser" className="text-xs text-slate-300 cursor-pointer select-none">
                  <span className="font-semibold text-cyan-400">Mark as Test User</span> — excludes account from Estimated Active MRR & subscription metrics.
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Audit Log Reason</label>
                <input
                  type="text"
                  placeholder="Reason for creating this account"
                  value={userFormData.reason}
                  onChange={(e) => setUserFormData({ ...userFormData, reason: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-indigo-600/20 flex items-center gap-2 cursor-pointer"
                >
                  {creatingUser ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating Account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
