import { WorkerMessageHandler } from "pdfjs-dist/legacy/build/pdf.worker.mjs";

// Initialize the PDF.js worker using the provided port.
WorkerMessageHandler.initializeFromPort(self);
