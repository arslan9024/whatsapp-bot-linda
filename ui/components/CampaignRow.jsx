// ui/components/CampaignRow.jsx
/**
 * CampaignRow Component
 * Single responsibility: Render an individual campaign row in the table with controls.
 */
import { Tr, Td, Badge, Button, HStack, Text } from "@chakra-ui/react";

export default function CampaignRow({ campaign, onToggleStatus }) {
  const isRunning = campaign.status === "active" || campaign.status === "running";

  return (
    <Tr>
      <Td fontWeight="medium">{campaign.name || campaign.id}</Td>
      <Td>
        <Badge colorScheme={isRunning ? "green" : "yellow"} px={2} py={0.5} borderRadius="md">
          {campaign.status}
        </Badge>
      </Td>
      <Td isNumeric>{campaign.totalContacts || 0}</Td>
      <Td isNumeric>{campaign.sentCount || 0}</Td>
      <Td isNumeric>
        <Text color="teal.600" fontWeight="bold">
          {campaign.totalContacts > 0
            ? `${Math.round(((campaign.sentCount || 0) / campaign.totalContacts) * 100)}%`
            : "0%"}
        </Text>
      </Td>
      <Td>
        <HStack spacing={2}>
          <Button
            size="xs"
            colorScheme={isRunning ? "orange" : "teal"}
            variant="solid"
            onClick={() => onToggleStatus(campaign.id, isRunning ? "paused" : "active")}
          >
            {isRunning ? "Pause" : "Resume"}
          </Button>
        </HStack>
      </Td>
    </Tr>
  );
}

