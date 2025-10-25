import { promises as fs } from "fs";
import path from "path";
import { pathToFileURL } from "url";

const servicesFilePath = path.join(process.cwd(), "data", "services.js");

function sanitizeNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function sanitizeString(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function sanitizeFeatureList(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => sanitizeString(item))
    .filter((item) => item.length > 0);
}

function formatServicesFileContent(services) {
  const servicesJson = JSON.stringify(services, null, 4);
  return `export const SERVICES = ${servicesJson};\n\nexport function getServiceById(id) {\n    return SERVICES.find((service) => service.id === id);\n}\n`;
}

async function readServicesFromFile() {
  const fileUrl = `${pathToFileURL(servicesFilePath).href}?update=${Date.now()}`;
  const module = await import(/* webpackIgnore: true */ fileUrl);
  if (!module || !Array.isArray(module.SERVICES)) {
    throw new Error("SERVICES export not found");
  }
  return module.SERVICES;
}

export default async function handler(request, response) {
  if (request.method === "GET") {
    try {
      const services = await readServicesFromFile();
      return response.status(200).json({ services });
    } catch (error) {
  return response.status(500).json({ error: error.message || "Failed to load services." });
    }
  }

  if (request.method === "PUT") {
    try {
      const { services } = request.body || {};

      if (!Array.isArray(services)) {
        return response.status(400).json({ error: "Payload must include a services array." });
      }

      const normalizedServices = services.map((service) => {
        const id = sanitizeString(service.id);
        if (!id) {
          throw new Error("Each service must include an id.");
        }

        return {
          id,
          title: sanitizeString(service.title),
          summary: sanitizeString(service.summary),
          basePrice: sanitizeNumber(service.basePrice),
          revivePrice: sanitizeNumber(service.revivePrice),
          durationMinutes: sanitizeNumber(service.durationMinutes),
          comingSoon: Boolean(service.comingSoon),
          baseFeatures: sanitizeFeatureList(service.baseFeatures),
          reviveFeatures: sanitizeFeatureList(service.reviveFeatures),
        };
      });

      const fileContent = formatServicesFileContent(normalizedServices);
      await fs.writeFile(servicesFilePath, fileContent, "utf8");

      return response.status(200).json({ services: normalizedServices });
    } catch (error) {
  return response.status(500).json({ error: error.message || "Failed to update services." });
    }
  }

  response.setHeader("Allow", ["GET", "PUT"]);
  return response.status(405).json({ error: "Method not allowed." });
}
