// ui/pages/api/campaigns.js
/**
 * UI Campaigns API
 * Single responsibility: Provide campaign listings and allow operational status toggles for UI.
 */
import services from "../../../src/core/ServiceRegistry.js";

export default async function handler(req, res) {
  const campaignEngine = services.get("campaignEngine") || services.get("outreachDailyRunner");

  if (req.method === "GET") {
    // Return registered or active campaigns
    const sampleCampaigns = [
      {
        id: "camp_damac_hills_2",
        name: "Damac Hills 2 Owner Verification",
        status: "active",
        totalContacts: 120,
        sentCount: 84,
      },
      {
        id: "camp_dead_lead_reviver",
        name: "30-Day Dormant Lead Reviver",
        status: "active",
        totalContacts: 45,
        sentCount: 30,
      },
      {
        id: "camp_dubai_marina_investors",
        name: "Dubai Marina Off-Plan Outreach",
        status: "paused",
        totalContacts: 250,
        sentCount: 112,
      },
    ];

    const liveCampaigns = campaignEngine?.getCampaigns?.() || sampleCampaigns;
    return res.status(200).json({ campaigns: liveCampaigns });
  }

  if (req.method === "PATCH") {
    const { id } = req.query;
    const { status } = req.body || {};

    if (!id || !status) {
      return res.status(400).json({ error: "Campaign id and status are required" });
    }

    if (campaignEngine?.updateCampaignStatus) {
      await campaignEngine.updateCampaignStatus(id, status);
    }

    return res.status(200).json({
      success: true,
      id,
      status,
      message: `Campaign ${id} updated to ${status}`,
    });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

