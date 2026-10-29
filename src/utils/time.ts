/**
 * Time utility functions for formatting and mockable clocks
 */

export function formatDateTime(timestamp: number): string {
  if (!timestamp) return '—';
  const d = new Date(timestamp);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

export function formatTimeAgo(timestamp: number, now: number = Date.now()): string {
  if (!timestamp) return '—';
  const diffSec = Math.floor((now - timestamp) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function formatRemainingTime(expiresAt: number, now: number = Date.now()): string {
  const diffMs = expiresAt - now;
  if (diffMs <= 0) return 'Expired';
  const totalSec = Math.ceil(diffMs / 1000);
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}m ${seconds.toString().padStart(2, '0')}s remaining`;
}
