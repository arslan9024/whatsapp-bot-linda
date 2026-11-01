// ui/components/LogViewer.jsx
/**
 * LogViewer Component
 * Single responsibility: Render real-time streaming application logs in an auto-scrolling terminal window.
 */
import { useEffect, useRef, useState } from "react";
import { Box, Flex, Text, Button, Badge, Input, HStack } from "@chakra-ui/react";

export default function LogViewer({ lines = [] }) {
  const scrollRef = useRef(null);
  const [filter, setFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines, autoScroll]);

  const filteredLines = filter
    ? lines.filter((line) => line.toLowerCase().includes(filter.toLowerCase()))
    : lines;

  return (
    <Box borderWidth="1px" borderRadius="lg" overflow="hidden" shadow="md" bg="gray.900">
      <Flex p={3} bg="gray.800" align="center" justify="space-between" borderBottomWidth="1px" borderColor="gray.700">
        <HStack spacing={3}>
          <Badge colorScheme="cyan">Live Console Stream</Badge>
          <Text fontSize="xs" color="gray.400">
            {lines.length} lines buffered
          </Text>
        </HStack>
        <HStack spacing={2}>
          <Input
            placeholder="Filter logs..."
            size="xs"
            width="180px"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            bg="gray.700"
            color="white"
            borderColor="gray.600"
          />
          <Button
            size="xs"
            colorScheme={autoScroll ? "teal" : "gray"}
            variant="outline"
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {autoScroll ? "Auto-scroll ON" : "Auto-scroll OFF"}
          </Button>
        </HStack>
      </Flex>
      <Box
        ref={scrollRef}
        p={4}
        maxH="300px"
        overflowY="auto"
        fontFamily="monospace"
        fontSize="xs"
        color="green.300"
        whiteSpace="pre-wrap"
      >
        {filteredLines.length === 0 ? (
          <Text color="gray.500" fontStyle="italic">
            No log entries received yet. Waiting for bot activity...
          </Text>
        ) : (
          filteredLines.map((line, idx) => (
            <Text key={idx} mb={1}>
              {line}
            </Text>
          ))
        )}
      </Box>
    </Box>
  );
}
