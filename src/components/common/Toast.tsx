import React from 'react';
import { useFridge } from '../../state/FridgeContext';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export const Toast: React.FC = () => {
  const { toast, clearToast } = useFridge();

  if (!toast) return null;

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        right: '1.5rem',
        zIndex: 9999,
        maxWidth: '420px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        className="glass-panel"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          padding: '0.875rem 1.15rem',
          borderRadius: 'var(--radius-md)',
          background: isError
            ? 'rgba(30, 15, 20, 0.95)'
            : isSuccess
            ? 'rgba(10, 30, 20, 0.95)'
            : 'rgba(17, 24, 39, 0.95)',
          border: `1px solid ${
            isError
              ? 'var(--color-danger-border)'
              : isSuccess
              ? 'var(--color-success-border)'
              : 'var(--border-accent)'
          }`,
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ marginTop: '2px', flexShrink: 0 }}>
          {isSuccess && <CheckCircle2 size={18} color="var(--color-success)" />}
          {isError && <AlertCircle size={18} color="var(--color-danger)" />}
          {!isSuccess && !isError && <Info size={18} color="var(--color-primary)" />}
        </div>
        <div style={{ flex: 1, fontSize: '0.875rem', lineHeight: '1.4' }}>
          <div
            style={{
              fontWeight: 600,
              color: isError ? '#fca5a5' : isSuccess ? '#86efac' : 'var(--text-primary)',
              marginBottom: '2px',
            }}
          >
            {isError ? 'Action Blocked / Error' : isSuccess ? 'Success' : 'Notification'}
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>{toast.message}</div>
        </div>
        <button
          onClick={clearToast}
          style={{
            color: 'var(--text-muted)',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};
