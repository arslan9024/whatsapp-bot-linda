export function isInsideDubaiOutreachWindow(now = new Date()): boolean {
  const gstHour = parseInt(
    now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dubai', hour: '2-digit', hour12: false }),
    10
  );
  return gstHour >= 9 && gstHour < 20;
}
export default isInsideDubaiOutreachWindow;
