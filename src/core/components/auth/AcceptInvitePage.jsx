import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/core/components/context/AuthContext';
import { useModal } from '@/core/components/context/ModalContext';
import { useTranslation } from '@/core/components/context/I18nContext';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function AcceptInvitePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, token: authToken, refreshProfile } = useAuth();
  const { showAlert } = useModal();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(true);
  const [inviteData, setInviteData] = useState(null);
  const [error, setError] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [success, setSuccess] = useState(false);

  // 1. Verify invitation token on mount
  useEffect(() => {
    async function verifyToken() {
      if (!token) {
        setError(t('core.acceptInvite.noTokenError'));
        setVerifying(false);
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/organizations/invitations/verify?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || t('core.acceptInvite.verifyFailedError'));
        }
        setInviteData(data.invitation);
      } catch (err) {
        setError(err.message || t('core.acceptInvite.invalidOrExpiredToken'));
      } finally {
        setVerifying(false);
        setLoading(false);
      }
    }

    verifyToken();
  }, [token, t]);

  // 2. Handle accepting invitation
  const handleAcceptInvite = async () => {
    if (!authToken) {
      // Prompt user to login or signup with this token saved
      sessionStorage.setItem('pending_invite_token', token);
      navigate('/login');
      return;
    }

    setAccepting(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/organizations/invitations/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t('core.acceptInvite.acceptFailedError'));
      }

      setSuccess(true);
      if (refreshProfile) await refreshProfile();
      sessionStorage.removeItem('pending_invite_token');

      await showAlert({
        title: t('core.acceptInvite.teamJoinedTitle'),
        message: t('core.acceptInvite.teamJoinedMessage', { orgName: data.organizationName || t('core.acceptInvite.workspaceFallback') }),
        variant: 'success',
      });

      navigate(user?.username ? `/${user.username}` : '/login');
    } catch (err) {
      setError(err.message || t('core.acceptInvite.acceptFailedError'));
    } finally {
      setAccepting(false);
    }
  };

  if (loading || verifying) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 text-sm font-medium">{t('core.acceptInvite.verifyingInvitation')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 sm:p-8 text-center shadow-2xl space-y-4">
          <div className="w-14 h-14 bg-red-500/10 text-red-400 rounded-2xl flex items-center justify-center mx-auto text-2xl font-bold border border-red-500/20">
            ✕
          </div>
          <h2 className="text-xl font-bold text-white">{t('core.acceptInvite.invitationInvalidOrExpired')}</h2>
          <p className="text-sm text-slate-400">{error}</p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition"
            >
              {t('core.acceptInvite.returnToTakeoffEngine')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const roleLabel =
    inviteData?.role === 'admin'
      ? t('core.acceptInvite.roleAdmin')
      : inviteData?.role === 'viewer'
      ? t('core.acceptInvite.roleViewer')
      : t('core.acceptInvite.roleEstimator');

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-slate-800/90 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl backdrop-blur relative">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto text-3xl font-bold border border-indigo-500/20 mb-3 shadow-inner">
            🤝
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950/80 border border-indigo-800 px-3 py-1 rounded-full">
            {t('core.acceptInvite.workspaceInvitation')}
          </span>
          <h1 className="text-2xl font-black text-white mt-3">
            {t('core.acceptInvite.joinOrg', { orgName: inviteData?.organizationName })}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {t('core.acceptInvite.invitedBy')}{' '}
            <strong className="text-slate-200">{inviteData?.inviterName}</strong>
          </p>
        </div>

        {/* Invite Details Card */}
        <div className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 mb-6 space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-2">
            <span>{t('core.acceptInvite.invitedEmail')}</span>
            <span className="font-mono text-slate-200 font-semibold">{inviteData?.email}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400 border-b border-slate-800 pb-2">
            <span>{t('core.acceptInvite.assignedRole')}</span>
            <span className="font-semibold text-indigo-300">{roleLabel}</span>
          </div>
          <div className="flex justify-between items-center text-slate-400">
            <span>{t('core.acceptInvite.workspace')}</span>
            <span className="font-semibold text-white">{inviteData?.organizationName}</span>
          </div>
        </div>

        <div className="space-y-3">
          {user ? (
            <div className="space-y-2">
              <p className="text-xs text-slate-400 text-center">
                {t('core.acceptInvite.signedInAs')}{' '}
                <strong className="text-white">{user.email}</strong>
              </p>
              <button
                type="button"
                onClick={handleAcceptInvite}
                disabled={accepting}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
              >
                {accepting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t('core.acceptInvite.joiningWorkspace')}</span>
                  </>
                ) : (
                  <span>{t('core.acceptInvite.acceptAndJoin')}</span>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-400 text-center">
                {t('core.acceptInvite.signInPrompt')}
              </p>
              <button
                type="button"
                onClick={handleAcceptInvite}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition"
              >
                {t('core.acceptInvite.signInToAccept')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
