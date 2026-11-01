// ui/pages/_app.jsx
import { ChakraProvider } from "@chakra-ui/react";
import { useEffect } from "react";
import { useRouter } from "next/router";

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Simple auth guard – redirect to /login if no token
  useEffect(() => {
    const token = typeof window !== "undefined" && localStorage.getItem("token");
    if (!token && router.pathname !== "/login") {
      router.replace("/login");
    }
  }, [router]);

  return (
    <ChakraProvider>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}

export default MyApp;

