export interface AccountHealth {
  phone: string;
  score: number;
  grade: 'A' | 'B' | 'C' | 'F';
}

export function scoreAccount(sentToday: number, failures: number): AccountHealth['grade'] {
  if (failures > 3) return 'F';
  if (sentToday > 40) return 'B';
  return 'A';
}
export default scoreAccount;
