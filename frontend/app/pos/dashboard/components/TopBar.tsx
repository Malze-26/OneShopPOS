import { C } from "../constants/tokens";

interface User {
  name: string;
  role: string;
}

interface TopBarProps {
  user: User;
  time: Date;
  isOnline: boolean;
  search: string;
  pendingCount: number;
  syncing: boolean;
  syncMessage: string;
  showMenu: boolean;
  onSearch: (val: string) => void;
  onSync: () => void;
  onToggleMenu: () => void;
  onLogout: () => void;
}

export default function TopBar({
  user,
  time,
  isOnline,
  search,
  pendingCount,
  syncing,
  syncMessage,
  showMenu,
  onSearch,
  onSync,
  onToggleMenu,
  onLogout,
}: TopBarProps) {
  return (
    <header style={{ height: 56, background: C.brand, display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0, zIndex: 20 }}>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#fff", fontSize: 10, fontWeight: 900, letterSpacing: "-1px" }}>POS</span>
        </div>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 14, letterSpacing: "-.3px" }}>OneShop POS</span>
      </div>

      {/* Search */}
      <div style={{ flex: 1, maxWidth: 420, margin: "0 auto", position: "relative" }}>
        <svg style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", opacity: .4, pointerEvents: "none" }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search products…"
          style={{ width: "100%", padding: "7px 12px 7px 30px", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.18)", borderRadius: 8, color: "#fff", fontSize: 13, outline: "none", fontFamily: "inherit" }}
        />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

        {/* Clock */}
        <span style={{ color: "rgba(255,255,255,.6)", fontSize: 12, fontFamily: "'DM Mono',monospace", letterSpacing: "1px" }}>
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>

        {/* Online/Offline badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", background: isOnline ? "rgba(16,185,129,.2)" : "rgba(239,68,68,.2)", borderRadius: 100 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: isOnline ? "#34D399" : "#F87171" }}/>
          <span style={{ color: isOnline ? "#6EE7B7" : "#FCA5A5", fontSize: 11, fontWeight: 600 }}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        {/* Pending sync button */}
        {pendingCount > 0 && (
          <button
            className="sync-btn"
            onClick={onSync}
            disabled={syncing || !isOnline}
            title={isOnline ? "Click to sync" : "Will sync when online"}
          >
            <svg
              width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              style={{ animation: syncing ? "syncSpin 0.8s linear infinite" : "none" }}
            >
              <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            <span style={{ background: "#F87171", borderRadius: 100, padding: "1px 6px", fontSize: 10 }}>{pendingCount}</span>
            {syncing ? "Syncing…" : "Pending"}
          </button>
        )}

        {/* Sync message */}
        {syncMessage && (
          <span style={{ fontSize: 11, fontWeight: 700, color: syncMessage.includes("✓") ? "#6EE7B7" : "#FCA5A5" }}>
            {syncMessage}
          </span>
        )}

        {/* User menu */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ color: "#fff", fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{user.name}</div>
            <div style={{ color: "rgba(255,255,255,.5)", fontSize: 10, marginTop: 2 }}>{user.role}</div>
          </div>
          <button
            onClick={onToggleMenu}
            style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,.2)", border: "1.5px solid rgba(255,255,255,.3)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            {user.name[0].toUpperCase()}
          </button>

          {showMenu && (
            <div className="menu-dropdown">
              <button className="menu-item" onClick={onSync} disabled={syncing || !isOnline || pendingCount === 0}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
                Sync Now {pendingCount > 0 ? `(${pendingCount})` : ""}
              </button>
              <button className="menu-item" onClick={onLogout}>
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                </svg>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}