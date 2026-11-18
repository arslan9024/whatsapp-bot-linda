export function reassignLead(ownerPhone: string, onVacation: boolean, backupAgent: string): string {
  return onVacation ? backupAgent : ownerPhone;
}
export default reassignLead;
