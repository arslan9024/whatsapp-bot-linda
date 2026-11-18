export function isNearPrayerTime(hourGST: number, minuteGST: number): boolean {
  return (hourGST === 12 && minuteGST >= 20 && minuteGST <= 45);
}
export default isNearPrayerTime;
