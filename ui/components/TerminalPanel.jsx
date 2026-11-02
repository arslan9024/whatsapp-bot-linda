// ui/components/TerminalPanel.jsx
/**
 * TerminalPanel Component
 * Single responsibility: Render an interactive terminal emulator that runs
 * whitelisted bot commands and displays their output live.
 */
import { useState } from "react";
import {
  Box,
  Flex,
  Input,
  Button,
  Text,
  Badge,
  VStack,
  HStack,
  useToast,
} from "@chakra-ui/react";
import { getAuthHeaders } from "../lib/auth";

const COMMAND_MAP = {
  doctor: "doctor",
  status: "status",
  "list-sessions": "list-sessions",
  "backup-verify": "backup-verify",
  "clean-sessions": "clean-sessions",
  help: null,
};

const HELP_TEXT = `Available commands:
  doctor          — Run 12-check system health test
  status          — Show live bot status panel
  list-sessions   — List all registered WhatsApp sessions
  backup-verify   — Verify latest MongoDB backup
  clean-sessions  — Remove stale session lock files
  help            — Show this help message
  clear           — Clear terminal output`;

export default function TerminalPanel() {
  const [input, setInput] = useState("");
  const [lines, setLines] = useState([
    "[Linda Terminal] Type 'help' to see available commands.",
  ]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const appendLine = (line) =>
    setLines((prev) => [...prev.slice(-299), line]);

  const handleCommand = async (e) => {
    e.preventDefault();
    const cmd = input.trim().toLowerCase();
    if (!cmd) return;
    appendLine(`$ ${cmd}`);
    setInput("");

    if (cmd === "clear") {
      setLines([]);
      return;
    }
    if (cmd === "help") {
      HELP_TEXT.split("\n").forEach((l) => appendLine(l));
      return;
    }

    const scriptKey = COMMAND_MAP[cmd];
    if (!scriptKey) {
      appendLine(`Error: '${cmd}' is not a recognized command. Type 'help'.`);
      return;
    }

    setLoading(true);
    appendLine(`Running: ${cmd}...`);
    try {
      const res = await fetch("/api/runScript", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ script: scriptKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Execution failed");
      const output = data.output || data.message || "Done.";
      output.split("\n").forEach((l) => appendLine(l));
    } catch (err) {
      appendLine(`Error: ${err.message}`);
      toast({ title: "Script error", description: err.message, status: "error", duration: 3000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box borderWidth="1px" borderRadius="lg" overflow="hidden" shadow="md">
      <Flex p={3} bg="gray.800" align="center" justify="space-between" borderBottomWidth="1px" borderColor="gray.700">
        <HStack spacing={2}>
          <Badge colorScheme="green" variant="subtle">Interactive Terminal</Badge>
          <Text fontSize="xs" color="gray.400">Whitelisted bot commands only</Text>
        </HStack>
        <Badge colorScheme="orange" fontSize="2xs">Production Guarded</Badge>
      </Flex>

      <Box bg="gray.900" p={4} maxH="280px" overflowY="auto" fontFamily="monospace" fontSize="xs">
        <VStack align="stretch" spacing={0}>
          {lines.map((line, i) => (
            <Text
              key={i}
              color={line.startsWith("Error") ? "red.300" : line.startsWith("$") ? "yellow.300" : "green.300"}
              whiteSpace="pre-wrap"
            >
              {line}
            </Text>
          ))}
          {loading && <Text color="cyan.300" animation="pulse">Running...</Text>}
        </VStack>
      </Box>

      <Flex as="form" onSubmit={handleCommand} bg="gray.800" p={2} gap={2}>
        <Text color="green.400" fontFamily="monospace" fontSize="sm" mt={1.5}>$</Text>
        <Input
          flex={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="doctor | status | list-sessions | help"
          size="sm"
          bg="gray.900"
          color="white"
          borderColor="gray.600"
          fontFamily="monospace"
          isDisabled={loading}
          _placeholder={{ color: "gray.500" }}
        />
        <Button type="submit" size="sm" colorScheme="teal" isLoading={loading}>
          Run
        </Button>
      </Flex>
    </Box>
  );
}

