import React from 'react';
import { useFridge } from '../../state/FridgeContext';
import { DEFAULT_USERS } from '../../domain/seedData';
import { ShieldCheck, RotateCcw, User } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { state, setCurrentUser, resetAllDemoData } = useFridge();

  const handleReset = () => {
    if (window.confirm('Reset all demo data back to the clean default seed state?')) {
      resetAllDemoData();
    }
  };

  return (
    <header
      className="glass-panel"
      style={{
        borderRadius: 0,
        borderTop: 'none',
        borderLeft: 'none',
        borderRight: 'none',
        borderBottom: '1px solid var(--border-color)',
        padding: '0.85rem 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(10, 14, 23, 0.85)',
      }}
    >
      <div
        style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #38bdf8 0%, #0369a1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(56, 189, 248, 0.4)',
            }}
          >
            <ShieldCheck size={22} color="#04121e" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  letterSpacing: '-0.02em',
                  background: 'linear-gradient(to right, #f8fafc, #94a3b8)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                FridgePolice
              </span>
              <span
                className="badge badge-approved"
                style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem' }}
              >
                Prototype
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              Roommate Food Inventory & Portion Allocation
            </div>
          </div>
        </div>

        {/* Roommate Switcher & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          {/* User selector */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'var(--bg-elevated)',
              padding: '0.3rem 0.5rem 0.3rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
              <User size={14} color="var(--color-primary)" />
              <span>Viewing As:</span>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              {DEFAULT_USERS.map((user) => {
                const isActive = state.currentUser === user;
                return (
                  <button
                    key={user}
                    onClick={() => setCurrentUser(user)}
                    style={{
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.8rem',
                      fontWeight: isActive ? 700 : 500,
                      borderRadius: 'var(--radius-sm)',
                      background: isActive
                        ? 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)'
                        : 'transparent',
                      color: isActive ? '#04121e' : 'var(--text-secondary)',
                      boxShadow: isActive ? '0 1px 4px rgba(56, 189, 248, 0.3)' : 'none',
                    }}
                  >
                    {user}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset button */}
          <button
            onClick={handleReset}
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--text-secondary)' }}
            title="Reset data to initial state"
          >
            <RotateCcw size={14} />
            <span>Reset Demo</span>
          </button>
        </div>
      </div>
    </header>
  );
};
