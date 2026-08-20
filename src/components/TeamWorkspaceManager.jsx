import React, { useState, useEffect } from 'react';
import { organizationsApi } from '../lib/organizations';
import { useAuth } from '../context/AuthContext';
import { useModal } from '../context/ModalContext';

export default function TeamWorkspaceManager() {
  const { user } = useAuth();
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

  const isEnterpriseOrTeam =
    user?.role === 'admin' ||
    user?.role === 'payment_exempt' ||
    user?.has_unlimited_bypass === true ||
    user?.subscription_tier === 'enterprise' ||
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
      await organizationsApi.inviteMember(activeOrg.id, {
        email: inviteEmail.trim(),
        role: inviteRole,
      });
      setInviteEmail('');
      setSuccessMsg(`Invited ${inviteEmail} to ${activeOrg.name}`);
      await selectOrganization(activeOrg.id);
    } catch (err) {
      setError(err.message || 'Failed to invite team member.');
    } finally {
      setInviting(false);
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
            👑 Multi-user team workspaces require the <strong>Enterprise / Team ($149.99/mo + tax)</strong> tier.
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
                      <span
                        className={`px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase ${
                          m.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {m.role !== 'owner' && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id)}
                          className="text-red-500 hover:text-red-700 font-semibold text-xs"
                        >
                          Remove
                        </button>
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
    </div>
  );
}
