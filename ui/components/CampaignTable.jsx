// ui/components/CampaignTable.jsx
/**
 * CampaignTable Component
 * Single responsibility: Render campaign management table and dispatch status toggling actions.
 */
import { useEffect, useState } from "react";
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Spinner,
  Text,
  useToast,
  Flex,
  Badge,
} from "@chakra-ui/react";
import CampaignRow from "./CampaignRow";
import { getAuthHeaders } from "../lib/auth";

export default function CampaignTable() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadCampaigns = async () => {
    try {
      const res = await fetch("/api/campaigns", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      const data = await res.json();
      setCampaigns(data.campaigns || []);
    } catch (err) {
      toast({
        title: "Campaigns load error",
        description: err.message,
        status: "warning",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleToggleStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`/api/campaigns?id=${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Status update failed");
      toast({
        title: "Campaign updated",
        description: `Campaign is now ${newStatus}`,
        status: "success",
        duration: 2000,
      });
      loadCampaigns();
    } catch (err) {
      toast({
        title: "Update failed",
        description: err.message,
        status: "error",
        duration: 3000,
      });
    }
  };

  if (loading) {
    return (
      <Flex p={6} justify="center" align="center" bg="white" borderRadius="lg" shadow="sm">
        <Spinner size="md" color="teal.500" mr={3} />
        <Text color="gray.600">Loading campaign registries...</Text>
      </Flex>
    );
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" overflow="hidden" shadow="md" bg="white">
      <Flex p={3} bg="gray.50" justify="space-between" align="center" borderBottomWidth="1px">
        <Text fontWeight="bold" color="gray.700">
          Active & Scheduled Outreach Campaigns
        </Text>
        <Badge colorScheme="teal">{campaigns.length} total</Badge>
      </Flex>
      <Table variant="simple" size="sm">
        <Thead bg="gray.100">
          <Tr>
            <Th>Campaign Name / ID</Th>
            <Th>Status</Th>
            <Th isNumeric>Target</Th>
            <Th isNumeric>Sent</Th>
            <Th isNumeric>Progress</Th>
            <Th>Actions</Th>
          </Tr>
        </Thead>
        <Tbody>
          {campaigns.length === 0 ? (
            <Tr>
              <Th colSpan={6} textAlign="center" py={4} color="gray.500">
                No active outreach campaigns registered.
              </Th>
            </Tr>
          ) : (
            campaigns.map((camp) => (
              <CampaignRow
                key={camp.id || camp._id}
                campaign={camp}
                onToggleStatus={handleToggleStatus}
              />
            ))
          )}
        </Tbody>
      </Table>
    </Box>
  );
}
