import React, { useState } from 'react';
import { useFridge } from '../../state/FridgeContext';
import type { FoodItem } from '../../types';
import { formatShortId } from '../../utils/id';
import { AddItemModal } from './AddItemModal';
import { ReconcileModal } from './ReconcileModal';
import { RequestPortionModal } from './RequestPortionModal';
import {
  Plus,
  Search,
  Scale,
  Trash2,
  Send,
  Copy,
  Check,
} from 'lucide-react';

export const InventoryTable: React.FC = () => {
  const { state, getItemQuantities, discardFood, showToast } = useFridge();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'discarded'>('all');

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [reconcileItem, setReconcileItem] = useState<FoodItem | null>(null);
  const [requestItem, setRequestItem] = useState<FoodItem | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (id: string) => {
    navigator.clipboard?.writeText(id);
    setCopiedId(id);
    showToast(`Copied ID ${id} to clipboard!`, 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDiscard = (item: FoodItem) => {
    const reason = window.prompt(
      `Are you sure you want to discard/spoil "${item.name}"? Enter reason:`,
      'Spoiled or passed expiration date'
    );
    if (reason !== null) {
      discardFood(item.id, reason);
    }
  };

  const filteredItems = state.foodItems.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.owner.toLowerCase().includes(search.toLowerCase()) ||
      item.id.toLowerCase().includes(search.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? item.status === 'active'
        : item.status !== 'active';

    return matchesSearch && matchesStatus;
  });

  return (
    <section className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Top Header & Actions */}
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
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Food Inventory</h2>
            <span className="badge badge-approved" style={{ fontSize: '0.7rem' }}>
              {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Authoritative physical fridge tracking with distinct unique item IDs
          </p>
        </div>

        <button onClick={() => setIsAddOpen(true)} className="btn btn-primary">
          <Plus size={16} />
          Add Food Item
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        <div style={{ position: 'relative', minWidth: '260px', flex: '1 1 260px' }}>
          <Search
            size={16}
            color="var(--text-muted)"
            style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            type="text"
            placeholder="Search items, owners, or IDs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: '2.25rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.35rem' }}>
          {(['all', 'active', 'discarded'] as const).map((sf) => (
            <button
              key={sf}
              onClick={() => setStatusFilter(sf)}
              className="btn btn-sm"
              style={{
                background: statusFilter === sf ? 'var(--bg-elevated)' : 'transparent',
                color: statusFilter === sf ? 'var(--text-primary)' : 'var(--text-muted)',
                border: `1px solid ${statusFilter === sf ? 'var(--border-accent)' : 'transparent'}`,
                textTransform: 'capitalize',
              }}
            >
              {sf}
            </button>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      {filteredItems.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '3rem 1rem',
            color: 'var(--text-muted)',
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-color)',
          }}
        >
          No food items match the selected filter.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.875rem',
              textAlign: 'left',
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.75rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                <th style={{ padding: '0.75rem 0.5rem' }}>Food Item & ID</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Owner</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Total Recorded</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Reserved</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Available</th>
                <th style={{ padding: '0.75rem 0.5rem', minWidth: '130px' }}>Allocation Bar</th>
                <th style={{ padding: '0.75rem 0.5rem' }}>Status</th>
                <th style={{ padding: '0.75rem 0.5rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const q = getItemQuantities(item);
                const isDiscarded = item.status !== 'active';
                const percentReserved = item.totalQuantity > 0 ? (q.reservedQuantity / item.totalQuantity) * 100 : 0;
                const percentAvailable = item.totalQuantity > 0 ? (q.availableQuantity / item.totalQuantity) * 100 : 0;

                return (
                  <tr
                    key={item.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.15s ease',
                      opacity: isDiscarded ? 0.65 : 1,
                    }}
                  >
                    {/* Name and ID */}
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.name}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '3px' }}>
                        <span className="badge-id" title={item.id}>
                          {formatShortId(item.id)}
                        </span>
                        <button
                          onClick={() => handleCopyId(item.id)}
                          style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                          title="Copy Full UUID"
                        >
                          {copiedId === item.id ? <Check size={12} color="var(--color-success)" /> : <Copy size={12} />}
                        </button>
                      </div>
                      {item.notes && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {item.notes}
                        </div>
                      )}
                    </td>

                    {/* Owner */}
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span
                        style={{
                          fontWeight: 600,
                          padding: '0.2rem 0.5rem',
                          borderRadius: 'var(--radius-sm)',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {item.owner}
                      </span>
                    </td>

                    {/* Total */}
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 600 }}>
                      {item.totalQuantity} <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.unit}</span>
                    </td>

                    {/* Reserved */}
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          color: q.reservedQuantity > 0 ? 'var(--color-primary)' : 'var(--text-muted)',
                        }}
                      >
                        {q.reservedQuantity} <span style={{ fontSize: '0.75rem' }}>{item.unit}</span>
                      </span>
                    </td>

                    {/* Available */}
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '1rem',
                          color: q.availableQuantity > 0 ? 'var(--color-success)' : '#f87171',
                        }}
                      >
                        {q.availableQuantity} <span style={{ fontSize: '0.75rem' }}>{item.unit}</span>
                      </span>
                    </td>

                    {/* Visual Progress Bar */}
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <div
                        style={{
                          width: '100%',
                          height: '8px',
                          background: 'var(--bg-elevated)',
                          borderRadius: 'var(--radius-full)',
                          overflow: 'hidden',
                          display: 'flex',
                        }}
                        title={`Available: ${percentAvailable.toFixed(0)}%, Reserved: ${percentReserved.toFixed(0)}%`}
                      >
                        <div
                          style={{
                            width: `${percentAvailable}%`,
                            background: 'var(--color-success)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                        <div
                          style={{
                            width: `${percentReserved}%`,
                            background: 'var(--color-primary)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.85rem 0.5rem' }}>
                      <span className={`badge badge-${item.status}`}>
                        {item.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        {!isDiscarded && (
                          <>
                            <button
                              onClick={() => setRequestItem(item)}
                              className="btn btn-secondary btn-sm"
                              title="Request Portion"
                              disabled={q.availableQuantity <= 0}
                            >
                              <Send size={13} />
                              <span>Request</span>
                            </button>
                            <button
                              onClick={() => setReconcileItem(item)}
                              className="btn btn-secondary btn-sm"
                              title="Reconcile / Correct Physical Inventory"
                            >
                              <Scale size={13} />
                              <span>Reconcile</span>
                            </button>
                            <button
                              onClick={() => handleDiscard(item)}
                              className="btn btn-danger btn-sm"
                              title="Mark Spoiled / Discarded"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
                        )}
                        {isDiscarded && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Discarded
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <AddItemModal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} />
      <ReconcileModal
        item={reconcileItem}
        isOpen={!!reconcileItem}
        onClose={() => setReconcileItem(null)}
      />
      <RequestPortionModal
        item={requestItem}
        isOpen={!!requestItem}
        onClose={() => setRequestItem(null)}
      />
    </section>
  );
};
