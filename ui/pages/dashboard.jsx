// ui/pages/dashboard.jsx
/**
 * Dashboard Page
 * Single responsibility: Compose and layout the Linda Visual Operations Center.
 * Includes: metric tiles, quick actions, terminal panel, live logs,
 * campaign manager, and session viewer.
 */
import { useEffect, useState } from "react";
import {
  Box,
  SimpleGrid,
  Heading,
  VStack,
  useToast,
  Divider,
  HStack,
  Text,
  Badge,
} from "@chakra-ui/react";
import io from "socket.io-client";
import Header from "../components/Header";
import MetricCard from "../components/MetricCard";
import LogViewer from "../components/LogViewer";
import CampaignTable from "../components/CampaignTable";
import SessionTable from "../components/SessionTable";
import QuickActions from "../components/QuickActions";
import TerminalPanel from "../components/TerminalPanel";
import { getAuthHeaders } from "../lib/auth";

let socket;

export default function Dashboard() {
  const [metrics, setMetrics] = useState({});
  const [logLines, setLogLines] = useState([]);
  const toast = useToast();

  useEffect(() => {
    // Initial metrics snapshot
    fetch("/api/metrics", { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then(setMetrics)
      .catch((e) => toast({ title: "Metrics error", description: e.message, status: "warning", duration: 3000 }));

    // Socket.IO real-time bridge
    fetch("/api/socket").finally(() => {
      socket = io({ path: "/api/socket" });
      socket.on("metrics", (data) => setMetrics((prev) => ({ ...prev, ...data })));
      socket.on("log", (line) => setLogLines((prev) => [...prev.slice(-249), line]));
    });

    return () => { if (socket) socket.disconnect(); };
  }, [toast]);

  return (
    <Box p={6} bg="gray.50" minH="100vh">
      <Header />

      <VStack spacing={6} align="stretch" maxW="1200px" mx="auto">

        {/* Metric tiles */}
        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={4}>
          <MetricCard title="Uptime" value={metrics.uptime ?? "—"} helperText="24/7 supervisor active" colorScheme="teal" />
          <MetricCard title="Active Sessions" value={metrics.activeSessions ?? "0"} helperText="WhatsApp accounts linked" colorScheme="purple" />
          <MetricCard title="Rate Limiter" value={metrics.rateLimit ?? "Active"} helperText="Anti-ban compliance" colorScheme="blue" />
          <MetricCard title="Memory (RSS)" value={metrics.memory ?? "—"} helperText={metrics.heapUsed ?? ""} colorScheme="orange" />
        </SimpleGrid>

        <Divider />

        {/* Administrative quick actions */}
        <Box>
          <SectionLabel label="Administrative Operations" sub="Click any button to run the script and view output" />
          <QuickActions />
        </Box>

        <Divider />

        {/* Terminal panel — interactive command runner */}
        <Box>
          <SectionLabel label="Interactive Terminal" sub="Type commands to execute bot operations directly from the browser" />
          <TerminalPanel />
        </Box>

        <Divider />

        {/* Campaign manager */}
        <Box>
          <SectionLabel label="Outreach Campaigns" sub="Manage and toggle active campaign status" />
          <CampaignTable />
        </Box>

        <Divider />

        {/* Session viewer */}
        <Box>
          <SectionLabel label="WhatsApp Account Sessions" sub="Monitor active connections and send ping requests" />
          <SessionTable />
        </Box>

        <Divider />

        {/* Live log stream */}
        <Box>
          <SectionLabel label="Live Event Stream" sub="Real-time bot activity log — auto-scrolls and supports filtering" />
          <LogViewer lines={logLines} />
        </Box>

      </VStack>
    </Box>
  );
}

function SectionLabel({ label, sub }) {
  return (
    <HStack mb={3} align="baseline" spacing={3}>
      <Heading size="sm" color="gray.700">{label}</Heading>
      <Text fontSize="xs" color="gray.500">{sub}</Text>
    </HStack>
  );
}
