import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { useFridge } from '../../state/FridgeContext';
import { DEFAULT_USERS } from '../../domain/seedData';
import { Plus } from 'lucide-react';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose }) => {
  const { state, addFoodItem } = useFridge();

  const [name, setName] = useState('');
  const [owner, setOwner] = useState(state.currentUser);
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState('%');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedQty = parseInt(quantity, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      setError('Quantity must be a positive whole integer (no decimals).');
      return;
    }

    const result = addFoodItem(name, owner, parsedQty, unit, notes);
    if (result.success) {
      setName('');
      setNotes('');
      setQuantity('100');
      onClose();
    } else {
      setError(result.error || 'Failed to add item.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Food Item to Shared Fridge"
      subtitle="Register a new physical item in the shared inventory with a unique ID."
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
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

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Food Item Name *
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Heinz Tomato Ketchup, Pepperoni Pizza, Whole Milk"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Item Owner *
            </label>
            <select
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
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
              Unit Type *
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="%">% (Percentage Full / Remaining)</option>
              <option value="slices">slices</option>
              <option value="portions">portions</option>
              <option value="ml">ml (Milliliters)</option>
              <option value="g">g (Grams)</option>
              <option value="cans">cans / bottles</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Total Initial Quantity (Whole Integer) *
          </label>
          <input
            type="number"
            min="1"
            step="1"
            required
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            style={{ width: '100%' }}
          />
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Integer quantities prevent fractional allocation rounding errors.
          </span>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Notes / Storage Details (Optional)
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Top shelf, please save for breakfast, expires Friday"
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary">
            <Plus size={16} />
            Add Food Item
          </button>
        </div>
      </form>
    </Modal>
  );
};
