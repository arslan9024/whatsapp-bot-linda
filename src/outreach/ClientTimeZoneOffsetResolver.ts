export function getClientLocalHour(tzOffsetHours = 4): number {
  const utc = new Date().getUTCHours();
  return (utc + tzOffsetHours) % 24;
}
export default getClientLocalHour;
