import React, { useState, useEffect } from 'react';
import { organizationsApi } from '@/lib/organizations';
import { billingApi } from '@/lib/billing';
import { useAuth } from '@/context/AuthContext';
import { useModal } from '@/context/ModalContext';

export default function TeamWorkspaceManager() {
  const { user, refreshProfile } = useAuth();
  const { showAlert, showConfirm } = useModal();
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
      setError(err.message || 'Failed to load team workspaces.');
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
      setError(err.message || 'Failed to fetch organization details.');
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
      setSuccessMsg(`Team workspace "${newOrg.name}" created!`);
      await loadOrganizations();
      await selectOrganization(newOrg.id);
    } catch (err) {
      setError(err.message || 'Failed to create workspace.');
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
      setSuccessMsg(`Invitation sent to ${inviteEmail}! (Invite link created)`);
      await selectOrganization(activeOrg.id);
    } catch (err) {
      setError(err.message || 'Failed to invite team member.');
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (memberId, targetEmail) => {
    if (!activeOrg) return;
    try {
      const res = await organizationsApi.resendInvite(activeOrg.id, memberId);
      await showAlert({
        title: 'Invite Resent',
        message: res.message || `Invitation resent to ${targetEmail}.`,
        variant: 'success',
      });
      await selectOrganization(activeOrg.id);
    } catch (err) {
      await showAlert({
        title: 'Resend Failed',
        message: err.message || 'Failed to resend invitation.',
        variant: 'error',
      });
    }
  };

  const handleRevokeInvite = async (memberId) => {
    if (!activeOrg) return;
    const confirmed = await showConfirm({
      title: 'Revoke Invitation',
      message: 'Are you sure you want to revoke this pending invitation? The invite link will no longer work.',
      confirmText: 'Revoke Invite',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    try {
      await organizationsApi.revokeInvite(activeOrg.id, memberId);
      setSuccessMsg('Invitation revoked.');
      await selectOrganization(activeOrg.id);
    } catch (err) {
      await showAlert({
        title: 'Revoke Error',
        message: err.message || 'Failed to revoke invitation.',
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
        title: 'Link Copied',
        message: 'Magic invitation link copied to clipboard!',
        variant: 'success',
      });
    } catch (err) {
      await showAlert({
        title: 'Copy Failed',
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
        title: 'Seats Updated',
        message: res.message || 'Team seats updated successfully.',
        variant: 'success',
      });
      setSeatModalOpen(false);
      await loadOrganizations();
      if (activeOrg) await selectOrganization(activeOrg.id);
    } catch (err) {
      await showAlert({
        title: 'Update Error',
        message: err.message || 'Failed to update seat count.',
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
        title: 'Update Error',
        message: err.message || 'Failed to update member role.',
        variant: 'error',
      });
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!activeOrg) return;
    const confirmed = await showConfirm({
      title: 'Remove Team Member',
      message: 'Are you sure you want to remove this team member?',
      confirmText: 'Remove',
      confirmVariant: 'danger',
    });
    if (!confirmed) return;

    try {
      await organizationsApi.removeMember(activeOrg.id, memberId);
      await selectOrganization(activeOrg.id);
    } catch (err) {
      await showAlert({
        title: 'Removal Error',
        message: err.message || 'Failed to remove team member.',
        variant: 'error',
      });
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-slate-900">Team Workspaces & Member Invites</h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Collaborate with junior estimators, project managers, and shared rate libraries.
          </p>
        </div>

        {!isEnterpriseOrTeam && (
          <div className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl">
            👑 Multi-user team workspaces require the <strong>Enterprise / Team ($199.99/mo + tax)</strong> tier.
          </div>
        )}
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          ✕ {error}
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl">
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
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeOrg?.id === org.id
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            🏢 {org.name} ({org.active_member_count || 1}/{org.max_seats} Seats)
          </button>
        ))}

        {isEnterpriseOrTeam && (
          <form onSubmit={handleCreateOrg} className="flex items-center gap-2">
            <input
              type="text"
              placeholder="New Company Workspace..."
              value={newOrgName}
              onChange={(e) => setNewOrgName(e.target.value)}
              className="px-3 py-1.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={creatingOrg || !newOrgName.trim()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-xl disabled:opacity-50 transition"
            >
              {creatingOrg ? 'Creating...' : '+ Create Workspace'}
            </button>
          </form>
        )}
      </div>

      {/* Active Organization Members & Invites */}
      {activeOrg ? (
        <div className="space-y-4 pt-2">
          {/* Seat Capacity & Utilization Banner */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Subscription Seat Capacity
                </span>
                <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">
                  {tier.toUpperCase()} TIER
                </span>
              </div>
              <div className="text-lg font-black text-slate-900 mt-1">
                {members.length} of {activeOrg.max_seats} Seats Used
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Includes {baseSeats} base plan seats + {currentAddSeats} extra seats ($29.99/mo each + tax).
              </p>
            </div>

            {isEnterpriseOrTeam && (
              <button
                type="button"
                onClick={handleOpenSeatModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition flex items-center gap-1.5"
              >
                <span>⚙️ Manage Seats</span>
              </button>
            )}
          </div>

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Workspace Members ({members.length} / {activeOrg.max_seats} seats used)
            </h3>
            <span className="text-xs text-slate-400">
              Owner: {activeOrg.owner_email || 'You'}
            </span>
          </div>

          {/* Member List */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 text-left">Member</th>
                  <th className="py-2.5 px-3 text-left">Role</th>
                  <th className="py-2.5 px-3 text-left">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      <div>{m.user_email || m.invited_email}</div>
                      {m.first_name && (
                        <div className="text-[11px] text-slate-400">{m.first_name} {m.last_name}</div>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      {m.role === 'owner' ? (
                        <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded-md">
                          Owner
                        </span>
                      ) : (
                        <select
                          value={m.role}
                          onChange={(e) => handleUpdateRole(m.id, e.target.value)}
                          className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="estimator">Estimator</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      )}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase ${
                            m.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : m.status === 'revoked'
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {m.status}
                        </span>
                        {m.status === 'pending' && m.invite_token && (
                          <button
                            type="button"
                            onClick={() => handleCopyInviteLink(m.invite_token)}
                            className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium underline"
                            title="Copy Magic Invite Link"
                          >
                            Copy Link
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
                                className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs"
                              >
                                Resend
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokeInvite(m.id)}
                                className="text-amber-600 hover:text-amber-800 font-semibold text-xs"
                              >
                                Revoke
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id)}
                            className="text-red-500 hover:text-red-700 font-semibold text-xs"
                          >
                            Remove
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
            <form onSubmit={handleInviteMember} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Invite Estimator by Email
                </label>
                <input
                  type="email"
                  required
                  placeholder="estimator@contractor.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="w-32">
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="estimator">Estimator</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl disabled:opacity-50 shadow-xs transition"
                >
                  {inviting ? 'Inviting...' : '+ Send Invite'}
                </button>
              </div>
            </form>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400 text-xs">
          No team workspace created yet. Create one above to begin collaborating.
        </div>
      )}

      {/* In-App Seat Manager Modal (US-037) */}
      {seatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-slate-800 relative">
            <button
              onClick={() => setSeatModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
            <h3 className="text-lg font-bold text-slate-900 mb-1">Adjust Team Seat Capacity</h3>
            <p className="text-xs text-slate-500 mb-4">
              Scale your team capacity. Additional seats are billed at <strong>+$29.99/mo each (+ tax)</strong> and prorated immediately on your subscription.
            </p>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Base Plan Seats ({tier.toUpperCase()}):</span>
                <span className="font-bold text-slate-900">{baseSeats} Seats</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-600">Additional Seats ($29.99/mo each):</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setTargetAddSeats(Math.max(0, targetAddSeats - 1))}
                    disabled={targetAddSeats <= 0}
                    className="w-7 h-7 rounded bg-white border border-slate-300 font-bold hover:bg-slate-100 disabled:opacity-40"
                  >
                    -
                  </button>
                  <span className="font-mono font-bold text-sm w-6 text-center">{targetAddSeats}</span>
                  <button
                    type="button"
                    onClick={() => setTargetAddSeats(targetAddSeats + 1)}
                    className="w-7 h-7 rounded bg-white border border-slate-300 font-bold hover:bg-slate-100"
                  >
                    +
                  </button>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-sm font-bold">
                <span className="text-indigo-950">New Total Capacity:</span>
                <span className="text-indigo-600 font-extrabold">{baseSeats + targetAddSeats} Seats</span>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setSeatModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSeats}
                disabled={updatingSeats}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {updatingSeats ? 'Saving Seats...' : 'Save & Update Billing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
