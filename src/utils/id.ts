/**
 * Generates a unique identifier.
 * Uses crypto.randomUUID if available, with a reliable fallback for older runtimes/tests.
 */
export function generateId(prefix: string = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  const randomPart = Math.random().toString(36).substring(2, 10);
  const timePart = Date.now().toString(36);
  return `${prefix}_${timePart}_${randomPart}`;
}

/**
 * Truncates an ID for clean badge display (e.g. "id_1a2b...c3d4" -> "1a2b...c3d4" or "#1a2b")
 */
export function formatShortId(id: string): string {
  const parts = id.split('_');
  const raw = parts.length > 1 ? parts[parts.length - 1] : id;
  if (raw.length <= 8) return `#${raw}`;
  return `#${raw.substring(0, 4)}…${raw.substring(raw.length - 4)}`;
}
