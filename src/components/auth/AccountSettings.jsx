import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/auth/auth';
import { billingApi } from '@/lib/billing/billing';
import { useModal } from '@/context/ModalContext';
import { useTranslation } from '@/context/I18nContext';
import { useNavigate } from 'react-router-dom';
import TeamWorkspaceManager from './TeamWorkspaceManager';
import UpgradeModal from '@/components/billing/UpgradeModal';

export default function AccountSettings() {
  const { user, setUser, logout, refreshProfile } = useAuth();
  const { showAlert } = useModal();
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');

  // Company Branding fields
  const [companyName, setCompanyName] = useState(user?.company_name || '');
  const [companyLogoUrl, setCompanyLogoUrl] = useState(user?.company_logo_url || '');
  const [companyAddress, setCompanyAddress] = useState(user?.company_address || '');
  const [licenseNumber, setLicenseNumber] = useState(user?.license_number || '');
  const [brandColor, setBrandColor] = useState(user?.brand_color || '#0284c7');

  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState('');

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

  // Billing & Subscription state (US-021)
  const [subDetails, setSubDetails] = useState(null);
  const [subLoading, setSubLoading] = useState(true);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('Project completed');
  const [cancelReasonDetails, setCancelReasonDetails] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [cancelMsg, setCancelMsg] = useState('');
  const [cancelErr, setCancelErr] = useState('');
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    loadSubscriptionDetails();
  }, [user]);

  const loadSubscriptionDetails = async () => {
    try {
      setSubLoading(true);
      const data = await billingApi.getSubscriptionDetails();
      setSubDetails(data);
    } catch (err) {
      console.warn('Could not load subscription details:', err.message);
    } finally {
      setSubLoading(false);
    }
  };

  const handleOpenCustomerPortal = async () => {
    try {
      setPortalLoading(true);
      const res = await billingApi.getCustomerPortal();
      if (res.portalUrl) {
        window.open(res.portalUrl, '_blank', 'noopener,noreferrer');
      } else {
        await showAlert({
          title: t('accountSettings.portalUnavailableTitle'),
          message: t('accountSettings.portalUnavailableMessage'),
          variant: 'error',
        });
      }
    } catch (err) {
      await showAlert({
        title: t('accountSettings.billingPortalErrorTitle'),
        message: err.message || t('accountSettings.billingPortalErrorMessage'),
        variant: 'error',
      });
    } finally {
      setPortalLoading(false);
    }
  };

  const handleCancelSubscription = async (e) => {
    e.preventDefault();
    setCancelLoading(true);
    setCancelErr('');
    setCancelMsg('');

    const fullReason = cancelReasonDetails.trim()
      ? `${cancelReason}: ${cancelReasonDetails.trim()}`
      : cancelReason;

    try {
      const res = await billingApi.cancelSubscription(fullReason);
      setCancelMsg(res.message);
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('takeoff_user', JSON.stringify(res.user));
      }
      if (refreshProfile) await refreshProfile();
      await loadSubscriptionDetails();
      setShowCancelModal(false);
      await showAlert({
        title: t('accountSettings.subscriptionCancelledTitle'),
        message: res.message || t('accountSettings.subscriptionCancelledMessage'),
        variant: 'info',
      });
    } catch (err) {
      setCancelErr(err.message || 'Failed to cancel subscription.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleRestoreSubscription = async () => {
    setRestoreLoading(true);
    try {
      const res = await billingApi.restoreSubscription();
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('takeoff_user', JSON.stringify(res.user));
      }
      if (refreshProfile) await refreshProfile();
      await loadSubscriptionDetails();
      await showAlert({
        title: t('accountSettings.restoreSubscriptionSuccessTitle', 'Subscription Restored'),
        message: res.message || t('accountSettings.restoreSubscriptionSuccessMsg', 'Your subscription has been successfully restored!'),
        variant: 'info',
      });
    } catch (err) {
      await showAlert({
        title: t('accountSettings.restoreSubscriptionFailedTitle', 'Failed to Restore'),
        message: err.message || 'Failed to restore subscription.',
        variant: 'danger',
      });
    } finally {
      setRestoreLoading(false);
    }
  };

  const isPaidOrExempt =
    user?.role === 'admin' ||
    user?.role === 'payment_exempt' ||
    user?.has_unlimited_bypass === true ||
    (user?.subscription_status === 'active' && ['starter', 'pro', 'enterprise'].includes(user?.subscription_tier));

  const isProOrExempt =
    user?.role === 'admin' ||
    user?.role === 'payment_exempt' ||
    user?.has_unlimited_bypass === true ||
    (user?.subscription_status === 'active' && ['pro', 'enterprise'].includes(user?.subscription_tier));

  const handleLogoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setLogoError('Image must be under 2MB.');
      return;
    }

    setLogoUploading(true);
    setLogoError('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result;
        try {
          const res = await authApi.uploadLogo(base64Data, file.name);
          setCompanyLogoUrl(res.logoUrl);
          if (res.user) {
            setUser(res.user);
            localStorage.setItem('takeoff_user', JSON.stringify(res.user));
          }
        } catch (uploadErr) {
          setLogoError(uploadErr.message || 'Logo upload failed.');
        } finally {
          setLogoUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setLogoError(err.message || 'Failed to read image.');
      setLogoUploading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileErr('');
    setProfileMsg('');
    setProfileLoading(true);

    try {
      const res = await authApi.updateProfile({
        firstName,
        lastName,
        phoneNumber,
        companyName,
        companyLogoUrl,
        companyAddress,
        licenseNumber,
        brandColor,
      });
      setProfileMsg(res.message || 'Profile & branding updated successfully.');
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

    if (!oldPassword) {
      setPasswordErr('Current password is required.');
      return;
    }

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
      const res = await authApi.updatePassword({ oldPassword, newPassword });
      setPasswordMsg(res.message || 'Password updated successfully.');
      setOldPassword('');
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
          <h1 className="text-2xl font-bold text-slate-900">{t('accountSettings.title')}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('accountSettings.subtitle')}
          </p>
        </div>
        <button
          onClick={() => navigate(`/${user?.username}`)}
          className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
        >
          {t('accountSettings.backButton')}
        </button>
      </div>

      <div className="space-y-8">
        {/* Subscription & Billing Card (US-021) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">{t('accountSettings.subscriptionBillingTitle')}</h2>
                <p className="text-xs text-slate-500">{t('accountSettings.subscriptionBillingSubtitle')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  ['pro', 'enterprise'].includes(user?.subscription_tier) || user?.role === 'payment_exempt' || user?.has_unlimited_bypass
                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                    : user?.subscription_tier === 'starter'
                    ? 'bg-blue-100 text-blue-800 border border-blue-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {user?.role === 'payment_exempt' || user?.has_unlimited_bypass
                  ? t('accountSettings.vipUnlimitedBypass')
                  : user?.subscription_tier === 'enterprise'
                  ? t('accountSettings.enterprisePlan')
                  : user?.subscription_tier === 'pro'
                  ? t('accountSettings.proPlan')
                  : user?.subscription_tier === 'starter'
                  ? t('accountSettings.starterPlan')
                  : t('accountSettings.freeTier')}
              </span>
            </div>
          </div>

          {cancelMsg && (
            <div className="mb-4 p-3 rounded-xl bg-amber-50 text-amber-800 text-sm border border-amber-200">
              ℹ️ {cancelMsg}
            </div>
          )}

          {/* Payment Exempt / VIP Notice (US-016) */}
          {(user?.role === 'payment_exempt' || user?.has_unlimited_bypass) && (
            <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3">
              <span className="text-xl">👑</span>
              <div>
                <h3 className="text-sm font-bold text-emerald-900">{t('accountSettings.vipAccessTitle')}</h3>
                <p className="text-xs text-emerald-700 mt-1">
                  {t('accountSettings.vipAccessMessage')}
                  {subDetails?.exemptionReason && (
                    <span className="block mt-0.5 text-emerald-800 font-medium">
                      {t('accountSettings.reason')}: {subDetails.exemptionReason}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Cancellation Notice Banner if scheduled */}
          {subDetails?.cancelsAtPeriodEnd && (
            <div className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <h3 className="text-sm font-bold text-amber-900">{t('accountSettings.cancellationScheduledTitle')}</h3>
                <p className="text-xs text-amber-700 mt-1">
                  {t('accountSettings.cancellationScheduledMessage', {
                    date: subDetails?.subscriptionRenewsAt
                      ? new Date(subDetails.subscriptionRenewsAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : t('accountSettings.endOfBillingCycle'),
                  })}
                </p>
              </div>
            </div>
          )}

          {/* Scheduled Downgrade Notice Banner (Accounting & Billing Cycle Safeguard) */}
          {subDetails?.scheduledTier && !subDetails?.cancelsAtPeriodEnd && (
            <div className="mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <span className="text-xl">📅</span>
              <div>
                <h3 className="text-sm font-bold text-blue-900">
                  {t('accountSettings.downgradeScheduledTitle', 'Downgrade Scheduled for Next Billing Cycle')}
                </h3>
                <p className="text-xs text-blue-700 mt-1">
                  {t('accountSettings.downgradeScheduledMessage', {
                    plan: subDetails.scheduledTier.toUpperCase(),
                    date: subDetails?.scheduledChangeEffectiveAt || subDetails?.subscriptionRenewsAt
                      ? new Date(subDetails?.scheduledChangeEffectiveAt || subDetails?.subscriptionRenewsAt).toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : t('accountSettings.nextBillingCycle', 'your next billing date'),
                    currentPlan: (user?.subscription_tier || 'Pro').toUpperCase(),
                  })}
                </p>
                <p className="text-[11px] text-blue-600 mt-1">
                  {t('accountSettings.downgradeAccountingNote', 'To avoid prorated billing and accounting discrepancies, your account retains all current plan features and seats through the end of the current paid billing period.')}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('accountSettings.currentStatusLabel')}</span>
              <p className="text-sm font-bold text-slate-800 capitalize">
                {subDetails?.cancelsAtPeriodEnd
                  ? t('accountSettings.activeCancelingAtPeriodEnd')
                  : subDetails?.subscriptionStatus === 'active'
                  ? t('accountSettings.activeRecurring')
                  : user?.role === 'payment_exempt'
                  ? t('accountSettings.vipLifetimeAccess')
                  : t('accountSettings.freeAccess')}
              </p>
              <p className="text-xs text-slate-500">
                {subDetails?.subscriptionRenewsAt
                  ? `${subDetails?.cancelsAtPeriodEnd ? t('accountSettings.accessEndsOn') : t('accountSettings.renewsOn')} ${new Date(
                      subDetails.subscriptionRenewsAt
                    ).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}`
                  : (['starter', 'pro', 'enterprise'].includes(user?.subscription_tier) && subDetails?.subscriptionStatus === 'active') || user?.has_unlimited_bypass
                  ? t('accountSettings.unlimitedProposalsAndExports')
                  : t('accountSettings.freeTrialExportsRemaining', { count: user?.trial_uses_remaining ?? 5 })}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('accountSettings.billingProviderLabel')}</span>
              <p className="text-sm font-bold text-slate-800">
                {t('accountSettings.paddleMerchantOfRecord')}
              </p>
              <p className="text-xs text-slate-500">
                {t('accountSettings.billingProviderDescription')}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
            <div>
              {!isProOrExempt && (
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition shadow-xs"
                >
                  {t('accountSettings.upgradeToPro')}
                </button>
              )}
              {isProOrExempt && !subDetails?.cancelsAtPeriodEnd && (
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  {t('accountSettings.changePlanOrRedeemCode')}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {/* Customer Portal Link if subscription ID exists */}
              {user?.paddle_subscription_id && (
                <button
                  type="button"
                  disabled={portalLoading}
                  onClick={handleOpenCustomerPortal}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 transition"
                >
                  {portalLoading ? t('accountSettings.openingPortal') : t('accountSettings.manageInvoicesAndPayment')}
                </button>
              )}

              {/* Cancel Subscription Button for active paid subscribers */}
              {isProOrExempt && !subDetails?.cancelsAtPeriodEnd && user?.role !== 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    setCancelErr('');
                    setCancelReason('Project completed');
                    setCancelReasonDetails('');
                    setShowCancelModal(true);
                  }}
                  className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-xl transition"
                >
                  {t('accountSettings.cancelSubscription')}
                </button>
              )}

              {/* Restore Subscription Button when subscription is scheduled for cancellation */}
              {subDetails?.cancelsAtPeriodEnd && user?.role !== 'admin' && (
                <button
                  type="button"
                  disabled={restoreLoading}
                  onClick={handleRestoreSubscription}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 border border-emerald-600 rounded-xl shadow-xs transition flex items-center gap-1.5"
                >
                  <span>✓</span>
                  <span>{restoreLoading ? t('accountSettings.restoringSubscription', 'Restoring...') : t('accountSettings.restoreSubscription', 'Restore Subscription')}</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contact Info Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('accountSettings.contactInfoTitle')}</h2>
              <p className="text-xs text-slate-500">{t('accountSettings.contactInfoSubtitle')}</p>
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
                  {t('accountSettings.firstNameLabel')}
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
                  {t('accountSettings.lastNameLabel')}
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
                  {t('accountSettings.usernameLabel')}
                </label>
                <input
                  type="text"
                  disabled
                  value={user?.username || ''}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-xl cursor-not-allowed"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">{t('accountSettings.usernameCannotChange')}</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('accountSettings.emailAddressLabel')}
                </label>
                <input
                  type="email"
                  disabled
                  value={user?.email || ''}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 bg-slate-50 text-slate-500 rounded-xl cursor-not-allowed"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">{t('accountSettings.emailManagedBySupabase')}</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('accountSettings.phoneNumberLabel')}
              </label>
              <input
                type="tel"
                placeholder={t('accountSettings.phoneNumberPlaceholder')}
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
                {profileLoading ? t('accountSettings.savingChanges') : t('accountSettings.saveProfileChanges')}
              </button>
            </div>
          </form>
        </div>

        {/* Company Branding & Proposal Customization Card (US-008) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative">
          {!isProOrExempt && (
            <div className="absolute top-4 right-4">
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full">
                👑 Pro Feature
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('accountSettings.brandingTitle')}</h2>
              <p className="text-xs text-slate-500">
                {t('accountSettings.brandingSubtitle')}
              </p>
            </div>
          </div>

          {!isProOrExempt && (
            <div className="mb-5 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              {t('accountSettings.brandingProFeatureMessage')}
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {/* Logo Upload */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                {t('accountSettings.companyLogoLabel')}
              </label>
              <div className="flex items-center gap-4">
                {companyLogoUrl ? (
                  <div className="relative group">
                    <img
                      src={companyLogoUrl}
                      alt={t('accountSettings.companyLogoPreview')}
                      className="w-24 h-16 object-contain border border-slate-200 rounded-xl p-1 bg-slate-50"
                    />
                    <button
                      type="button"
                      onClick={() => setCompanyLogoUrl('')}
                      className="absolute -top-2 -right-2 bg-red-600 text-white p-1 rounded-full text-xs opacity-0 group-hover:opacity-100 transition shadow"
                      title={t('accountSettings.removeLogoTitle')}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="w-24 h-16 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center text-xs text-slate-400">
                    {t('accountSettings.noLogo')}
                  </div>
                )}

                <div>
                  <label className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer transition">
                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    <span>{logoUploading ? t('accountSettings.uploadingLogo') : t('accountSettings.uploadImageButton')}</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/svg+xml, image/webp"
                      onChange={handleLogoFileChange}
                      disabled={logoUploading}
                      className="hidden"
                    />
                  </label>
                  {logoError && (
                    <p className="text-xs text-red-600 mt-1">{logoError}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('accountSettings.companyNameLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('accountSettings.companyNamePlaceholder')}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('accountSettings.licenseNumberLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('accountSettings.licenseNumberPlaceholder')}
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('accountSettings.companyAddressLabel')}
                </label>
                <input
                  type="text"
                  placeholder={t('accountSettings.companyAddressPlaceholder')}
                  value={companyAddress}
                  onChange={(e) => setCompanyAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('accountSettings.brandColorLabel')}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColor || '#0284c7'}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-10 h-10 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={brandColor || '#0284c7'}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={profileLoading}
                className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white text-sm font-semibold shadow-xs transition"
              >
                {profileLoading ? t('accountSettings.savingBranding') : t('accountSettings.saveBrandingSettings')}
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
              <h2 className="text-lg font-bold text-slate-900">{t('accountSettings.changePasswordTitle')}</h2>
              <p className="text-xs text-slate-500">{t('accountSettings.changePasswordSubtitle')}</p>
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                {t('accountSettings.currentPasswordLabel', 'Current Password')}
              </label>
              <div className="relative">
                <input
                  type={showOldPassword ? 'text' : 'password'}
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder={t('accountSettings.currentPasswordPlaceholder', '••••••••')}
                  className="w-full px-3.5 py-2.5 pr-10 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('accountSettings.newPasswordLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('accountSettings.newPasswordPlaceholder', '••••••••')}
                    className="w-full px-3.5 py-2.5 pr-10 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('accountSettings.confirmPasswordLabel')}
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('accountSettings.confirmPasswordPlaceholder', '••••••••')}
                    className="w-full px-3.5 py-2.5 pr-10 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-sm focus:outline-none"
                    aria-label={showConfirmPassword ? t('loginPage.hidePassword', 'Hide password') : t('loginPage.showPassword', 'Show password')}
                  >
                    {showConfirmPassword ? (
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
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={passwordLoading || !oldPassword || !newPassword || !confirmPassword}
                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-semibold shadow-xs transition"
              >
                {passwordLoading ? t('accountSettings.updatingPassword') : t('accountSettings.updatePasswordButton')}
              </button>
            </div>
          </form>
        </div>

        {/* Team Workspaces & Member Invites (US-011) */}
        <TeamWorkspaceManager />

        {/* Danger Zone: Delete Account */}
        <div className="bg-red-50/50 rounded-2xl border border-red-200 p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-bold text-red-900">{t('accountSettings.deleteAccountTitle')}</h2>
              <p className="text-xs text-red-700 mt-1 max-w-xl">
                {t('accountSettings.deleteAccountDescription')}
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
              {t('accountSettings.deleteAccountButton')}
            </button>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      {showUpgradeModal && (
        <UpgradeModal
          isOpen={showUpgradeModal}
          onClose={() => {
            setShowUpgradeModal(false);
            loadSubscriptionDetails();
          }}
        />
      )}

      {/* Subscription Cancellation & Retention Modal (US-021) */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 sm:p-7 relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center text-lg">
                ⚠️
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{t('accountSettings.cancelSubscriptionTitle')}</h3>
                <p className="text-xs text-slate-500">{t('accountSettings.cancelSubscriptionSubtitle')}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 mb-4 leading-relaxed">
              <p className="font-semibold text-slate-800 mb-1">{t('accountSettings.whatHappensWhenCancelLabel')}:</p>
              <ul className="list-disc list-inside space-y-1 text-slate-600">
                <li>{t('accountSettings.keepAccessUntilEnd')}</li>
                <li>{t('accountSettings.projectsWillNeverDelete')}</li>
                <li>{t('accountSettings.notChargedAgain')}</li>
              </ul>
            </div>

            {cancelErr && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                ✕ {cancelErr}
              </div>
            )}

            <form onSubmit={handleCancelSubscription} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('accountSettings.cancellationReasonLabel')}
                </label>
                <select
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                >
                  <option value="Project completed">{t('accountSettings.reasonProjectCompleted')}</option>
                  <option value="Too expensive">{t('accountSettings.reasonTooExpensive')}</option>
                  <option value="Missing a feature">{t('accountSettings.reasonMissingFeature')}</option>
                  <option value="Found alternative software">{t('accountSettings.reasonAlternativeSoftware')}</option>
                  <option value="Temporary pause">{t('accountSettings.reasonTemporaryPause')}</option>
                  <option value="Other">{t('accountSettings.reasonOther')}</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {t('accountSettings.feedbackLabel')}
                </label>
                <textarea
                  rows={2}
                  placeholder={t('accountSettings.feedbackPlaceholder')}
                  value={cancelReasonDetails}
                  onChange={(e) => setCancelReasonDetails(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  {t('accountSettings.keepSubscriptionButton')}
                </button>
                <button
                  type="submit"
                  disabled={cancelLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition shadow-xs"
                >
                  {cancelLoading ? t('accountSettings.cancelingSubscription') : t('accountSettings.confirmCancellation')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 relative">
            <h3 className="text-xl font-bold text-slate-900 mb-2">{t('accountSettings.deleteConfirmTitle')}</h3>
            <p className="text-xs text-slate-600 mb-4 leading-relaxed">
              {t('accountSettings.deleteConfirmMessage', { username: user?.username })}
            </p>

            {deleteErr && (
              <div className="mb-4 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                ✕ {deleteErr}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Type your username <span className="font-bold text-slate-900">{user?.username}</span> to confirm:
              </label>
              <input
                type="text"
                placeholder={user?.username}
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:outline-none font-mono"
              />
            </div>            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                {t('accountSettings.cancelButton')}
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== user?.username || deleteLoading}
                onClick={handleDeleteAccount}
                className="px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl transition"
              >
                {deleteLoading ? t('accountSettings.deletingAccount') : t('accountSettings.permanentlyDeleteButton')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
