import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useFridge } from '../../state/FridgeContext';
import type { FoodItem } from '../../types';
import { formatShortId } from '../../utils/id';
import { DEFAULT_USERS } from '../../domain/seedData';
import { AlertTriangle, CheckCircle2, Scale } from 'lucide-react';

interface ReconcileModalProps {
  item: FoodItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReconcileModal: React.FC<ReconcileModalProps> = ({ item, isOpen, onClose }) => {
  const { state, reconcile, getItemQuantities } = useFridge();

  if (!item) return null;

  const quantities = getItemQuantities(item);
  const activeReservations = state.portionRequests.filter(
    (r) =>
      r.foodItemId === item.id &&
      r.status === 'approved' &&
      (!r.expiresAt || Date.now() < r.expiresAt)
  );

  const [actualQtyStr, setActualQtyStr] = useState<string>(item.totalQuantity.toString());
  const [reason, setReason] = useState<string>('Physical fridge audit / discrepancy observed');
  const [adjustedBy, setAdjustedBy] = useState<string>(state.currentUser);
  const [error, setError] = useState<string | null>(null);

  const actualQty = parseInt(actualQtyStr, 10);
  const isValidInteger = !isNaN(actualQty) && Number.isInteger(actualQty);
  const isNegative = isValidInteger && actualQty < 0;
  const diff = isValidInteger ? actualQty - item.totalQuantity : 0;

  // Predict impact on reservations if actual < reserved
  const hasShortage = isValidInteger && actualQty < quantities.reservedQuantity;
  const willCancelCount = hasShortage
    ? Math.max(
        1,
        activeReservations.filter((_, idx) => {
          // FIFO preview
          let runningSum = 0;
          for (let i = 0; i <= idx; i++) {
            runningSum += activeReservations[i].requestedQuantity;
          }
          return runningSum > actualQty;
        }).length
      )
    : 0;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidInteger) {
      setError('Actual quantity must be a valid whole integer.');
      return;
    }

    if (isNegative) {
      setError('Negative quantities are strictly forbidden.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a reason for the inventory correction.');
      return;
    }

    const result = reconcile(item.id, actualQty, reason, adjustedBy);
    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to reconcile inventory.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Correct / Reconcile Physical Inventory"
      subtitle={`Auditing "${item.name}" (${formatShortId(item.id)})`}
      maxWidth="560px"
    >
      <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {error && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              color: '#fca5a5',
              fontSize: '0.85rem',
            }}
          >
            {error}
          </div>
        )}

        {/* Current State Summary */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '0.75rem',
            background: 'var(--bg-elevated)',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            textAlign: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Recorded Total</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {item.totalQuantity} <span style={{ fontSize: '0.8rem' }}>{item.unit}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Currently Reserved</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {quantities.reservedQuantity} <span style={{ fontSize: '0.8rem' }}>{item.unit}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available Quantity</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>
              {quantities.availableQuantity} <span style={{ fontSize: '0.8rem' }}>{item.unit}</span>
            </div>
          </div>
        </div>

        {/* Reported Actual Input */}
        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Actual Physical Quantity In Fridge * ({item.unit})
          </label>
          <input
            type="number"
            min="0"
            step="1"
            required
            value={actualQtyStr}
            onChange={(e) => setActualQtyStr(e.target.value)}
            style={{ width: '100%', fontSize: '1.1rem', fontWeight: 600 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginTop: '0.35rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>
              Difference from recorded:
            </span>
            <span
              style={{
                fontWeight: 700,
                color: diff > 0 ? 'var(--color-success)' : diff < 0 ? '#f87171' : 'var(--text-muted)',
              }}
            >
              {diff > 0 ? `+${diff}` : diff} {item.unit}
            </span>
          </div>
        </div>

        {/* Shortage Warning Preview */}
        {hasShortage && (
          <div
            style={{
              padding: '0.85rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              fontSize: '0.825rem',
              color: '#fca5a5',
              display: 'flex',
              gap: '0.65rem',
            }}
          >
            <AlertTriangle size={20} color="#ef4444" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <strong>Reservation Shortage Conflict:</strong>
              <div style={{ marginTop: '2px' }}>
                Actual physical quantity ({actualQty} {item.unit}) is less than total reserved ({quantities.reservedQuantity} {item.unit}).
                To prevent physical over-allocation, <strong>{willCancelCount} reservation(s)</strong> will be deterministically cancelled using FIFO priority (earliest approvals preserved).
              </div>
            </div>
          </div>
        )}

        {!hasShortage && diff < 0 && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              fontSize: '0.825rem',
              color: 'var(--text-secondary)',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center',
            }}
          >
            <CheckCircle2 size={16} color="var(--color-primary)" />
            <span>
              All {activeReservations.length} active reservation(s) remain covered by remaining physical inventory.
            </span>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Adjusted By *
            </label>
            <select
              value={adjustedBy}
              onChange={(e) => setAdjustedBy(e.target.value)}
              style={{ width: '100%' }}
            >
              {DEFAULT_USERS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Reason for Correction *
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Spill, leak, audit, miscounted"
              style={{ width: '100%' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" style={{ background: hasShortage ? '#ef4444' : undefined, color: hasShortage ? '#fff' : undefined }}>
            <Scale size={16} />
            Confirm Inventory Correction
          </button>
        </div>
      </form>
    </Modal>
  );
};
