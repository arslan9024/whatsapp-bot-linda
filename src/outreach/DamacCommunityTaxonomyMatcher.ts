const DH2_CLUSTERS = ['Amazon', 'Coursetia', 'Sanctuary', 'Vardon', 'Zinnia', 'Pacifica'];

export function identifyDamacCluster(query: string): string | null {
  for (const c of DH2_CLUSTERS) {
    if (new RegExp(c, 'i').test(query)) return c;
  }
  return null;
}
export default identifyDamacCluster;
