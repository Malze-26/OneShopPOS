import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export function ProtectedRoute({ children }) {
  const router = useRouter();
  const isLoaded = useRef(false);

  useEffect(() => {
    if (isLoaded.current) return;
    isLoaded.current = true;

    const token = localStorage.getItem("authToken");
    if (!token) {
      router.replace("/login");
    }
  }, [router]);

  return children;
}
