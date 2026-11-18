export function isDubaiOutreachWindow(): boolean {
  const now = new Date();
  const dubaiHour = parseInt(
    now.toLocaleTimeString('en-US', { timeZone: 'Asia/Dubai', hour: '2-digit', hour12: false }),
    10
  );
  return dubaiHour >= 9 && dubaiHour < 20;
}
export default isDubaiOutreachWindow;
