import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

const PdfCanvasViewer = dynamic(() => import("../components/PdfCanvasViewer"), {
  ssr: false,
});

const STATUS_OPTIONS = [
  { label: "Due", value: "due" },
  { label: "Paid", value: "paid" },
];

export default function InvoicePreviewPage() {
  const router = useRouter();
  const [status, setStatus] = useState("due");
  const [version, setVersion] = useState(() => Date.now());

  const bookingId =
    router.isReady && typeof router.query.bookingId === "string"
      ? router.query.bookingId
      : "";

  useEffect(() => {
    if (!router.isReady) return;
    const rawStatus =
      typeof router.query.status === "string"
        ? router.query.status.toLowerCase()
        : null;
    if (rawStatus && (rawStatus === "due" || rawStatus === "paid") && rawStatus !== status) {
      setStatus(rawStatus);
    }
  }, [router.isReady, router.query.status, status]);

  const pdfSource = useMemo(() => {
    const params = new URLSearchParams({ status, v: String(version) });
    if (bookingId) {
      params.set("bookingId", bookingId);
    }
    return `/api/invoice-preview?${params.toString()}`;
  }, [status, version, bookingId]);

  const handleRefresh = () => setVersion(Date.now());

  const handleStatusChange = (nextStatus) => {
    setStatus(nextStatus);
    if (router.isReady) {
      const nextQuery = {
        ...router.query,
        status: nextStatus,
      };
      if (!bookingId) {
        delete nextQuery.bookingId;
      }
      router.replace({ pathname: router.pathname, query: nextQuery }, undefined, {
        shallow: true,
      });
    }
    setVersion(Date.now());
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <main style={{ margin: "0 auto", maxWidth: "1100px", padding: "32px 24px 48px" }}>
        <header style={{ display: "flex", flexDirection: "column", gap: "16px", marginBottom: "24px" }}>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a" }}>Invoice Layout Preview</h1>
            <p style={{ color: "#475569", marginTop: "8px", maxWidth: "720px" }}>
              This temporary page lets us iterate on the PDF layout using representative booking data
              (two vehicles, multiple add-ons, travel, discount, tip, and tax). Refresh the preview after
              code changes to see updates immediately. Remove this page when the design is finalized.
            </p>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "#0f172a", fontWeight: 600 }}>
              <span>Invoice type:</span>
              <select
                value={status}
                onChange={(event) => handleStatusChange(event.target.value)}
                style={{
                  padding: "8px 12px",
                  borderRadius: "9999px",
                  border: "1px solid #cbd5f5",
                  background: "#fff",
                  color: "#0f172a",
                  fontWeight: 600,
                }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleRefresh}
              style={{
                padding: "10px 20px",
                borderRadius: "9999px",
                border: "none",
                fontWeight: 600,
                background: "linear-gradient(90deg, #3b82f6, #0ea5e9)",
                color: "#fff",
                cursor: "pointer",
                boxShadow: "0 16px 32px -22px rgba(14, 165, 233, 0.7)",
              }}
            >
              Refresh preview
            </button>
            <button
              type="button"
              onClick={() => {
                if (!pdfSource) return;
                const absoluteUrl =
                  typeof window === "undefined" ? pdfSource : `${window.location.origin}${pdfSource}`;
                window.open(absoluteUrl, "_blank", "noopener");
              }}
              disabled={!pdfSource}
              style={{
                padding: "10px 20px",
                borderRadius: "9999px",
                border: "1px solid #cbd5f5",
                fontWeight: 600,
                color: !pdfSource ? "#94a3b8" : "#0f172a",
                background: "#fff",
                cursor: !pdfSource ? "not-allowed" : "pointer",
                opacity: !pdfSource ? 0.6 : 1,
              }}
            >
              Open in new tab
            </button>
          </div>
        </header>

        <section
          style={{
            background: "#fff",
            borderRadius: "24px",
            boxShadow: "0 24px 48px -32px rgba(15, 23, 42, 0.35)",
            padding: "16px",
            border: "1px solid #e2e8f0",
            position: "relative",
          }}
        >
          <PdfCanvasViewer key={pdfSource} src={pdfSource} scale={1.15} />
        </section>
        <p style={{ marginTop: "16px", color: "#64748b", fontSize: "13px" }}>
          {bookingId
            ? `Previewing live invoice data for booking ${bookingId}.`
            : "Showing sample booking data. Append ?bookingId=<id> to preview a real invoice."}
        </p>
      </main>
    </div>
  );
}
