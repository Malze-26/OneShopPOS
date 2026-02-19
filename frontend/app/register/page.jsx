"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  // ---------- MEMORY BOXES (State) ----------
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ---------- REGISTER FUNCTION ----------
  function handleRegister() {
    // ── CHECK 1: Are all fields filled? ──
    if (!fullName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    // ── CHECK 2: Is full name valid? ──
    if (fullName.trim().length < 3) {
      setError("Full name must be at least 3 characters.");
      return;
    }

    // ── CHECK 3: Is email format valid? ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email (e.g. name@company.com).");
      return;
    }

    // ── CHECK 4: Is password long enough? ──
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    // ── CHECK 5: Do passwords match? ──
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // ── ALL CHECKS PASSED → call backend API ──
    setError("");
    setLoading(true);

    // Send registration request to backend
    const registerUser = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/auth/register", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: email,
            password: password,
            confirmPassword: confirmPassword,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setLoading(false);
          setError(data.message || "Registration failed. Please try again.");
          return;
        }

        // Registration successful - auto-login if token returned
        setLoading(false);
        if (data.token) {
          localStorage.setItem("authToken", data.token);
          localStorage.setItem("user", JSON.stringify(data.user));
          router.push("/pos/cart");
        } else {
          router.push("/login");
        }
      } catch (err) {
        setLoading(false);
        setError("Server error. Please make sure the backend is running on http://localhost:5000");
      }
    };

    registerUser();
  }

  // ---------- WHAT APPEARS ON SCREEN ----------
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#f0f2f5",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Segoe UI', sans-serif",
        padding: "20px",
      }}
    >
      {/* ── LOGO + BUSINESS NAME ── */}
      <div style={{ textAlign: "center", marginBottom: "24px" }}>
        <div
          style={{
            width: "60px",
            height: "60px",
            backgroundColor: "#eef0fb",
            borderRadius: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 14px auto",
            boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="8" width="20" height="13" rx="2" fill="#3730a3" />
            <path
              d="M7 8V6a5 5 0 0110 0v2"
              stroke="#3730a3"
              strokeWidth="2"
              fill="none"
            />
            <rect x="8" y="13" width="8" height="3" rx="1" fill="white" />
          </svg>
        </div>

        <h2
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: "700",
            color: "#1a1a2e",
          }}
        >
          Your Business
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>
          POS System
        </p>
      </div>

      {/* ── WHITE REGISTER CARD ── */}
      <div
        style={{
          backgroundColor: "white",
          borderRadius: "16px",
          padding: "36px 32px",
          width: "100%",
          maxWidth: "380px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        }}
      >
        {/* Card heading */}
        <h1
          style={{
            margin: "0 0 6px",
            fontSize: "22px",
            fontWeight: "700",
            color: "#1a1a2e",
          }}
        >
          Create Account
        </h1>
        <p
          style={{
            margin: "0 0 28px",
            fontSize: "14px",
            color: "#6b7280",
          }}
        >
          Sign up to get started with our POS system.
        </p>

        {/* ── ERROR MESSAGE ── */}
        {error && (
          <div
            style={{
              backgroundColor: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#dc2626",
              borderRadius: "8px",
              padding: "10px 14px",
              fontSize: "13px",
              marginBottom: "16px",
            }}
          >
            {error}
          </div>
        )}

        {/* ── FULL NAME FIELD ── */}
        <div style={{ marginBottom: "18px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
            Full Name
          </label>
          <input
            type="text"
            placeholder="John Doe"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
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
            onFocus={(e) => (e.target.style.borderColor = "#3730a3")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
          />
        </div>

        {/* ── EMAIL FIELD ── */}
        <div style={{ marginBottom: "18px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
            Email Address
          </label>
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
            onFocus={(e) => (e.target.style.borderColor = "#3730a3")}
            onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
          />
        </div>

        {/* ── PASSWORD FIELD ── */}
        <div style={{ marginBottom: "18px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
            Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                border: "1.5px solid #e5e7eb",
                borderRadius: "8px",
                padding: "10px 42px 10px 14px",
                fontSize: "14px",
                color: "#1a1a2e",
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: "#fafafa",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3730a3")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
            />
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
              {showPassword ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ── CONFIRM PASSWORD FIELD ── */}
        <div style={{ marginBottom: "28px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: "600",
              color: "#374151",
              marginBottom: "6px",
            }}
          >
            Confirm Password
          </label>
          <div style={{ position: "relative" }}>
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{
                width: "100%",
                border: "1.5px solid #e5e7eb",
                borderRadius: "8px",
                padding: "10px 42px 10px 14px",
                fontSize: "14px",
                color: "#1a1a2e",
                outline: "none",
                boxSizing: "border-box",
                backgroundColor: "#fafafa",
                transition: "border-color 0.2s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#3730a3")}
              onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
              {showConfirmPassword ? (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* ── SIGN UP BUTTON ── */}
        <button
          onClick={handleRegister}
          disabled={loading}
          style={{
            width: "100%",
            backgroundColor: loading ? "#6366f1" : "#1e1b8b",
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
          onMouseOver={(e) => {
            if (!loading) e.target.style.backgroundColor = "#2d29a6";
          }}
          onMouseOut={(e) => {
            if (!loading) e.target.style.backgroundColor = "#1e1b8b";
          }}
        >
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        {/* ── LOGIN LINK ── */}
        <div
          style={{
            marginTop: "20px",
            textAlign: "center",
            fontSize: "14px",
            color: "#6b7280",
          }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            style={{
              color: "#3730a3",
              fontWeight: "600",
              textDecoration: "none",
              cursor: "pointer",
            }}
            onMouseOver={(e) => (e.target.style.textDecoration = "underline")}
            onMouseOut={(e) => (e.target.style.textDecoration = "none")}
          >
            Sign In
          </Link>
        </div>
      </div>

      {/* ── FOOTER LINKS ── */}
      <div
        style={{
          marginTop: "24px",
          display: "flex",
          gap: "24px",
          fontSize: "12px",
          color: "#9ca3af",
        }}
      >
        <a
          href="#"
          style={{
            color: "#9ca3af",
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          Contact<br />
          support
        </a>
        <a
          href="#"
          style={{
            color: "#9ca3af",
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          Privacy<br />
          Policy
        </a>
        <a
          href="#"
          style={{
            color: "#9ca3af",
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          Terms of<br />
          Service
        </a>
      </div>
    </div>
  );
}
