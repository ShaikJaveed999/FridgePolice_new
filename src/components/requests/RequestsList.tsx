import React, { useState, useEffect } from 'react';
import { useFridge } from '../../state/FridgeContext';
import type { PortionRequest, RequestStatus } from '../../types';
import { formatShortId } from '../../utils/id';
import { formatDateTime, formatRemainingTime } from '../../utils/time';
import {
  Check,
  X,
  Utensils,
  Zap,
  Ban,
  Clock,
  Filter,
} from 'lucide-react';

export const RequestsList: React.FC = () => {
  const {
    state,
    approveRequest,
    rejectRequest,
    claimPortion,
    cancelRequest,
    simulateExpire,
  } = useFridge();

  const [filter, setFilter] = useState<RequestStatus | 'all'>('all');
  const [, setNowTick] = useState(Date.now());

  // Local ticker to re-render countdowns smoothly every second
  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleApprove = (req: PortionRequest) => {
    approveRequest(req.id);
  };

  const handleReject = (req: PortionRequest) => {
    const reason = window.prompt(
      `Reject ${req.requester}’s request? Enter reason (optional):`,
      'Saving this portion for dinner tonight'
    );
    if (reason !== null) {
      rejectRequest(req.id, reason);
    }
  };

  const handleCancel = (req: PortionRequest) => {
    if (window.confirm('Cancel this request and release any reservations?')) {
      cancelRequest(req.id, 'Cancelled by user');
    }
  };

  const handleClaim = (req: PortionRequest) => {
    claimPortion(req.id);
  };

  const handleSimulateExpire = (req: PortionRequest) => {
    simulateExpire(req.id);
  };

  const filteredRequests = state.portionRequests.filter((r) => {
    if (filter === 'all') return true;
    return r.status === filter;
  });

  return (
    <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Header and Filter Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Portion Requests & Reservations</h2>
            <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>
              {filteredRequests.length}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Lifecycle: Pending → Approved & Reserved → Claimed / Expired / Rejected / Cancelled
          </p>
        </div>

        {/* Status Filter Pills */}
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {(
            [
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'approved', label: 'Reserved' },
              { key: 'claimed', label: 'Claimed' },
              { key: 'expired', label: 'Expired' },
              { key: 'cancelled', label: 'Cancelled' },
              { key: 'rejected', label: 'Rejected' },
            ] as const
          ).map((tab) => {
            const count =
              tab.key === 'all'
                ? state.portionRequests.length
                : state.portionRequests.filter((r) => r.status === tab.key).length;

            return (
              <button
                key={tab.key}
                onClick={() => setFilter(tab.key)}
                className="btn btn-sm"
                style={{
                  background: filter === tab.key ? 'var(--bg-elevated)' : 'transparent',
                  color: filter === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: `1px solid ${filter === tab.key ? 'var(--border-accent)' : 'transparent'}`,
                  fontSize: '0.75rem',
                }}
              >
                <span>{tab.label}</span>
                <span style={{ opacity: 0.65, fontSize: '0.7rem' }}>({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Requests List */}
      {filteredRequests.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '2.5rem 1rem',
            color: 'var(--text-muted)',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-color)',
          }}
        >
          <Filter size={20} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
          No requests found in this status category.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredRequests.map((req) => {
            const item = state.foodItems.find((f) => f.id === req.foodItemId);
            const itemName = item ? item.name : 'Unknown Food Item';
            const itemOwner = item ? item.owner : '—';
            const unit = item ? item.unit : '';
            const isApproved = req.status === 'approved';
            const isPending = req.status === 'pending';
            const now = Date.now();

            return (
              <div
                key={req.id}
                style={{
                  background: isApproved
                    ? 'rgba(56, 189, 248, 0.05)'
                    : 'var(--bg-elevated)',
                  border: `1px solid ${
                    isApproved ? 'var(--border-accent)' : 'var(--border-color)'
                  }`,
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '1rem',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Left Column: Requester & Food Item */}
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span
                      style={{
                        fontWeight: 700,
                        fontSize: '0.95rem',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {req.requester}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>requested</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        fontSize: '1rem',
                      }}
                    >
                      {req.requestedQuantity} {unit}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>of</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      {itemName}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <span>Target Item:</span>
                    <span className="badge-id" title={req.foodItemId}>
                      {formatShortId(req.foodItemId)}
                    </span>
                    <span>(Owner: {itemOwner})</span>
                    <span>•</span>
                    <span>Created: {formatDateTime(req.createdAt)}</span>
                  </div>

                  {/* Reasons or Expiry Times */}
                  {req.rejectionReason && (
                    <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '4px' }}>
                      <strong>Rejection reason:</strong> {req.rejectionReason}
                    </div>
                  )}

                  {req.cancellationReason && (
                    <div style={{ fontSize: '0.78rem', color: '#f87171', marginTop: '4px' }}>
                      <strong>Cancellation:</strong> {req.cancellationReason}
                    </div>
                  )}

                  {isApproved && req.expiresAt && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.78rem',
                        color: 'var(--color-primary)',
                        marginTop: '4px',
                        fontWeight: 600,
                      }}
                    >
                      <Clock size={13} />
                      <span>Reservation timer: {formatRemainingTime(req.expiresAt, now)}</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                        (expires at {formatDateTime(req.expiresAt)})
                      </span>
                    </div>
                  )}
                </div>

                {/* Status Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span className={`badge badge-${req.status}`}>
                    {req.status === 'approved' ? 'Active Reservation' : req.status}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {isPending && (
                    <>
                      <button
                        onClick={() => handleApprove(req)}
                        className="btn btn-success btn-sm"
                        title="Approve & Atomically Reserve Portion"
                      >
                        <Check size={14} />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReject(req)}
                        className="btn btn-danger btn-sm"
                        title="Reject Request"
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                    </>
                  )}

                  {isApproved && (
                    <>
                      <button
                        onClick={() => handleClaim(req)}
                        className="btn btn-primary btn-sm"
                        title="Claim & Consume This Portion"
                      >
                        <Utensils size={14} />
                        <span>Claim / Consume</span>
                      </button>

                      {/* Instant Expiry Simulation Button for Scenario 2 */}
                      <button
                        onClick={() => handleSimulateExpire(req)}
                        className="btn btn-secondary btn-sm"
                        title="Simulate instant expiry without waiting 5 minutes"
                        style={{ color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.4)' }}
                      >
                        <Zap size={14} />
                        <span>Simulate Expiry</span>
                      </button>

                      <button
                        onClick={() => handleCancel(req)}
                        className="btn btn-danger btn-sm"
                        title="Cancel Reservation"
                      >
                        <Ban size={14} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
