export function checkOutreachRateLimit(sentLastMinute: number, threshold = 15): boolean {
  return sentLastMinute <= threshold;
}
export default checkOutreachRateLimit;
