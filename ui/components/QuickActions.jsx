// ui/components/QuickActions.jsx
/**
 * QuickActions Component
 * Single responsibility: Render administrative operations panel and trigger backend scripts.
 */
import { useState } from "react";
import { Box, Flex, HStack, Text, useToast, Badge } from "@chakra-ui/react";
import ActionButton from "./ActionButton";
import { getAuthHeaders } from "../lib/auth";

const ACTIONS = [
  { scriptKey: "doctor", label: "Run Doctor (12/12)", colorScheme: "green" },
  { scriptKey: "status", label: "System Status", colorScheme: "teal" },
  { scriptKey: "backup-verify", label: "Verify DB Backup", colorScheme: "purple" },
  { scriptKey: "reap-zombies", label: "Reap Zombie Browsers", colorScheme: "red" },
];

export default function QuickActions() {
  const [activeTask, setActiveTask] = useState(null);
  const toast = useToast();

  const handleTrigger = async (scriptKey, label) => {
    setActiveTask(scriptKey);
    try {
      const res = await fetch("/api/runScript", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ script: scriptKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Execution failed");

      toast({
        title: `${label} Completed`,
        description: data.message || "Operation executed successfully",
        status: "success",
        duration: 4000,
        isClosable: true,
      });
    } catch (err) {
      toast({
        title: `${label} Failed`,
        description: err.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } finally {
      setActiveTask(null);
    }
  };

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg" bg="white" shadow="sm">
      <Flex justify="space-between" align="center" mb={3}>
        <HStack spacing={2}>
          <Text fontWeight="bold" color="gray.700" fontSize="sm">
            Operational Triggers & Maintenance
          </Text>
          <Badge colorScheme="blue">Production Guarded</Badge>
        </HStack>
        <Text fontSize="xs" color="gray.500">
          Executes whitelisted diagnostic scripts
        </Text>
      </Flex>
      <HStack spacing={3} wrap="wrap">
        {ACTIONS.map((act) => (
          <ActionButton
            key={act.scriptKey}
            label={act.label}
            scriptKey={act.scriptKey}
            colorScheme={act.colorScheme}
            isLoading={activeTask === act.scriptKey}
            onTrigger={handleTrigger}
          />
        ))}
      </HStack>
    </Box>
  );
}
