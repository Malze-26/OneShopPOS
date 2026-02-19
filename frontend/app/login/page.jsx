"use client";

// useState is like a memory box — it remembers values as the user interacts
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();

  // ---------- MEMORY BOXES (State) ----------
  // These store what the user types or clicks

  const [email, setEmail]           = useState("");       // stores email input
  const [password, setPassword]     = useState("");       // stores password input
  const [rememberMe, setRememberMe] = useState(false);    // stores checkbox true/false
  const [showPassword, setShowPassword] = useState(false); // toggles password visibility
  const [error, setError]           = useState("");       // stores error message if login fails
  const [loading, setLoading]       = useState(false);    // shows "loading" while submitting

  // ---------- LOGIN FUNCTION ----------
  // This runs when the user clicks "Sign In"
 function handleLogin() {

    // ── CHECK 1: Are fields empty? ──
    if (!email && !password) {
      setError("Please enter your email and password.");
      return;
    }

    // ── CHECK 2: Is email empty? ──
    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    // ── CHECK 3: Is email format valid? (must have @ and .) ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email (e.g. name@company.com).");
      return;
    }

    // ── CHECK 4: Is password empty? ──
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    // ── CHECK 5: Is password long enough? ──
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // ── ALL CHECKS PASSED → call backend API ──
    setError("");
    setLoading(true);

    // Send login request to backend
    const loginUser = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/auth/login", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            password: password,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setLoading(false);
          setError(data.message || "Login failed. Please try again.");
          return;
        }

        // Login successful - store token and redirect
        localStorage.setItem("authToken", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
        setLoading(false);
        router.push("/pos/cart");
      } catch (err) {
        setLoading(false);
        setError("Server error. Please make sure the backend is running on http://localhost:5000");
      }
    };

    loginUser();
  }

  // ---------- WHAT APPEARS ON SCREEN ----------
  return (

    // Full screen wrapper — light gray background, everything centered
    <div style={{
      minHeight: "100vh",
      backgroundColor: "#f0f2f5",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "'Segoe UI', sans-serif",
      padding: "20px",
    }}>

      {/* ── LOGO + BUSINESS NAME (above the card) ── */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>

        {/* Store icon box — the blue/purple rounded square */}
        <div style={{
          width: "60px",
          height: "60px",
          backgroundColor: "#eef0fb",
          borderRadius: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto 14px auto",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}>
          {/* Store/POS icon using SVG (the cash register icon from your design) */}
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="8" width="20" height="13" rx="2" fill="#3730a3" />
            <path d="M7 8V6a5 5 0 0110 0v2" stroke="#3730a3" strokeWidth="2" fill="none"/>
            <rect x="8" y="13" width="8" height="3" rx="1" fill="white"/>
          </svg>
        </div>

        {/* Business name */}
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "700", color: "#1a1a2e" }}>
          Your Business
        </h2>
        {/* Subtitle */}
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>
          POS System
        </p>
      </div>

      {/* ── WHITE LOGIN CARD ── */}
      <div style={{
        backgroundColor: "white",
        borderRadius: "16px",
        padding: "36px 32px",
        width: "100%",
        maxWidth: "380px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
      }}>

        {/* Card heading */}
        <h1 style={{ margin: "0 0 6px", fontSize: "22px", fontWeight: "700", color: "#1a1a2e" }}>
          Welcome Back!
        </h1>
        <p style={{ margin: "0 0 28px", fontSize: "14px", color: "#6b7280" }}>
          Please enter your details to sign in.
        </p>

        {/* ── ERROR MESSAGE (only shows when there's an error) ── */}
        {error && (
          <div style={{
            backgroundColor: "#fef2f2",
            border: "1px solid #fecaca",
            color: "#dc2626",
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "13px",
            marginBottom: "16px",
          }}>
            {error}
          </div>
        )}

        {/* ── EMAIL ADDRESS FIELD ── */}
        <div style={{ marginBottom: "18px" }}>

          {/* Label above the box */}
          <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
            Email Address
          </label>

          {/* Input box — when user types, setEmail saves it */}
          <input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              width: "100%",
              border: "1.5px solid #e5e7eb",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "14px",
              color: "#1a1a2e",
              outline: "none",
              boxSizing: "border-box",
              backgroundColor: "#fafafa",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => e.target.style.borderColor = "#3730a3"}
            onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
          />
        </div>

        {/* ── PASSWORD FIELD ── */}
        <div style={{ marginBottom: "20px" }}>

          <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" }}>
            Password
          </label>

          {/* Wrapper for input + eye icon side by side */}
          <div style={{ position: "relative" }}>

            {/* Password input — type changes between "password" (dots) and "text" (visible) */}
            <input
              type={showPassword ? "text" : "password"}  // this is the show/hide toggle
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                border: "1.5px solid #e5e7eb",
                borderRadius: "8px",
                padding: "10px 42px 10px 14px",  // extra right padding so text doesn't overlap eye icon
                fontSize: "14px",
                color: "#1a1a2e",
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: "#fafafa",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => e.target.style.borderColor = "#3730a3"}
              onBlur={(e) => e.target.style.borderColor = "#e5e7eb"}
            />

            {/* Eye icon button — clicking this toggles showPassword true/false */}
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: "absolute",
                right: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "0",
                color: "#9ca3af",
              }}
            >
              {/* Show different icon depending on whether password is visible */}
              {showPassword ? (
                // Eye with slash = password is visible, click to hide
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
                  <line x1="1" y1="1" x2="23" y2="23"/>
                </svg>
              ) : (
                // Normal eye = password is hidden, click to show
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              )}
            </button>

          </div>
        </div>

        {/* ── REMEMBER ME + FORGOT PASSWORD (same row) ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px" }}>

          {/* Left side: checkbox + label */}
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#374151" }}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: "15px", height: "15px", accentColor: "#3730a3", cursor: "pointer" }}
            />
            Remember me
          </label>

          {/* Right side: forgot password link */}
          <a href="#" style={{ fontSize: "13px", color: "#3730a3", fontWeight: "600", textDecoration: "none" }}
            onMouseOver={(e) => e.target.style.textDecoration = "underline"}
            onMouseOut={(e) => e.target.style.textDecoration = "none"}
          >
            Forgot password?
          </a>

        </div>

        {/* ── SIGN IN BUTTON ── */}
        <button
          onClick={handleLogin}
          disabled={loading}  // disabled while loading so user can't click twice
          style={{
            width: "100%",
            backgroundColor: loading ? "#6366f1" : "#1e1b8b",  // slightly lighter when loading
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "12px",
            fontSize: "15px",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background-color 0.2s",
            letterSpacing: "0.3px",
          }}
          onMouseOver={(e) => { if (!loading) e.target.style.backgroundColor = "#2d29a6"; }}
          onMouseOut={(e) => { if (!loading) e.target.style.backgroundColor = "#1e1b8b"; }}
        >
          {/* Show "Signing in..." while loading, otherwise "Sign In" */}
          {loading ? "Signing in..." : "Sign In"}
        </button>

        {/* ── SIGN UP LINK ── */}
        <div
          style={{
            marginTop: "20px",
            textAlign: "center",
            fontSize: "14px",
            color: "#6b7280",
          }}
        >
          Don't have an account?{" "}
          <Link
            href="/register"
            style={{
              color: "#3730a3",
              fontWeight: "600",
              textDecoration: "none",
              cursor: "pointer",
            }}
            onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.target.style.textDecoration = "none")}
          >
            Sign Up
          </Link>
        </div>

      </div>

      {/* ── FOOTER LINKS (below the card) ── */}
      <div style={{ marginTop: "24px", display: "flex", gap: "24px", fontSize: "12px", color: "#9ca3af" }}>
        <a href="#" style={{ color: "#9ca3af", textDecoration: "none", textAlign: "center" }}>
          Contact<br/>support
        </a>
        <a href="#" style={{ color: "#9ca3af", textDecoration: "none", textAlign: "center" }}>
          Privacy<br/>Policy
        </a>
        <a href="#" style={{ color: "#9ca3af", textDecoration: "none", textAlign: "center" }}>
          Terms of<br/>Service
        </a>
      </div>

    </div>
  );
}
