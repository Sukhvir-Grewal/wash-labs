import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function AdminPage() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const PASSWORD = "Detailing1313!";

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem("adminAuth");
      if (saved === PASSWORD) {
        router.replace("/adminDashboard");
      }
    }
  }, [router]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === PASSWORD) {
      window.localStorage.setItem("adminAuth", PASSWORD);
      router.replace("/adminDashboard");
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-blue-50">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md border border-blue-100">
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: '#000' }}>Admin Login</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm mb-2 text-gray-700">Enter Password</label>
            <input
              type="password"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full px-4 py-3 rounded-lg bg-white border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              placeholder="Password"
              autoFocus
            />
            {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  );
}
