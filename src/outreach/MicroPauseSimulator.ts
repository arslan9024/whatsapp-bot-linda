export async function simulateMicroPause(minMs = 300, maxMs = 900) {
  const d = Math.floor(Math.random() * (maxMs - minMs) + minMs);
  await new Promise(r => setTimeout(r, d));
}
export default simulateMicroPause;
