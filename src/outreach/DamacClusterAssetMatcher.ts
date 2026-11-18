const CLUSTERS = ['Amazon', 'Coursetia', 'Sanctuary', 'Vardon', 'Zinnia'];

export function matchCluster(unitStr: string): string | null {
  for (const c of CLUSTERS) {
    if (new RegExp(c, 'i').test(unitStr)) return c;
  }
  return null;
}
export default matchCluster;
