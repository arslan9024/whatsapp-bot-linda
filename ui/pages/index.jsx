// ui/pages/index.jsx
/**
 * Root Index Page
 * Single responsibility: Redirect incoming traffic to /dashboard or /login based on token presence.
 */
import { useEffect } from "react";
import { useRouter } from "next/router";
import { getToken } from "../lib/auth";

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    if (token) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return null;
}
