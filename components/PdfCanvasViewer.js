"use client";

import { useEffect, useRef, useState } from "react";

export default function PdfCanvasViewer({ src, scale = 1.25 }) {
  const containerRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!src) return;

    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const renderPdf = async () => {
      setLoading(true);
      setError("");
      container.innerHTML = "";

      try {
        const response = await fetch(src, { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const pdfjsModule = await import("pdfjs-dist/legacy/build/pdf");
        const { getDocument } = pdfjsModule;

        const pdf = await getDocument({ data: arrayBuffer, disableWorker: true }).promise;
        if (cancelled) return;

        for (let pageIndex = 1; pageIndex <= pdf.numPages; pageIndex += 1) {
          if (cancelled) break;
          const page = await pdf.getPage(pageIndex);
          const viewport = page.getViewport({ scale });

          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          canvas.style.display = "block";
          canvas.style.width = "100%";
          canvas.style.height = "auto";
          canvas.style.margin = pageIndex === pdf.numPages ? "0 auto" : "0 auto 24px";
          canvas.style.boxShadow = "0 18px 36px -28px rgba(15, 23, 42, 0.55)";
          canvas.style.borderRadius = "12px";
          canvas.style.background = "#fff";

          container.appendChild(canvas);
          await page.render({ canvasContext: context, viewport }).promise;
        }

        if (cancelled) return;
        setLoading(false);
      } catch (caughtError) {
        if (cancelled) return;
        container.innerHTML = "";
        setError(caughtError.message || "Unable to render PDF preview");
        setLoading(false);
      }
    };

    renderPdf();

    return () => {
      cancelled = true;
      if (container) container.innerHTML = "";
    };
  }, [src, scale]);

  return (
    <div style={{ position: "relative", minHeight: "80vh" }}>
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: "24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(248, 250, 252, 0.9)",
            borderRadius: "16px",
            color: "#0f172a",
            fontWeight: 600,
            letterSpacing: "0.02em",
          }}
        >
          Rendering PDF…
        </div>
      )}

      {error && (
        <div
          style={{
            background: "#fee2e2",
            border: "1px solid #f87171",
            borderRadius: "16px",
            padding: "24px",
            color: "#7f1d1d",
            fontWeight: 600,
            display: "flex",
            flexDirection: "column",
            gap: "8px",
          }}
        >
          <span>Preview failed</span>
          <span style={{ fontWeight: 400 }}>{error}</span>
          <span style={{ fontSize: "14px", color: "#b91c1c" }}>
            Check the browser console for more details if this keeps happening.
          </span>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          display: error ? "none" : "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "24px",
          gap: "24px",
        }}
      />
    </div>
  );
}
