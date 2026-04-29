import { useState, useEffect } from "react";

export function usePOSUI() {
  const [showMenu, setShowMenu] = useState(false);
  const [time, setTime] = useState(new Date());
  const [error, setError] = useState("");

  // Update time every second
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return {
    showMenu,
    setShowMenu,
    time,
    setTime,
    error,
    setError,
  };
}
