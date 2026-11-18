export function isDubaiWeekend(): boolean {
  const day = new Date().getDay();
  return day === 5 || day === 6; // Fri or Sat in traditional UAE cadence
}
export default isDubaiWeekend;
