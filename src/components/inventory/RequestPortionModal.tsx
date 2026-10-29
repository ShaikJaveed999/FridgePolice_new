import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useFridge } from '../../state/FridgeContext';
import type { FoodItem } from '../../types';
import { formatShortId } from '../../utils/id';
import { DEFAULT_USERS } from '../../domain/seedData';
import { Send } from 'lucide-react';

interface RequestPortionModalProps {
  item: FoodItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RequestPortionModal: React.FC<RequestPortionModalProps> = ({
  item,
  isOpen,
  onClose,
}) => {
  const { state, requestPortion, getItemQuantities } = useFridge();

  if (!item) return null;

  const quantities = getItemQuantities(item);
  const [requester, setRequester] = useState<string>(
    state.currentUser !== item.owner ? state.currentUser : DEFAULT_USERS.find((u) => u !== item.owner) || 'Bob'
  );
  const [requestedQtyStr, setRequestedQtyStr] = useState<string>(
    Math.min(quantities.availableQuantity, item.unit === '%' ? 25 : 1).toString()
  );
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const qty = parseInt(requestedQtyStr, 10);
    if (isNaN(qty) || qty <= 0) {
      setError('Requested quantity must be a positive whole integer.');
      return;
    }

    if (qty > quantities.availableQuantity) {
      setError(
        `Cannot request ${qty} ${item.unit}: Only ${quantities.availableQuantity} ${item.unit} available.`
      );
      return;
    }

    const result = requestPortion(item.id, requester, qty);
    if (result.success) {
      onClose();
    } else {
      setError(result.error || 'Failed to submit request.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Portion From Roommate"
      subtitle={`Requesting from "${item.name}" (Owned by ${item.owner}, ${formatShortId(item.id)})`}
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-elevated)',
            padding: '0.85rem 1rem',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Available to Request</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-success)' }}>
              {quantities.availableQuantity} {item.unit}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Reserved by Others</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--color-primary)' }}>
              {quantities.reservedQuantity} {item.unit}
            </div>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Requesting Roommate *
          </label>
          <select
            value={requester}
            onChange={(e) => setRequester(e.target.value)}
            style={{ width: '100%' }}
          >
            {DEFAULT_USERS.map((u) => (
              <option key={u} value={u}>
                {u} {u === item.owner ? '(Owner)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Portion to Request ({item.unit}) *
          </label>
          <input
            type="number"
            min="1"
            max={quantities.availableQuantity}
            step="1"
            required
            value={requestedQtyStr}
            onChange={(e) => setRequestedQtyStr(e.target.value)}
            style={{ width: '100%', fontSize: '1.1rem', fontWeight: 600 }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={quantities.availableQuantity <= 0}
          >
            <Send size={16} />
            Submit Request
          </button>
        </div>
      </form>
    </Modal>
  );
};
