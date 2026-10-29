import React from 'react';
import { useFridge } from '../../state/FridgeContext';
import { Package, CheckCircle, Clock, AlertTriangle, PieChart } from 'lucide-react';

export const MetricsOverview: React.FC = () => {
  const { metrics } = useFridge();

  const cards = [
    {
      title: 'Physical Food Items',
      value: metrics.totalItems,
      subtitle: 'Active physical items',
      icon: <Package size={20} color="#38bdf8" />,
      accent: '#38bdf8',
      bgGlow: 'rgba(56, 189, 248, 0.1)',
    },
    {
      title: 'Available Inventory',
      value: metrics.totalAvailable,
      subtitle: 'Sum of unreserved units',
      icon: <CheckCircle size={20} color="#10b981" />,
      accent: '#10b981',
      bgGlow: 'rgba(16, 185, 129, 0.1)',
    },
    {
      title: 'Pending Requests',
      value: metrics.pendingCount,
      subtitle: 'Awaiting owner approval',
      icon: <Clock size={20} color="#f59e0b" />,
      accent: '#f59e0b',
      bgGlow: 'rgba(245, 158, 11, 0.1)',
    },
    {
      title: 'Active Reservations',
      value: metrics.activeReservationsCount,
      subtitle: 'Approved & locked portions',
      icon: <PieChart size={20} color="#a855f7" />,
      accent: '#a855f7',
      bgGlow: 'rgba(168, 85, 247, 0.1)',
    },
    {
      title: 'Expired Requests',
      value: metrics.expiredCount,
      subtitle: 'Unclaimed & returned to fridge',
      icon: <AlertTriangle size={20} color="#94a3b8" />,
      accent: '#94a3b8',
      bgGlow: 'rgba(148, 163, 184, 0.1)',
    },
  ];

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}
    >
      {cards.map((c, i) => (
        <div
          key={i}
          className="glass-panel"
          style={{
            padding: '1.25rem',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            background: `linear-gradient(135deg, ${c.bgGlow} 0%, rgba(17, 24, 39, 0.8) 100%)`,
            border: '1px solid var(--border-color)',
            transition: 'transform 0.2s ease, border-color 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              {c.title}
            </span>
            <div
              style={{
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                background: 'rgba(255, 255, 255, 0.05)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {c.icon}
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '2rem',
                fontWeight: 800,
                fontFamily: 'var(--font-heading)',
                color: 'var(--text-primary)',
                lineHeight: 1.1,
              }}
            >
              {c.value}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {c.subtitle}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
