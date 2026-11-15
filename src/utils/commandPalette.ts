/**
 * Linda Command Palette dispatcher (Point 65).
 */
export type LindaCommand = 'linda status' | 'linda report' | 'linda sync';

export function parseLindaCommand(input: string): LindaCommand | null {
  const norm = input.trim().toLowerCase();
  if (norm === 'linda status' || norm === 'linda report' || norm === 'linda sync') {
    return norm;
  }
  return null;
}
