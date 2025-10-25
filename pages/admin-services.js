import { useMemo, useEffect, useState } from "react";
import Link from "next/link";

const emptyServiceTemplate = {
  id: "",
  title: "",
  summary: "",
  basePrice: null,
  revivePrice: null,
  durationMinutes: null,
  comingSoon: false,
  baseFeatures: [],
  reviveFeatures: [],
};

function FeatureListEditor({ label, features, onChange, onAdd, onRemove }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-full border border-blue-200 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50"
        >
          + Add item
        </button>
      </div>
      {features.length === 0 && (
        <p className="text-xs text-blue-500">No items yet. Add one above.</p>
      )}
      <div className="space-y-2">
        {features.map((feature, index) => (
          <div key={`${label}-${index}`} className="flex items-start gap-2">
            <textarea
              value={feature}
              onChange={(event) => onChange(index, event.target.value)}
              rows={2}
              placeholder="Add bullet point"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminServicesPage() {
  const [services, setServices] = useState([]);
  const [initialServices, setInitialServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadServices() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/services");
        if (!response.ok) {
          throw new Error("Unable to load services.");
        }
  const data = await response.json();
  const fetched = Array.isArray(data.services) ? data.services : [];
  const cloned = JSON.parse(JSON.stringify(fetched));
  setServices(cloned);
  setInitialServices(cloned);
      } catch (loadError) {
        setError(loadError.message || "Unable to load services.");
        setServices([]);
        setInitialServices([]);
      }
      setLoading(false);
    }

    loadServices();
  }, []);

  const hasChanges = useMemo(() => {
    return JSON.stringify(services) !== JSON.stringify(initialServices);
  }, [services, initialServices]);

  const handleServiceChange = (index, key, value) => {
    setServices((prev) =>
      prev.map((service, svcIndex) =>
        svcIndex === index
          ? {
              ...service,
              [key]: value,
            }
          : service
      )
    );
  };

  const handleNumberChange = (index, key, value) => {
    handleServiceChange(index, key, value === "" ? "" : Number(value));
  };

  const handleFeatureChange = (index, field, featureIndex, value) => {
    setServices((prev) =>
      prev.map((service, svcIndex) => {
        if (svcIndex !== index) return service;
        const list = Array.isArray(service[field]) ? [...service[field]] : [];
        list[featureIndex] = value;
        return {
          ...service,
          [field]: list,
        };
      })
    );
  };

  const handleFeatureAdd = (index, field) => {
    setServices((prev) =>
      prev.map((service, svcIndex) => {
        if (svcIndex !== index) return service;
        const list = Array.isArray(service[field]) ? [...service[field]] : [];
        list.push("");
        return {
          ...service,
          [field]: list,
        };
      })
    );
  };

  const handleFeatureRemove = (index, field, featureIndex) => {
    setServices((prev) =>
      prev.map((service, svcIndex) => {
        if (svcIndex !== index) return service;
        const list = Array.isArray(service[field]) ? [...service[field]] : [];
        list.splice(featureIndex, 1);
        return {
          ...service,
          [field]: list,
        };
      })
    );
  };

  const handleReset = () => {
    setServices(initialServices);
    setError("");
    setSuccess("");
  };

  const handleAddNewService = () => {
    setServices((prev) => [...prev, { ...emptyServiceTemplate, id: `service-${prev.length + 1}` }]);
  };

  const handleDeleteService = (index) => {
    setServices((prev) => prev.filter((_, svcIndex) => svcIndex !== index));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ services }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Failed to save services.");
      }

      const updated = Array.isArray(data.services) ? data.services : services;
      const cloned = JSON.parse(JSON.stringify(updated));
      setServices(cloned);
      setInitialServices(cloned);
      setSuccess("Services updated successfully.");
    } catch (saveError) {
      setError(saveError.message || "Failed to save services.");
    }
    setSaving(false);
  };

  return (
    <main className="min-h-screen bg-blue-50 px-4 py-10 text-blue-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/adminDashboard"
              className="rounded-lg border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
            >
              ← Back to Dashboard
            </Link>
            <button
              type="button"
              onClick={handleAddNewService}
              className="rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 transition-colors hover:bg-green-100"
            >
              Add New Service
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasChanges || saving}
              className="rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 transition-colors hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <header className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-50 via-white to-blue-50 p-6 shadow">
          <h1 className="text-2xl font-bold text-slate-900">
            Services & Pricing Editor
          </h1>
          <p className="mt-2 text-sm text-blue-700">
            Update prices, toggle availability, and adjust bullet points for each plan. Changes are saved directly to
            <code className="ml-1 rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">data/services.js</code>.
          </p>
          {error && <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
          {success && <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700">{success}</div>}
        </header>

        {loading ? (
          <div className="rounded-2xl border border-blue-200 bg-white p-10 text-center text-blue-600 shadow">
            Loading services...
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-2xl border border-blue-200 bg-white p-10 text-center text-blue-600 shadow">
            No services found. Add a new service to get started.
          </div>
        ) : (
          <div className="space-y-8">
            {services.map((service, index) => (
              <section key={service.id || index} className="rounded-2xl border border-blue-100 bg-white/90 p-6 shadow transition-shadow hover:shadow-lg">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 space-y-2">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                      {service.id || "New service"}
                    </span>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {service.title || "Untitled Service"}
                    </h2>
                  </div>
                  <div className="space-y-4 sm:flex-1">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-semibold text-slate-900">
                        Service ID
                        <input
                          type="text"
                          value={service.id}
                          onChange={(event) => handleServiceChange(index, "id", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-900">
                        Title
                        <input
                          type="text"
                          value={service.title || ""}
                          onChange={(event) => handleServiceChange(index, "title", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-900 sm:col-span-2">
                        Summary
                        <textarea
                          value={service.summary || ""}
                          onChange={(event) => handleServiceChange(index, "summary", event.target.value)}
                          rows={3}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-900">
                        Base Price
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={service.basePrice ?? ""}
                          onChange={(event) => handleNumberChange(index, "basePrice", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-900">
                        Revive Price
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={service.revivePrice ?? ""}
                          onChange={(event) => handleNumberChange(index, "revivePrice", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                        />
                      </label>
                      <label className="text-sm font-semibold text-slate-900">
                        Duration (minutes)
                        <input
                          type="number"
                          min="0"
                          step="15"
                          value={service.durationMinutes ?? ""}
                          onChange={(event) => handleNumberChange(index, "durationMinutes", event.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
                        />
                      </label>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <input
                        type="checkbox"
                        checked={Boolean(service.comingSoon)}
                        onChange={(event) => handleServiceChange(index, "comingSoon", event.target.checked)}
                        className="h-4 w-4 rounded border border-blue-300 text-blue-600 focus:ring-blue-500"
                      />
                      Coming soon (hide from booking form)
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteService(index)}
                    className="self-start rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                  >
                    Delete service
                  </button>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <FeatureListEditor
                    label="Base Plan Features"
                    features={service.baseFeatures || []}
                    onChange={(featureIndex, value) => handleFeatureChange(index, "baseFeatures", featureIndex, value)}
                    onAdd={() => handleFeatureAdd(index, "baseFeatures")}
                    onRemove={(featureIndex) => handleFeatureRemove(index, "baseFeatures", featureIndex)}
                  />
                  <FeatureListEditor
                    label="Revive Plan Features"
                    features={service.reviveFeatures || []}
                    onChange={(featureIndex, value) => handleFeatureChange(index, "reviveFeatures", featureIndex, value)}
                    onAdd={() => handleFeatureAdd(index, "reviveFeatures")}
                    onRemove={(featureIndex) => handleFeatureRemove(index, "reviveFeatures", featureIndex)}
                  />
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
