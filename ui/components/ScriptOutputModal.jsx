// ui/components/ScriptOutputModal.jsx
/**
 * ScriptOutputModal Component
 * Single responsibility: Display script execution results in a scrollable modal dialog.
 */
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  Box,
  Text,
  Badge,
} from "@chakra-ui/react";

export default function ScriptOutputModal({ isOpen, onClose, script, output, success }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent bg="gray.900" color="white">
        <ModalHeader borderBottomWidth="1px" borderColor="gray.700">
          <Badge colorScheme={success ? "green" : "red"} mr={2}>
            {success ? "SUCCESS" : "FAILED"}
          </Badge>
          Script: {script}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody py={4}>
          <Box
            fontFamily="monospace"
            fontSize="xs"
            bg="black"
            p={4}
            borderRadius="md"
            maxH="400px"
            overflowY="auto"
            whiteSpace="pre-wrap"
          >
            <Text color={success ? "green.300" : "red.300"}>
              {output || "No output captured."}
            </Text>
          </Box>
        </ModalBody>
        <ModalFooter borderTopWidth="1px" borderColor="gray.700">
          <Button size="sm" colorScheme="teal" onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

