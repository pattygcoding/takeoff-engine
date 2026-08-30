import React, { useState, useEffect } from 'react';
import { organizationsApi } from '@/core/lib/auth/organizations';
import { billingApi } from '@/core/lib/billing/billing';
import { useAuth } from '@/core/components/context/AuthContext';
import { useModal } from '@/core/components/context/ModalContext';
import { useTranslation } from '@/core/components/context/I18nContext';
import {
  ENTERPRISE_MONTHLY_PRICE,
  EXTRA_SEAT_MONTHLY_PRICE,
  ENTERPRISE_PLAN_SEATS,
} from '@/core/constants';

export default function TeamWorkspaceManager() {
  const { user, refreshProfile } = useAuth();
  const { showAlert, showConfirm } = useModal();
  const { t } = useTranslation();
  const [organizations, setOrganizations] = useState([]);
  const [activeOrg, setActiveOrg] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Create Org Modal / Form
  const [newOrgName, setNewOrgName] = useState('');
  const [creatingOrg, setCreatingOrg] = useState(false);

  // Invite Member Form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('estimator');
  const [inviting, setInviting] = useState(false);

  // Seat Management Modal / State
  const [seatModalOpen, setSeatModalOpen] = useState(false);
  const [targetAddSeats, setTargetAddSeats] = useState(0);
  const [updatingSeats, setUpdatingSeats] = useState(false);

  const tier = user?.subscription_tier || 'free';
  const baseSeats = tier === 'enterprise' ? 8 : tier === 'pro' ? 3 : 1;
  const currentAddSeats = user?.additional_seats || 0;
  const currentTotalSeats = user?.seat_limit || (baseSeats + currentAddSeats);

  const isEnterpriseOrTeam =
    user?.role === 'admin' ||
    user?.role === 'payment_exempt' ||
    user?.has_unlimited_bypass === true ||
    user?.subscription_tier === 'enterprise' ||
    user?.subscription_tier === 'pro' ||
    user?.subscription_tier === 'team';

  useEffect(() => {
    loadOrganizations();
  }, []);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      setError('');
      const list = await organizationsApi.list();
      setOrganizations(list);
      if (list.length > 0) {
        selectOrganization(list[0].id);
      }
    } catch (err) {
      setError(err.message || t('core.teamWorkspaceManager.failedLoadWorkspaces'));
    } finally {
      setLoading(false);
    }
  };

  const selectOrganization = async (orgId) => {
    try {
      const data = await organizationsApi.get(orgId);
      setActiveOrg(data.organization);
      setMembers(data.members || []);
    } catch (err) {
      setError(err.message || t('core.teamWorkspaceManager.failedFetchDetails'));
    }
  };

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    setCreatingOrg(true);
    setError('');
    setSuccessMsg('');

    try {
      const newOrg = await organizationsApi.create({ name: newOrgName.trim() });
      setNewOrgName('');
      setSuccessMsg(t('core.teamWorkspaceManager.createdOrgSuccess', { name: newOrg.name }));
      await loadOrganizations();
      await selectOrganization(newOrg.id);
    } catch (err) {
      setError(err.message || t('core.teamWorkspaceManager.failedCreateWorkspace'));
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleInviteMember = async (e) => {
    e.preventDefault();
    if (!activeOrg || !inviteEmail.trim()) return;

    setInviting(true);
    setError('');
    setSuccessMsg('');

    try {
      const res = await organizationsApi.inviteMember(activeOrg.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      setSuccessMsg(t('core.teamWorkspaceManager.inviteSentSuccess', { email: inviteEmail }));
      await selectOrganization(activeOrg.id);
    } catch (err) {
      setError(err.message || t('core.teamWorkspaceManager.failedInviteMember'));
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (memberId, targetEmail) => {
    if (!activeOrg) return;
    try {
      const res = await organizationsApi.resendInvite(activeOrg.id, memberId);
      await showAlert({
        title: t('core.teamWorkspaceManager.inviteResentTitle'),
        message: res.message || t('core.teamWorkspaceManager.inviteResentMessage', { email: targetEmail }),
        variant: 'success',
      });
      await selectOrganization(activeOrg.id);
    } catch (err) {
      await showAlert({
        title: t('core.teamWorkspaceManager.resendFailedTitle'),
        message: err.message || t('core.teamWorkspaceManager.resendFailedMessage'),
        variant: 'error',
      });
    }
  };

  const handleRevokeInvite = async (memberId) => {
    if (!activeOrg) return;
    const confirmed = await showConfirm({
      title: t('core.teamWorkspaceManager.revokeInviteTitle'),
      message: t('core.teamWorkspaceManager.revokeInviteMessage'),
      confirmText: t('core.teamWorkspaceManager.revokeInviteButton'),
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    try {
      await organizationsApi.revokeInvite(activeOrg.id, memberId);
      setSuccessMsg(t('core.teamWorkspaceManager.inviteRevoked'));
      await selectOrganization(activeOrg.id);
    } catch (err) {
      await showAlert({
        title: t('core.teamWorkspaceManager.revokeErrorTitle'),
        message: err.message || t('core.teamWorkspaceManager.revokeErrorMessage'),
        variant: 'error',
      });
    }
  };

  const handleCopyInviteLink = async (rawToken) => {
    if (!rawToken) return;
    const link = `${window.location.origin}/accept-invite?token=${rawToken}`;
    try {
      await navigator.clipboard.writeText(link);
      await showAlert({
        title: t('core.teamWorkspaceManager.linkCopiedTitle'),
        message: t('core.teamWorkspaceManager.linkCopiedMessage'),
        variant: 'success',
      });
    } catch (err) {
      await showAlert({
        title: t('core.teamWorkspaceManager.copyFailedTitle'),
        message: link,
        variant: 'info',
      });
    }
  };

  const handleOpenSeatModal = () => {
    setTargetAddSeats(currentAddSeats);
    setSeatModalOpen(true);
  };

  const handleSaveSeats = async () => {
    setUpdatingSeats(true);
    try {
      const res = await billingApi.updateSeats(targetAddSeats, activeOrg?.id);
      if (refreshProfile) await refreshProfile();
      await showAlert({
        title: t('core.teamWorkspaceManager.seatsUpdatedTitle'),
        message: res.message || t('core.teamWorkspaceManager.seatsUpdatedMessage'),
        variant: 'success',
      });
      setSeatModalOpen(false);
      await loadOrganizations();
      if (activeOrg) await selectOrganization(activeOrg.id);
    } catch (err) {
      await showAlert({
        title: t('core.teamWorkspaceManager.seatsUpdateErrorTitle'),
        message: err.message || t('core.teamWorkspaceManager.seatsUpdateErrorMessage'),
        variant: 'error',
      });
    } finally {
      setUpdatingSeats(false);
    }
  };

  const handleUpdateRole = async (memberId, role) => {
    if (!activeOrg) return;
    try {
      await organizationsApi.updateMemberRole(activeOrg.id, memberId, role);
      await selectOrganization(activeOrg.id);
    } catch (err) {
      await showAlert({
        title: t('core.teamWorkspaceManager.updateRoleErrorTitle'),
        message: err.message || t('core.teamWorkspaceManager.updateRoleErrorMessage'),
        variant: 'error',
      });
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!activeOrg) return;
    const confirmed = await showConfirm({
      title: t('core.teamWorkspaceManager.removeMemberTitle'),
      message: t('core.teamWorkspaceManager.removeMemberMessage'),
      confirmText: t('core.teamWorkspaceManager.removeMemberButton'),
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    try {
      await organizationsApi.removeMember(activeOrg.id, memberId);
      await selectOrganization(activeOrg.id);
    } catch (err) {
      await showAlert({
        title: t('core.teamWorkspaceManager.removeErrorTitle'),
        message: err.message || t('core.teamWorkspaceManager.removeErrorMessage'),
        variant: 'error',
      });
    }
  };

  const isOwnerOfActiveOrg = activeOrg?.owner_id === user?.id;
  const otherOccupiedMembers = members.filter(
    (m) => m.role !== 'owner' && m.user_id !== user?.id && (m.status === 'active' || m.status === 'pending')
  );
  const canDeleteActiveOrg = isOwnerOfActiveOrg && otherOccupiedMembers.length === 0;

  const handleDeleteOrg = async () => {
    if (!activeOrg) return;

    if (!canDeleteActiveOrg) {
      await showAlert({
        title: t('core.teamWorkspaceManager.deleteOrgErrorTitle'),
        message: t('core.teamWorkspaceManager.cannotDeleteOrgOccupied'),
        variant: 'error',
      });
      return;
    }

    const confirmed = await showConfirm({
      title: t('core.teamWorkspaceManager.deleteOrgTitle'),
      message: t('core.teamWorkspaceManager.deleteOrgMessage', { name: activeOrg.name }),
      confirmText: t('core.teamWorkspaceManager.deleteOrgConfirmButton'),
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    try {
      const orgName = activeOrg.name;
      await organizationsApi.delete(activeOrg.id);
      setSuccessMsg(t('core.teamWorkspaceManager.deleteOrgSuccess', { name: orgName }));
      setActiveOrg(null);
      setMembers([]);
      await loadOrganizations();
    } catch (err) {
      await showAlert({
        title: t('core.teamWorkspaceManager.deleteOrgErrorTitle'),
        message: err.message || t('core.teamWorkspaceManager.deleteOrgErrorMessage'),
        variant: 'error',
      });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 text-slate-900 dark:text-slate-100">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('core.teamWorkspaceManager.title')}</h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t('core.teamWorkspaceManager.collaborate')}
          </p>
        </div>

        {!isEnterpriseOrTeam && (
          <div className="text-xs bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-700 px-3 py-1.5 rounded-xl">
            👑 {t('core.teamWorkspaceManager.requiresEnterprise', { price: ENTERPRISE_MONTHLY_PRICE })}
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs rounded-xl">
          ✕ {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs rounded-xl">
          ✓ {successMsg}
        </div>
      )}

      {/* Organizations Switcher / Creation */}
      <div className="flex flex-wrap gap-2 items-center">
        {organizations.map((org) => (
          <button
            key={org.id}
            type="button"
            onClick={() => selectOrganization(org.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer ${
              activeOrg?.id === org.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            🏢 {org.name} ({org.active_member_count || 1}/{org.max_seats} Seats)
          </button>
        ))}

        {isEnterpriseOrTeam && (
          <form onSubmit={handleCreateOrg} className="flex items-center gap-2">
            <input
              type="text"
              placeholder={t('core.teamWorkspaceManager.newOrgPlaceholder')}
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={creatingOrg || !newOrgName.trim()}
              className="px-3 py-1.5 bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition cursor-pointer"
            >
              {creatingOrg ? t('core.teamWorkspaceManager.creating') : t('core.teamWorkspaceManager.createOrgButton')}
            </button>
          </form>
        )}
      </div>

      {/* Active Organization Members & Invites */}
      {activeOrg ? (
        <div className="space-y-4 pt-2">
          {/* Seat Capacity & Utilization Banner */}
          <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('core.teamWorkspaceManager.subscriptionSeats')}
                </span>
                <span className="text-xs bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-bold px-2 py-0.5 rounded">
                  {tier.toUpperCase()} {t('core.teamWorkspaceManager.tier')}
                </span>
              </div>
              <div className="text-lg font-black text-slate-900 dark:text-white mt-1">
                {members.length} {t('core.teamWorkspaceManager.of')} {activeOrg.max_seats} {t('core.teamWorkspaceManager.seatsUsed')}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('core.teamWorkspaceManager.seatsBreakdown', { baseSeats, currentAddSeats, price: EXTRA_SEAT_MONTHLY_PRICE })}
              </p>
            </div>

            {isEnterpriseOrTeam && (
              <button
                type="button"
                onClick={handleOpenSeatModal}
                className="px-4 py-2 bg-slate-900 dark:bg-slate-700 hover:bg-slate-800 dark:hover:bg-slate-600 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>⚙️ {t('core.teamWorkspaceManager.manageSeatButton')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
              {t('core.teamWorkspaceManager.workspaceMembers')} ({members.length} / {activeOrg.max_seats} {t('core.teamWorkspaceManager.seatsUsed')})
            </h3>
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {t('core.teamWorkspaceManager.owner')}: {activeOrg.owner_email || t('core.teamWorkspaceManager.you')}
              </span>
              {canDeleteActiveOrg && (
                <button
                  type="button"
                  onClick={handleDeleteOrg}
                  className="px-2.5 py-1 text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-lg transition cursor-pointer"
                >
                  🗑️ {t('core.teamWorkspaceManager.deleteOrgButton')}
                </button>
              )}
            </div>
          </div>

          {/* Member List */}
          <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 text-left">{t('core.teamWorkspaceManager.member')}</th>
                  <th className="py-2.5 px-3 text-left">{t('core.teamWorkspaceManager.role')}</th>
                  <th className="py-2.5 px-3 text-left">{t('core.teamWorkspaceManager.status')}</th>
                  <th className="py-2.5 px-3 text-right">{t('core.teamWorkspaceManager.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                      <div>{m.user_email || m.invited_email}</div>
                      {m.first_name && (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">{m.first_name} {m.last_name}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {m.role === 'owner' ? (
                        <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-bold rounded-md">
                          {t('core.teamWorkspaceManager.roleOwner')}
                        </span>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                          className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="admin">{t('core.teamWorkspaceManager.roleAdmin')}</option>
                          <option value="estimator">{t('core.teamWorkspaceManager.roleEstimator')}</option>
                          <option value="viewer">{t('core.teamWorkspaceManager.roleViewer')}</option>
                        </select>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase ${
                            m.status === 'active'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : m.status === 'revoked'
                              ? 'bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                          }`}
                        >
                          {m.status}
                        </span>
                          {m.status === 'pending' && m.invite_token && (
                          <button
                            type="button"
                            onClick={() => handleCopyInviteLink(m.invite_token)}
                            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium underline cursor-pointer"
                            title={t('core.teamWorkspaceManager.copyMagicLinkTitle')}
                          >
                            {t('core.teamWorkspaceManager.copyLink')}
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {m.role !== 'owner' && (
                        <div className="flex items-center justify-end gap-2">
                          {m.status === 'pending' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleResendInvite(m.id, m.user_email || m.invited_email)}
                                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-semibold text-xs cursor-pointer"
                              >
                                {t('core.teamWorkspaceManager.resend')}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokeInvite(m.id)}
                                className="text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-semibold text-xs cursor-pointer"
                              >
                                {t('core.teamWorkspaceManager.revoke')}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-semibold text-xs cursor-pointer"
                          >
                            {t('core.teamWorkspaceManager.remove')}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Invite Form */}
          {members.length < activeOrg.max_seats && (
            <form onSubmit={handleInviteMember} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t('core.teamWorkspaceManager.inviteEmailLabel')}
                </label>
                <input
                  type="email"
                  required
                  placeholder="estimator@contractor.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="w-32">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  {t('core.teamWorkspaceManager.roleLabel')}
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="estimator">{t('core.teamWorkspaceManager.roleEstimator')}</option>
                  <option value="admin">{t('core.teamWorkspaceManager.roleAdmin')}</option>
                  <option value="viewer">{t('core.teamWorkspaceManager.roleViewer')}</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl disabled:opacity-50 shadow-xs transition cursor-pointer"
                >
                  {inviting ? t('core.teamWorkspaceManager.inviting') : t('core.teamWorkspaceManager.sendInviteButton')}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400 dark:text-slate-500 text-xs">
          {t('core.teamWorkspaceManager.noWorkspaces')}
        </div>
      )}

      {/* In-App Seat Manager Modal (US-037) */}
      {seatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full p-6 text-slate-800 dark:text-slate-100 relative">
            <button
              onClick={() => setSeatModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{t('core.teamWorkspaceManager.seatModalTitle')}</h3>
            <p
              className="text-xs text-slate-500 dark:text-slate-400 mb-4"
              dangerouslySetInnerHTML={{ __html: t('core.teamWorkspaceManager.seatModalDescription') }}
            />

            <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">{t('core.teamWorkspaceManager.basePlanSeatsLabel', { tier: tier.toUpperCase() })}:</span>
                <span className="font-bold text-slate-900 dark:text-white">{baseSeats} {t('core.teamWorkspaceManager.seats')}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600 dark:text-slate-400">{t('core.teamWorkspaceManager.additionalSeatsLabel')}:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetAddSeats(Math.max(0, targetAddSeats - 1))}
                    disabled={targetAddSeats <= 0}
                    className="w-7 h-7 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 cursor-pointer text-slate-900 dark:text-slate-100"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-sm w-6 text-center text-slate-900 dark:text-white">{targetAddSeats}</span>
                  <button
                    type="button"
                    onClick={() => setTargetAddSeats(targetAddSeats + 1)}
                    className="w-7 h-7 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer text-slate-900 dark:text-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="border-t border-slate-200 dark:border-slate-700 pt-2 flex justify-between items-center text-sm font-bold">
                <span className="text-indigo-950 dark:text-indigo-300">{t('core.teamWorkspaceManager.newTotalCapacityLabel')}:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{baseSeats + targetAddSeats} {t('core.teamWorkspaceManager.seats')}</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSeatModalOpen(false)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl transition cursor-pointer"
              >
                {t('core.teamWorkspaceManager.cancelButton')}
              </button>
              <button
                type="button"
                onClick={handleSaveSeats}
                disabled={updatingSeats}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50 cursor-pointer"
              >
                {updatingSeats ? t('core.teamWorkspaceManager.savingSeats') : t('core.teamWorkspaceManager.saveUpdateBillingButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
