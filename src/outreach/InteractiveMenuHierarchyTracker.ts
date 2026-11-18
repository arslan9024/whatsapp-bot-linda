const menuPath = new Map<string, string[]>();

export function pushMenu(user: string, menu: string): void {
  const cur = menuPath.get(user) || [];
  cur.push(menu);
  menuPath.set(user, cur);
}

export function popMenu(user: string): string | null {
  const cur = menuPath.get(user) || [];
  return cur.pop() || null;
}
export default { pushMenu, popMenu };
