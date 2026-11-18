export function checkHeapPressureMB(): number {
  return Math.round(process.memoryUsage().heapUsed / 1048576);
}
export default checkHeapPressureMB;
