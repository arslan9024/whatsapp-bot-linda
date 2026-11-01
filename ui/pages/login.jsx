// ui/pages/login.jsx
/**
 * Login Page
 * Single responsibility: Render authentication form and manage login state for UI access.
 */
import { useState } from "react";
import { useRouter } from "next/router";
import {
  Box,
  Button,
  Input,
  FormControl,
  FormLabel,
  Heading,
  VStack,
  useToast,
  Text,
  Badge,
} from "@chakra-ui/react";
import { setToken } from "../lib/auth";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Authentication failed");

      setToken(data.token);
      toast({
        title: "Authenticated",
        description: "Welcome to Linda Operations Console",
        status: "success",
        duration: 2000,
      });
      router.replace("/dashboard");
    } catch (err) {
      toast({
        title: "Access Denied",
        description: err.message,
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box minH="100vh" bg="gray.100" py={16} px={4}>
      <Box
        maxW="md"
        mx="auto"
        p={8}
        borderWidth="1px"
        borderRadius="xl"
        bg="white"
        shadow="lg"
      >
        <VStack spacing={2} mb={6} textAlign="center">
          <Badge colorScheme="teal" px={2} py={1} borderRadius="md">
            Production Management
          </Badge>
          <Heading size="lg" color="gray.800">
            Linda Bot Console
          </Heading>
          <Text fontSize="sm" color="gray.500">
            Sign in to access visual operations and live metrics
          </Text>
        </VStack>

        <form onSubmit={handleSubmit}>
          <VStack spacing={4}>
            <FormControl id="username" isRequired>
              <FormLabel fontSize="sm">Operator Username</FormLabel>
              <Input
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </FormControl>
            <FormControl id="password" isRequired>
              <FormLabel fontSize="sm">Access Token / Password</FormLabel>
              <Input
                type="password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormControl>
            <Button
              type="submit"
              colorScheme="teal"
              width="full"
              mt={2}
              isLoading={loading}
              loadingText="Authorizing..."
            >
              Sign In to Console
            </Button>
          </VStack>
        </form>
      </Box>
    </Box>
  );
}
