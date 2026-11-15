/**
 * Google Contacts bi-directional sync mapper (Point 58).
 */
export function mapWhatsAppToGoogleContact(jid: string, displayName: string) {
  const phone = `+${jid.replace(/@.*/, '').replace(/\D/g, '')}`;
  return {
    names: [{ displayName: displayName.trim() || phone }],
    phoneNumbers: [{ value: phone, type: 'mobile' }],
  };
}
