// ui/pages/api/campaigns.js
/**
 * UI Campaigns API
 * Single responsibility: Serve campaign data and handle status toggle actions.
 * Returns live-feeling mock data when no bot process is connected.
 */

// In-memory store for campaign status overrides (persists for current process lifetime)
const campaignOverrides = {};

const DEFAULT_CAMPAIGNS = [
  {
    id: "camp_damac_hills_2",
    name: "Damac Hills 2 — Owner Verification Outreach",
    status: "active",
    totalContacts: 120,
    sentCount: 84,
    lastRun: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  {
    id: "camp_dead_lead_reviver",
    name: "30-Day Dormant Lead Reviver",
    status: "active",
    totalContacts: 45,
    sentCount: 30,
    lastRun: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: "camp_dubai_marina_investors",
    name: "Dubai Marina Off-Plan Investor Outreach",
    status: "paused",
    totalContacts: 250,
    sentCount: 112,
    lastRun: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: "camp_jumeirah_luxury",
    name: "Jumeirah Luxury Properties — VIP Leads",
    status: "active",
    totalContacts: 75,
    sentCount: 21,
    lastRun: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
  },
];

export default function handler(req, res) {
  if (req.method === "GET") {
    const campaigns = DEFAULT_CAMPAIGNS.map((camp) => ({
      ...camp,
      status: campaignOverrides[camp.id] ?? camp.status,
    }));
    return res.status(200).json({ campaigns, total: campaigns.length });
  }

  if (req.method === "PATCH") {
    const { id } = req.query;
    const { status } = req.body || {};

    if (!id || !status) {
      return res.status(400).json({ error: "Campaign id and status required" });
    }

    const validStatuses = ["active", "paused", "completed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(", ")}` });
    }

    campaignOverrides[id] = status;
    return res.status(200).json({ success: true, id, status, updatedAt: new Date().toISOString() });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
