import { useState } from "react";

export function useSyncState() {
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");

  return {
    pendingCount,
    setPendingCount,
    syncing,
    setSyncing,
    syncMessage,
    setSyncMessage,
  };
}
