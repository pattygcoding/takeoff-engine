import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { proposalsApi } from '@/lib/proposals';
import { formatCurrency, formatNumber } from '@/lib/calculations';
import { useModal } from '@/context/ModalContext';

export default function ClientProposalView() {
  const { publicToken } = useParams();
  const { showAlert } = useModal();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Signature Form States
  const [signerName, setSignerName] = useState('');
  const [signerEmail, setSignerEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [signSuccess, setSignSuccess] = useState(false);
  const [signError, setSignError] = useState('');

  // Decline Modal States
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [declining, setDeclining] = useState(false);

  useEffect(() => {
    if (publicToken) {
      loadProposal();
    }
  }, [publicToken]);

  const loadProposal = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await proposalsApi.getPublicProposal(publicToken);
      setData(res);
      if (res.proposal?.client_status === 'accepted') {
        setSignSuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Unable to load proposal. Please contact your contractor.');
    } finally {
      setLoading(false);
    }
  };

  const handleSign = async (e) => {
    e.preventDefault();
    if (!signerName.trim()) {
      setSignError('Please enter your full legal name.');
      return;
    }
    if (!agreedToTerms) {
      setSignError('Please check the agreement box to accept.');
      return;
    }

    setSubmitting(true);
    setSignError('');

    try {
      await proposalsApi.signPublicProposal(publicToken, {
        signerName,
        signerEmail,
      });
      setSignSuccess(true);
      await loadProposal();
    } catch (err) {
      setSignError(err.message || 'Failed to submit signature.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async (e) => {
    e.preventDefault();
    setDeclining(true);
    try {
      await proposalsApi.declinePublicProposal(publicToken, { reason: declineReason });
      setShowDeclineModal(false);
      await loadProposal();
    } catch (err) {
      await showAlert({
        title: 'Decline Error',
        message: err.message || 'Failed to decline proposal.',
        variant: 'error',
      });
    } finally {
      setDeclining(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-sm font-medium text-slate-600">Loading proposal details...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-200">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Proposal Not Found</h2>
          <p className="text-sm text-slate-600 mb-6">{error || 'This link may have expired or is invalid.'}</p>
          <a
            href="https://pattygcoding.github.io/takeoff-engine"
            className="inline-block px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-900 transition"
          >
            Go to Takeoff Engine
          </a>
        </div>
      </div>
    );
  }

  const { proposal, contractor } = data;
  const snapshot = proposal.proposal_data_json || {};
  const isAccepted = proposal.client_status === 'accepted';
  const isDeclined = proposal.client_status === 'declined';
  const brandColor = contractor.brand_color || '#0284c7';

  return (
    <div className="min-h-screen bg-slate-100 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Status Notification Banner */}
        {isAccepted && (
          <div className="bg-emerald-500 text-white p-4 rounded-2xl shadow-md flex items-center justify-between animate-fade-in">
            <div className="flex items-center gap-3">
              <span className="text-2xl">✓</span>
              <div>
                <p className="font-bold text-sm">Proposal Accepted & Digitally Signed</p>
                <p className="text-xs text-emerald-100">
                  Signed by {proposal.signed_by_name} on {new Date(proposal.signed_at).toLocaleString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold rounded-lg shadow transition"
            >
              Print / Save PDF
            </button>
          </div>
        )}

        {isDeclined && (
          <div className="bg-red-500 text-white p-4 rounded-2xl shadow-md flex items-center gap-3 animate-fade-in">
            <span className="text-2xl">✕</span>
            <div>
              <p className="font-bold text-sm">Proposal Declined</p>
              <p className="text-xs text-red-100">Reason: {proposal.decline_reason || 'Declined by client'}</p>
            </div>
          </div>
        )}

        {/* Main Proposal Document */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
          {/* Top Header & Contractor Brand */}
          <div className="p-6 sm:p-8 border-b-2" style={{ borderColor: brandColor }}>
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                {contractor.company_logo_url ? (
                  <img
                    src={contractor.company_logo_url}
                    alt={contractor.company_name || 'Contractor Logo'}
                    className="h-16 max-w-[180px] object-contain rounded"
                  />
                ) : (
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-sm"
                    style={{ backgroundColor: brandColor }}
                  >
                    {(contractor.company_name?.[0] || contractor.first_name?.[0] || 'T').toUpperCase()}
                  </div>
                )}

                <div>
                  <h1 className="text-2xl font-bold tracking-tight" style={{ color: brandColor }}>
                    {contractor.company_name || `${contractor.first_name || ''} ${contractor.last_name || ''}`.trim() || 'General Contractor'}
                  </h1>
                  {contractor.company_address && (
                    <p className="text-xs text-slate-500 mt-0.5">{contractor.company_address}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                    {contractor.phone_number && <span>📞 {contractor.phone_number}</span>}
                    {contractor.email && <span>✉️ {contractor.email}</span>}
                    {contractor.license_number && <span>Lic: #{contractor.license_number}</span>}
                  </div>
                </div>
              </div>

              <div className="text-right sm:border-l sm:border-slate-100 sm:pl-6">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Project Estimate
                </span>
                <p className="text-lg font-bold text-slate-900">{snapshot.projectName || 'Civil Takeoff Proposal'}</p>
                {snapshot.clientName && (
                  <p className="text-xs text-slate-600 mt-0.5">Prepared for: <strong className="text-slate-800">{snapshot.clientName}</strong></p>
                )}
                {snapshot.location && (
                  <p className="text-xs text-slate-500 mt-0.5">Location: {snapshot.location}</p>
                )}
                <p className="text-[11px] text-slate-400 mt-1">Date: {new Date(proposal.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Big Bid Investment Highlight */}
          <div className="bg-slate-50/80 p-6 sm:p-8 border-b border-slate-200 text-center">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-1">
              Total Proposed Project Investment
            </span>
            <div className="text-4xl sm:text-5xl font-black tracking-tight" style={{ color: brandColor }}>
              {formatCurrency(snapshot.summary?.finalBidAmount || 0)}
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Includes complete labor, specialized equipment, materials, and mobilization.
            </p>
          </div>

          {/* Scope of Work Breakdown */}
          <div className="p-6 sm:p-8 space-y-6">
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider border-b pb-2">
              Detailed Scope & Quantity Breakdown
            </h2>

            {snapshot.items && snapshot.items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                      <th className="py-2 pr-4">Item & Description</th>
                      <th className="py-2 pr-4">System / Division</th>
                      <th className="py-2 pr-4">Size / Spec</th>
                      <th className="py-2 pr-4 text-right">Quantity</th>
                      <th className="py-2 text-right">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {snapshot.items.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60">
                        <td className="py-2.5 pr-4 font-medium text-slate-800">{item.description}</td>
                        <td className="py-2.5 pr-4 text-slate-500 text-xs">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 font-medium">
                            {item.system || 'General'}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 text-slate-500 text-xs">{item.sizeSpec || '—'}</td>
                        <td className="py-2.5 pr-4 text-right font-bold text-slate-900">
                          {formatNumber(item.quantity, 0)}
                        </td>
                        <td className="py-2.5 text-right text-slate-500 text-xs uppercase">{item.unit || 'EA'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">No itemized breakdown provided in snapshot.</p>
            )}

            {/* Standard Terms / Acceptance Notes */}
            <div className="mt-8 pt-6 border-t border-slate-200 text-xs text-slate-500 space-y-2">
              <p className="font-semibold text-slate-700">Proposal Terms & Conditions:</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Pricing valid for 30 calendar days from the date of issuance.</li>
                <li>Work will be performed according to project specifications and local municipality standards.</li>
                <li>Upon electronic acceptance, a finalized contract agreement will be dispatched for scheduling.</li>
              </ul>
            </div>
          </div>

          {/* E-Signature Section */}
          {!isAccepted && !isDeclined && (
            <div className="bg-slate-50 p-6 sm:p-8 border-t border-slate-200">
              <div className="max-w-xl mx-auto">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900">Accept & Electronically Sign Bid</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Sign below to accept this proposal and authorize work commencement.
                  </p>
                </div>

                {signError && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                    ✕ {signError}
                  </div>
                )}

                <form onSubmit={handleSign} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Full Legal Name (Authorized Signer) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Jane Doe"
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Signer Email Address (for confirmation receipt)
                    </label>
                    <input
                      type="email"
                      placeholder="jane.doe@company.com"
                      value={signerEmail}
                      onChange={(e) => setSignerEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>

                  <label className="flex items-start gap-2.5 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={(e) => setAgreedToTerms(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-xs text-slate-600 leading-relaxed">
                      I am an authorized representative and agree that my electronic submission represents a legally binding digital acceptance of this proposal.
                    </span>
                  </label>

                  <div className="flex items-center justify-between pt-4 gap-3">
                    <button
                      type="button"
                      onClick={() => setShowDeclineModal(true)}
                      className="px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-red-600 transition"
                    >
                      Decline Proposal
                    </button>

                    <button
                      type="submit"
                      disabled={submitting || !agreedToTerms || !signerName.trim()}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md transition"
                    >
                      {submitting ? 'Submitting Signature...' : '✓ Accept & Sign Proposal'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-400 pb-8">
          Powered by <a href="https://pattygcoding.github.io/takeoff-engine" className="underline hover:text-slate-600">Takeoff Engine</a> — Construction Estimating & Takeoff Platform
        </div>
      </div>

      {/* Decline Confirmation Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Decline Proposal</h3>
            <p className="text-xs text-slate-500 mb-4">
              Please provide a brief reason for declining this proposal (optional):
            </p>

            <form onSubmit={handleDecline}>
              <textarea
                rows={3}
                placeholder="e.g. Scope changed / selected another contractor"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-4"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDeclineModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={declining}
                  className="px-4 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  {declining ? 'Submitting...' : 'Confirm Decline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
