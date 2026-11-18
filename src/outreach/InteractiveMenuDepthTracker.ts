const sessionDepth = new Map<string, number>();

export function stepIntoMenu(user: string): number {
  const d = (sessionDepth.get(user) || 0) + 1;
  sessionDepth.set(user, d);
  return d;
}

export function stepOutMenu(user: string): number {
  const d = Math.max(0, (sessionDepth.get(user) || 0) - 1);
  sessionDepth.set(user, d);
  return d;
}
export default { stepIntoMenu, stepOutMenu };
