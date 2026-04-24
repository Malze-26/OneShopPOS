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
    <header className="flex items-center px-4 gap-3 h-14 flex-shrink-0 z-20" style={{ background: "#1B1A55" }}>

      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(255,255,255,.15)" }}>
          <span className="text-white font-black text-[10px] tracking-[-1px]">POS</span>
        </div>
        <span className="text-white font-bold text-[14px] tracking-[-0.3px]">OneShop POS</span>
      </div>

      {/* Search */}
      <div className="relative flex-1 max-w-[420px] mx-auto">
        <svg className="absolute left-2 top-1/2 -translate-y-1/2 opacity-40 pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="M21 21l-4.35-4.35"/>
        </svg>
        <input
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search products…"
          className="w-full pl-7 pr-3 py-1 bg-white/12 border border-white/18 rounded text-white text-[13px] outline-none font-sans"
        />
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">

        {/* Clock */}
        <span className="text-white/60 text-[12px] font-mono tracking-wide">
          {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>

        {/* Online/Offline badge */}
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${isOnline ? "bg-green-200/20" : "bg-red-200/20"}`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-400" : "bg-red-400"}`} />
          <span className={`text-[11px] font-semibold ${isOnline ? "text-green-300" : "text-red-300"}`}>
            {isOnline ? "Online" : "Offline"}
          </span>
        </div>

        {/* Pending sync button */}
        {pendingCount > 0 && (
          <button
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-bold rounded cursor-pointer"
            onClick={onSync}
            disabled={syncing || !isOnline}
          >
            <svg
              width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              className={syncing ? "animate-spin" : ""}
            >
              <polyline points="23 4 23 10 17 10"/>
              <polyline points="1 20 1 14 7 14"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            <span className="bg-red-400 text-white rounded-full px-1 text-[10px]">{pendingCount}</span>
            {syncing ? "Syncing…" : "Pending"}
          </button>
        )}

        {/* Sync message */}
        {syncMessage && (
          <span className={`text-[11px] font-bold ${syncMessage.includes("✓") ? "text-green-300" : "text-red-300"}`}>
            {syncMessage}
          </span>
        )}

        {/* User menu */}
        <div className="relative flex items-center gap-2">
          <div className="text-right">
            <div className="text-white text-[12px] font-bold leading-none">{user.name}</div>
            <div className="text-white/50 text-[10px] mt-0.5">{user.role}</div>
          </div>
          <button
            onClick={onToggleMenu}
            className="w-8 h-8 rounded-full border border-white/30 bg-white/20 flex items-center justify-center text-white text-[12px] font-bold cursor-pointer"
          >
            {user.name[0].toUpperCase()}
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 bg-white rounded shadow-md overflow-hidden z-50">
              <button className="flex items-center gap-1 px-3 py-2 text-[13px] w-full hover:bg-gray-100 disabled:opacity-50"
                onClick={onSync} disabled={syncing || !isOnline || pendingCount === 0}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
                Sync Now {pendingCount > 0 ? `(${pendingCount})` : ""}
              </button>
              <button className="flex items-center gap-1 px-3 py-2 text-[13px] w-full hover:bg-gray-100" onClick={onLogout}>
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