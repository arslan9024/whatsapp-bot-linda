// ui/components/SessionTable.jsx
/**
 * SessionTable Component
 * Single responsibility: Render the WhatsApp session monitoring table and handle session operations.
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
import SessionRow from "./SessionRow";
import { getAuthHeaders } from "../lib/auth";

export default function SessionTable() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadSessions = async () => {
    try {
      const res = await fetch("/api/sessions", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch sessions");
      const data = await res.json();
      setSessions(data.sessions || []);
    } catch (err) {
      toast({
        title: "Session load error",
        description: err.message,
        status: "warning",
        duration: 3000,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const handleReconnect = async (sessionId) => {
    try {
      const res = await fetch(`/api/sessions?id=${encodeURIComponent(sessionId)}`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to ping session");
      toast({
        title: "Session pinged",
        description: `Session ${sessionId} ping verified`,
        status: "info",
        duration: 2000,
      });
      loadSessions();
    } catch (err) {
      toast({
        title: "Ping failed",
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
        <Text color="gray.600">Loading session descriptors...</Text>
      </Flex>
    );
  }

  return (
    <Box borderWidth="1px" borderRadius="lg" overflow="hidden" shadow="md" bg="white">
      <Flex p={3} bg="gray.50" justify="space-between" align="center" borderBottomWidth="1px">
        <Text fontWeight="bold" color="gray.700">
          WhatsApp Multi-Account Sessions
        </Text>
        <Badge colorScheme="purple">{sessions.length} tracked</Badge>
      </Flex>
      <Table variant="simple" size="sm">
        <Thead bg="gray.100">
          <Tr>
            <Th>Session ID</Th>
            <Th>Target Account</Th>
            <Th>Status</Th>
            <Th>Last Activity</Th>
            <Th>Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {sessions.length === 0 ? (
            <Tr>
              <Th colSpan={5} textAlign="center" py={4} color="gray.500">
                No active session locks detected.
              </Th>
            </Tr>
          ) : (
            sessions.map((sess) => (
              <SessionRow
                key={sess.id || sess.sessionId}
                session={sess}
                onReconnect={handleReconnect}
              />
            ))
          )}
        </Tbody>
      </Table>
    </Box>
  );
}

