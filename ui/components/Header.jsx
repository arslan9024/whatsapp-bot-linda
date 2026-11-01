// ui/components/Header.jsx
/**
 * Header Component
 * Single responsibility: Render top navigation bar, status indicators, and logout control.
 */
import { Flex, Box, Heading, Badge, Button, Spacer, HStack, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import { clearToken } from "../lib/auth";

export default function Header() {
  const router = useRouter();

  const handleLogout = () => {
    clearToken();
    router.replace("/login");
  };

  return (
    <Flex
      as="header"
      align="center"
      justify="space-between"
      p={4}
      mb={4}
      bg="teal.600"
      color="white"
      borderRadius="md"
      boxShadow="sm"
    >
      <Box>
        <HStack spacing={3}>
          <Heading size="lg" letterSpacing="tight">
            WhatsApp Bot Linda
          </Heading>
          <Badge colorScheme="green" fontSize="0.8em" px={2} py={0.5} borderRadius="full">
            Online (24/7)
          </Badge>
        </HStack>
        <Text fontSize="sm" opacity={0.9} mt={1}>
          Visual Operations Center & Management Console
        </Text>
      </Box>

      <Spacer />

      <HStack spacing={4}>
        <Badge variant="subtle" colorScheme="purple" p={2} borderRadius="md">
          Dual Engine: Terminal + Web UI
        </Badge>
        <Button
          size="sm"
          colorScheme="red"
          variant="solid"
          onClick={handleLogout}
        >
          Logout
        </Button>
      </HStack>
    </Flex>
  );
}

