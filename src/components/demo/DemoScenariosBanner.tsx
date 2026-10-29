import React, { useState } from 'react';
import { useFridge } from '../../state/FridgeContext';
import { Sparkles, ShieldAlert, Clock, Copy, Scale, ChevronDown, ChevronUp } from 'lucide-react';

export const DemoScenariosBanner: React.FC = () => {
  const { loadScenario } = useFridge();
  const [activeScenarioGuide, setActiveScenarioGuide] = useState<number | null>(1);

  const scenarios = [
    {
      num: 1 as const,
      title: 'Scenario 1: Double Allocation',
      subtitle: 'Competing 25% Pizza Requests',
      icon: <ShieldAlert size={16} color="#38bdf8" />,
      accent: '#38bdf8',
      guide: (
        <div>
          <p style={{ marginBottom: '0.4rem' }}>
            <strong>How to reproduce:</strong> Sets up <strong>Pepperoni Pizza (25% remaining)</strong> with two pending requests of 25% each from <strong>Bob</strong> and <strong>Charlie</strong>.
          </p>
          <ol style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: '1.6' }}>
            <li>In Portion Requests below, click <strong>"Approve"</strong> on Bob’s 25% request. Available pizza drops from 25% to <strong>0%</strong> (25% reserved).</li>
            <li>Now click <strong>"Approve"</strong> on Charlie’s competing 25% request.</li>
            <li>Observe that the system <strong>atomically rejects</strong> Charlie’s approval with an explicit error toast: <em>"Insufficient unreserved quantity available. Only 0% unreserved"</em>.</li>
          </ol>
        </div>
      ),
    },
    {
      num: 2 as const,
      title: 'Scenario 2: Expiry & Lifecycle',
      subtitle: 'Unclaimed Portions & Spoilage',
      icon: <Clock size={16} color="#a855f7" />,
      accent: '#a855f7',
      guide: (
        <div>
          <p style={{ marginBottom: '0.4rem' }}>
            <strong>How to reproduce:</strong> Sets up <strong>Cheesecake (4 slices total)</strong> with 1 slice approved for Bob (leaving 3 slices available).
          </p>
          <ol style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: '1.6' }}>
            <li>Locate Bob’s approved reservation in Portion Requests. Notice the countdown timer.</li>
            <li>Click <strong>"Simulate Expiry Now"</strong> (or wait for countdown). Status becomes <strong>Expired</strong>, and available slices instantly return from 3 to <strong>4</strong>!</li>
            <li>Attempting to claim an expired reservation is strictly prevented.</li>
            <li>Alternatively, click <strong>"Discard"</strong> on an item to see all its reservations immediately cancelled and future claims permanently blocked.</li>
          </ol>
        </div>
      ),
    },
    {
      num: 3 as const,
      title: 'Scenario 3: Identical Food Names',
      subtitle: 'Unique IDs for Duplicate Names',
      icon: <Copy size={16} color="#10b981" />,
      accent: '#10b981',
      guide: (
        <div>
          <p style={{ marginBottom: '0.4rem' }}>
            <strong>How to reproduce:</strong> Sets up two items both titled <strong>"Heinz Tomato Ketchup"</strong>, one owned by <strong>Alice (100%)</strong> and one by <strong>Bob (45%)</strong>.
          </p>
          <ol style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: '1.6' }}>
            <li>Inspect the Food Inventory table below. Notice each ketchup has a unique physical item ID badge (e.g. <code>#item_ketchup_alice...</code> vs <code>#item_ketchup_bob...</code>).</li>
            <li>Request a 20% portion from Alice’s ketchup and approve it.</li>
            <li>Notice Alice’s bottle now shows 80% available, while Bob’s ketchup bottle remains completely untouched at 45% available.</li>
          </ol>
        </div>
      ),
    },
    {
      num: 4 as const,
      title: 'Scenario 4: Inventory Reconciliation',
      subtitle: 'Safe Shortage & FIFO Handling',
      icon: <Scale size={16} color="#f59e0b" />,
      accent: '#f59e0b',
      guide: (
        <div>
          <p style={{ marginBottom: '0.4rem' }}>
            <strong>How to reproduce:</strong> Sets up <strong>Fresh Orange Juice (100% recorded)</strong> with <strong>60% reserved</strong> (Alice: 30% approved earlier, Bob: 30% approved later).
          </p>
          <ol style={{ paddingLeft: '1.25rem', margin: 0, lineHeight: '1.6' }}>
            <li>In Food Inventory, click <strong>"Reconcile"</strong> on Fresh Orange Juice.</li>
            <li>Enter actual physical quantity: <strong>40</strong>% (less than the 60% reserved!).</li>
            <li>Notice the modal preview showing that Bob’s reservation will be cancelled to prevent over-allocation.</li>
            <li>Click <strong>"Confirm Correction"</strong>: Alice’s earlier reservation is safely preserved (30%), Bob’s is cancelled via FIFO deterministic priority, and available becomes 10%.</li>
          </ol>
        </div>
      ),
    },
  ];

  return (
    <section className="glass-panel" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={18} color="var(--color-primary)" />
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700 }}>
            Interactive Demo Scenarios
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            (Click any scenario to configure test state)
          </span>
        </div>
      </div>

      {/* Scenario Buttons */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1rem',
        }}
      >
        {scenarios.map((sc) => {
          const isExpanded = activeScenarioGuide === sc.num;
          return (
            <div
              key={sc.num}
              style={{
                background: isExpanded ? 'var(--bg-elevated)' : 'rgba(255, 255, 255, 0.03)',
                border: `1px solid ${isExpanded ? sc.accent : 'var(--border-color)'}`,
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ marginTop: '2px' }}>{sc.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                    {sc.title}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {sc.subtitle}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  onClick={() => {
                    loadScenario(sc.num);
                    setActiveScenarioGuide(sc.num);
                  }}
                  className="btn btn-sm"
                  style={{
                    flex: 1,
                    background: `linear-gradient(135deg, ${sc.accent}22 0%, ${sc.accent}44 100%)`,
                    color: sc.accent,
                    border: `1px solid ${sc.accent}66`,
                    fontWeight: 600,
                  }}
                >
                  Load Scenario {sc.num}
                </button>
                <button
                  onClick={() => setActiveScenarioGuide(isExpanded ? null : sc.num)}
                  className="btn btn-secondary btn-sm"
                  style={{ padding: '0.35rem 0.5rem' }}
                  title="Toggle instructions"
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Guide Card */}
      {activeScenarioGuide && (
        <div
          style={{
            background: 'rgba(56, 189, 248, 0.04)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem 1.25rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary)',
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            style={{
              fontWeight: 700,
              color: 'var(--color-primary)',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Inspector & Walkthrough Guide for Scenario {activeScenarioGuide}:</span>
            <button
              onClick={() => setActiveScenarioGuide(null)}
              style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'underline' }}
            >
              Hide Guide
            </button>
          </div>
          {scenarios.find((s) => s.num === activeScenarioGuide)?.guide}
        </div>
      )}
    </section>
  );
};
