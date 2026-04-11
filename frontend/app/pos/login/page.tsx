"use client";
import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/app/contexts/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

 const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");
  setLoading(true);
  try {
    await login(email, password, rememberMe);
  } catch (err: any) {
    setError(err.response?.data?.message || "Login failed. Please try again.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-[#f0f2f5] flex flex-col items-center justify-center px-4">
      {/* Logo + Brand */}
      <div className="flex flex-col items-center mb-6">
        <div className="w-16 h-16 bg-[#e8ecf8] rounded-2xl flex items-center justify-center mb-3 shadow-sm">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="1.5" fill="#2d3ab8" />
            <rect x="13" y="3" width="8" height="8" rx="1.5" fill="#2d3ab8" />
            <rect x="3" y="13" width="8" height="8" rx="1.5" fill="#2d3ab8" />
            <rect x="13" y="13" width="8" height="8" rx="1.5" fill="#2d3ab8" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-[#1a1a2e]">Your Business</h1>
        <p className="text-xs text-gray-500 tracking-widest uppercase mt-0.5">POS System</p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-md w-full max-w-sm p-8">
        <h2 className="text-2xl font-bold text-[#1a1a2e] mb-1">Welcome Back!</h2>
        <p className="text-sm text-gray-500 mb-6">Please enter your details to sign in.</p>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Email Address</label>
          <input
            type="email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2d3ab8] focus:border-transparent transition"
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#1a1a2e] mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2d3ab8] focus:border-transparent transition pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Remember me + Forgot password */}
        <div className="flex items-center justify-between mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#2d3ab8] focus:ring-[#2d3ab8]"
            />
            <span className="text-sm text-gray-600">Remember me</span>
          </label>
          <button className="text-sm text-[#2d3ab8] hover:underline font-medium">Forgot password?</button>
        </div>

        {/* Sign In Button */}
        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-[#1e2a9e] hover:bg-[#1a2490] disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all active:scale-[0.98] shadow-sm"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        </form>

        {/* Sign Up Link */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <Link href="/pos/register" className="text-[#2d3ab8] hover:underline font-medium">
              Sign Up
            </Link>
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex gap-6 mt-6 text-xs text-gray-400">
        <button className="hover:text-gray-600 transition">Contact support</button>
        <button className="hover:text-gray-600 transition">Privacy Policy</button>
        <button className="hover:text-gray-600 transition">Terms of Service</button>
      </div>
    </div>
  );
}