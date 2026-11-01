// ui/components/MetricCard.jsx
/**
 * MetricCard Component
 * Single responsibility: Render a single operational metric card with visual indicators.
 */
import { Box, Stat, StatLabel, StatNumber, StatHelpText } from "@chakra-ui/react";

export default function MetricCard({ title, value, helperText = "", colorScheme = "teal" }) {
  return (
    <Box
      p={5}
      shadow="md"
      borderWidth="1px"
      borderRadius="lg"
      bg="white"
      borderLeftWidth="4px"
      borderLeftColor={`${colorScheme}.500`}
    >
      <Stat>
        <StatLabel fontSize="sm" color="gray.500" fontWeight="bold" textTransform="uppercase">
          {title}
        </StatLabel>
        <StatNumber fontSize="2xl" fontWeight="extrabold" color="gray.800" mt={1}>
          {value}
        </StatNumber>
        {helperText ? (
          <StatHelpText mb={0} fontSize="xs" color="gray.500">
            {helperText}
          </StatHelpText>
        ) : null}
      </Stat>
    </Box>
  );
}
