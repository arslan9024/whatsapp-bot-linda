/**
 * Automatic DLD / RERA compliance disclaimer injector (Point 64).
 */
export function appendReraDisclaimer(message: string, trakheesiPermit?: string): string {
  const permitLine = trakheesiPermit ? `RERA Permit: ${trakheesiPermit} | ` : '';
  const footer = `\n\n_${permitLine}White Caves Real Estate LLC — DLD Licensed Brokerage._`;
  return message.includes('White Caves Real Estate LLC') ? message : `${message}${footer}`;
}
