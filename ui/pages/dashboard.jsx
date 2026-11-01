// ui/pages/dashboard.jsx
/**
 * Dashboard Page
 * Single responsibility: Layout and composition of Linda Visual Operations Center.
 */
import { useEffect, useState } from "react";
import { Box, SimpleGrid, Heading, VStack, useToast } from "@chakra-ui/react";
import io from "socket.io-client";
import Header from "../components/Header";
import MetricCard from "../components/MetricCard";
import LogViewer from "../components/LogViewer";
import CampaignTable from "../components/CampaignTable";
import SessionTable from "../components/SessionTable";
import QuickActions from "../components/QuickActions";
import { getAuthHeaders } from "../lib/auth";

let socket;

export default function Dashboard() {
  const [metrics, setMetrics] = useState({});
  const [logLines, setLogLines] = useState([]);
  const toast = useToast();

  useEffect(() => {
    // 1. Fetch initial snapshot
    fetch("/api/metrics", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then(setMetrics)
      .catch((e) =>
        toast({
          title: "Failed to load metrics",
          description: e.message,
          status: "warning",
          duration: 3000,
        })
      );

    // 2. Setup Socket.IO bridge
    fetch("/api/socket").finally(() => {
      socket = io({ path: "/api/socket" });

      socket.on("metrics", (data) => setMetrics((prev) => ({ ...prev, ...data })));
      socket.on("log", (line) =>
        setLogLines((prev) => [...prev.slice(-199), line])
      );
      socket.on("connect_error", (err) =>
        console.warn("Socket connect notice:", err.message)
      );
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [toast]);

  return (
    <Box p={6} bg="gray.50" minH="100vh">
      <Header />
      <VStack spacing={6} align="stretch" maxW="7xl" mx="auto">
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5}>
          <MetricCard
            title="System Uptime"
            value={metrics.uptime ?? "Measuring..."}
            helperText="Continuous 24/7 supervision"
            colorScheme="teal"
          />
          <MetricCard
            title="Active Sessions"
            value={metrics.activeSessions ?? "0"}
            helperText="WhatsApp linked clients"
            colorScheme="purple"
          />
          <MetricCard
            title="Rate Limiter & Queue"
            value={metrics.rateLimit ?? "Active"}
            helperText="Anti-ban compliance active"
            colorScheme="blue"
          />
        </SimpleGrid>

        <QuickActions />

        <Heading size="sm" color="gray.700" mt={2}>
          Outreach Campaigns & Cadence
        </Heading>
        <CampaignTable />

        <Heading size="sm" color="gray.700" mt={2}>
          WhatsApp Account Roster & Connections
        </Heading>
        <SessionTable />

        <Heading size="sm" color="gray.700" mt={2}>
          Live Event & Diagnostic Stream
        </Heading>
        <LogViewer lines={logLines} />
      </VStack>
    </Box>
  );
}
