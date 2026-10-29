import React, { useState } from 'react';
import { useFridge } from '../../state/FridgeContext';
import { formatDateTime, formatTimeAgo } from '../../utils/time';
import { formatShortId } from '../../utils/id';
import {
  History,
  Scale,
  Sparkles,
  PlusCircle,
  Clock,
  CheckCircle,
  Utensils,
  XCircle,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

export const ActivityHistorySection: React.FC = () => {
  const { state } = useFridge();
  const [activeTab, setActiveTab] = useState<'timeline' | 'reconciliation'>('timeline');

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'item_added':
        return <PlusCircle size={15} color="#38bdf8" />;
      case 'portion_requested':
        return <Clock size={15} color="#f59e0b" />;
      case 'request_approved':
        return <CheckCircle size={15} color="#38bdf8" />;
      case 'portion_claimed':
        return <Utensils size={15} color="#a855f7" />;
      case 'reservation_expired':
        return <AlertTriangle size={15} color="#f59e0b" />;
      case 'request_rejected':
      case 'request_cancelled':
        return <XCircle size={15} color="#ef4444" />;
      case 'food_discarded':
        return <Trash2 size={15} color="#ef4444" />;
      case 'inventory_corrected':
        return <Scale size={15} color="#10b981" />;
      default:
        return <Sparkles size={15} color="#94a3b8" />;
    }
  };

  return (
    <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '2.5rem' }}>
      {/* Tab Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-color)',
          paddingBottom: '0.75rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('timeline')}
            className="btn btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600,
              background: activeTab === 'timeline' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === 'timeline' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: `1px solid ${activeTab === 'timeline' ? 'var(--border-accent)' : 'transparent'}`,
            }}
          >
            <History size={15} />
            <span>Activity Timeline</span>
            <span style={{ opacity: 0.65 }}>({state.activityLog.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reconciliation')}
            className="btn btn-sm"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontWeight: 600,
              background: activeTab === 'reconciliation' ? 'var(--bg-elevated)' : 'transparent',
              color: activeTab === 'reconciliation' ? 'var(--text-primary)' : 'var(--text-muted)',
              border: `1px solid ${activeTab === 'reconciliation' ? 'var(--border-accent)' : 'transparent'}`,
            }}
          >
            <Scale size={15} />
            <span>Reconciliation Audit History</span>
            <span style={{ opacity: 0.65 }}>({state.inventoryAdjustments.length})</span>
          </button>
        </div>

        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          Transparent audit log of all physical fridge actions
        </div>
      </div>

      {/* Tab 1: Timeline */}
      {activeTab === 'timeline' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {state.activityLog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No activities recorded yet.
            </div>
          ) : (
            state.activityLog.slice(0, 15).map((act) => (
              <div
                key={act.id}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  fontSize: '0.85rem',
                }}
              >
                <div style={{ marginTop: '3px', flexShrink: 0 }}>
                  {getActivityIcon(act.type)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: 'var(--text-primary)', lineHeight: '1.4' }}>
                    {act.description}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    By <strong>{act.actor}</strong> • {formatTimeAgo(act.timestamp)} ({formatDateTime(act.timestamp)})
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Reconciliation Audit */}
      {activeTab === 'reconciliation' && (
        <div>
          {state.inventoryAdjustments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No inventory corrections have been recorded.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      color: 'var(--text-secondary)',
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      textAlign: 'left',
                    }}
                  >
                    <th style={{ padding: '0.65rem 0.5rem' }}>Item & ID</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Previous Qty</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Corrected Qty</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Adjustment</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Reason & Details</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Adjusted By</th>
                    <th style={{ padding: '0.65rem 0.5rem' }}>Date & Time</th>
                  </tr>
                </thead>
                <tbody>
                  {state.inventoryAdjustments.map((adj) => (
                    <tr
                      key={adj.id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                      }}
                    >
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <div style={{ fontWeight: 600 }}>{adj.foodItemName}</div>
                        <span className="badge-id" style={{ fontSize: '0.7rem' }}>
                          {formatShortId(adj.foodItemId)}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>{adj.previousQuantity}</td>
                      <td style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>
                        {adj.correctedQuantity}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span
                          style={{
                            fontWeight: 700,
                            color:
                              adj.difference > 0
                                ? 'var(--color-success)'
                                : adj.difference < 0
                                ? '#f87171'
                                : 'var(--text-muted)',
                          }}
                        >
                          {adj.difference > 0 ? `+${adj.difference}` : adj.difference}
                        </span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', maxWidth: '300px' }}>
                        <div>{adj.reason}</div>
                        {adj.impactedReservationsCount > 0 && (
                          <div style={{ fontSize: '0.75rem', color: '#f87171', marginTop: '2px' }}>
                            <strong>Shortage action:</strong> {adj.details}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem' }}>
                        <span style={{ fontWeight: 600 }}>{adj.adjustedBy}</span>
                      </td>
                      <td style={{ padding: '0.75rem 0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {formatDateTime(adj.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
