/**
 * 08:00 GST Daily Briefing Report Generator (Point 68).
 */
export interface DailyBriefingStats {
  dateLabel: string;
  newLeads: number;
  vipLeads: number;
  viewingsScheduled: number;
}

export function formatDailyBriefing(stats: DailyBriefingStats): string {
  return [
    `White Caves 08:00 GST Briefing — ${stats.dateLabel}`,
    `• New Leads: ${stats.newLeads}`,
    `• VIP / HNW Flags: ${stats.vipLeads}`,
    `• Viewings Scheduled: ${stats.viewingsScheduled}`,
  ].join('\n');
}
