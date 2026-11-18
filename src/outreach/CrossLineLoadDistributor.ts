export function getLeastLoadedLine(loads: Record<string, number>): string {
  return Object.keys(loads).reduce((a, b) => loads[a] < loads[b] ? a : b);
}
export default getLeastLoadedLine;
