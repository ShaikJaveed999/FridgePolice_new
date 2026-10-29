import React from 'react';
import { FridgeProvider } from './state/FridgeContext';
import { Navbar } from './components/common/Navbar';
import { Toast } from './components/common/Toast';
import { DemoScenariosBanner } from './components/demo/DemoScenariosBanner';
import { MetricsOverview } from './components/dashboard/MetricsOverview';
import { InventoryTable } from './components/inventory/InventoryTable';
import { RequestsList } from './components/requests/RequestsList';
import { ActivityHistorySection } from './components/history/ActivityHistorySection';

export const AppContent: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main
        style={{
          flex: 1,
          maxWidth: '1280px',
          width: '100%',
          margin: '0 auto',
          padding: '1.5rem 1rem',
        }}
      >
        {/* Four Critical Scenarios Control Panel */}
        <DemoScenariosBanner />

        {/* Dashboard Metrics */}
        <MetricsOverview />

        {/* Food Inventory Section */}
        <InventoryTable />

        {/* Portion Requests Section */}
        <RequestsList />

        {/* Audit & Activity Logs */}
        <ActivityHistorySection />
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          padding: '1.5rem 1rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          background: 'rgba(10, 14, 23, 0.8)',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <strong>FridgePolice</strong> — Roommate Food Tracking & Portion Allocations Prototype
          </div>
          <div>
            Built with React 19, TypeScript, Vite & Vitest • Zero-dependency local persistence
          </div>
        </div>
      </footer>

      {/* Floating Toast Alerts */}
      <Toast />
    </div>
  );
};

export default function App() {
  return (
    <FridgeProvider>
      <AppContent />
    </FridgeProvider>
  );
}
