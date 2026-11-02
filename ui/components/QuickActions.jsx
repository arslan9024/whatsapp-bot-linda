// ui/components/QuickActions.jsx
/**
 * QuickActions Component
 * Single responsibility: Render administrative operation buttons and display
 * script output results in a modal dialog.
 */
import { useState } from "react";
import {
  Box,
  Flex,
  HStack,
  Text,
  useToast,
  Badge,
  useDisclosure,
} from "@chakra-ui/react";
import ActionButton from "./ActionButton";
import ScriptOutputModal from "./ScriptOutputModal";
import { getAuthHeaders } from "../lib/auth";

const ACTIONS = [
  { scriptKey: "doctor",        label: "Doctor (12/12)", colorScheme: "green"  },
  { scriptKey: "status",        label: "System Status",  colorScheme: "teal"   },
  { scriptKey: "list-sessions", label: "List Sessions",  colorScheme: "blue"   },
  { scriptKey: "backup-verify", label: "Verify Backup",  colorScheme: "purple" },
  { scriptKey: "clean-sessions",label: "Clean Sessions", colorScheme: "orange" },
];

export default function QuickActions() {
  const [activeTask, setActiveTask] = useState(null);
  const [scriptResult, setScriptResult] = useState({ script: "", output: "", success: true });
  const { isOpen, onOpen, onClose } = useDisclosure();
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
      const success = res.ok && data.success;
      setScriptResult({
        script: label,
        output: data.output || data.message || data.error || "No output.",
        success,
      });
      onOpen();
    } catch (err) {
      toast({ title: label + " failed", description: err.message, status: "error", duration: 4000 });
    } finally {
      setActiveTask(null);
    }
  };

  return (
    <>
      <Box p={4} borderWidth="1px" borderRadius="lg" bg="white" shadow="sm">
        <Flex justify="space-between" align="center" mb={3}>
          <HStack spacing={2}>
            <Text fontWeight="bold" color="gray.700" fontSize="sm">
              Administrative Operations
            </Text>
            <Badge colorScheme="blue">Output shown in dialog</Badge>
          </HStack>
          <Text fontSize="xs" color="gray.500">Whitelisted scripts only • Law #1 safe</Text>
        </Flex>
        <HStack spacing={3} flexWrap="wrap">
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

      <ScriptOutputModal
        isOpen={isOpen}
        onClose={onClose}
        script={scriptResult.script}
        output={scriptResult.output}
        success={scriptResult.success}
      />
    </>
  );
}
