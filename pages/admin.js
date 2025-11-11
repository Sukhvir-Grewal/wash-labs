import { useState } from "react";
import { useRouter } from "next/router";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true); 

    try {
      // Only log in development
      const isDev = process.env.NODE_ENV  === 'development';
      if (isDev) console.log("[admin] Attempting login...");

      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        if (isDev) console.log("[admin] Login successful");
        // Login successful - httpOnly cookie is set automatically
        await router.replace("/adminDashboard");
      } else {
        if (isDev) console.log("[admin] Login failed:", data.error);
        setError(data.error || "Invalid password. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      // Log errors in development, or if they're unexpected
      if (isDev || !(err instanceof Error)) {
        console.error("[admin] Login error:", err);
      }
      setError("Failed to login. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-blue-100">
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: '#000' }}>
          Admin Login
        </h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-2 text-gray-700">Enter Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              placeholder="Password"
              autoFocus
              disabled={loading}
              required
            />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
