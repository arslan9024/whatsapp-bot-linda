// ui/components/SessionRow.jsx
/**
 * SessionRow Component
 * Single responsibility: Render an individual WhatsApp session row in the session viewer.
 */
import { Tr, Td, Badge, Button, Text } from "@chakra-ui/react";

export default function SessionRow({ session, onReconnect }) {
  const isConnected = session.status === "connected" || session.status === "ready";

  return (
    <Tr>
      <Td fontWeight="semibold">{session.id || session.sessionId}</Td>
      <Td>{session.phone || "Master"}</Td>
      <Td>
        <Badge
          colorScheme={isConnected ? "green" : "red"}
          px={2}
          py={0.5}
          borderRadius="md"
        >
          {session.status || "offline"}
        </Badge>
      </Td>
      <Td>
        <Text fontSize="xs" color="gray.500">
          {session.lastActive ? new Date(session.lastActive).toLocaleTimeString() : "N/A"}
        </Text>
      </Td>
      <Td>
        <Button
          size="xs"
          colorScheme="blue"
          variant="outline"
          onClick={() => onReconnect(session.id || session.sessionId)}
        >
          Ping / Refresh
        </Button>
      </Td>
    </Tr>
  );
}
