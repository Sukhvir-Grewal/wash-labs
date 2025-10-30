import { useMemo, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { isAuthenticated } from "../lib/auth";

/**
 * Server-side authentication check
 * Redirect to login if not authenticated
 */
export async function getServerSideProps(context) {
  const authenticated = isAuthenticated(context.req);
  
  if (!authenticated) {
    return {
      redirect: {
        destination: '/admin',
        permanent: false,
      },
    };
  }
  
  return {
    props: {},
  };
}

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
    <div style={{ background: '#F8FAFC', borderRadius: 16, padding: 20, marginBottom: 8, border: '1px solid #E0E7EF' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <h4 style={{ fontSize: 16, fontWeight: 600, color: '#1E293B', margin: 0 }}>{label}</h4>
        <button
          type="button"
          onClick={onAdd}
          style={{ borderRadius: 20, border: '1px solid #60A5FA', padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#2563EB', background: '#EFF6FF', cursor: 'pointer' }}
        >
          + Add item
        </button>
      </div>
      {features.length === 0 && (
        <p style={{ fontSize: 13, color: '#2563EB', margin: 0 }}>No items yet. Add one above.</p>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {features.map((feature, index) => (
          <div key={`${label}-${index}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <textarea
              value={feature}
              onChange={(event) => onChange(index, event.target.value)}
              rows={2}
              placeholder="Add bullet point"
              style={{ flex: 1, borderRadius: 8, border: '1px solid #CBD5E1', background: '#F1F5F9', padding: 10, fontSize: 14, color: '#1E293B', resize: 'vertical', minHeight: 40, maxHeight: 80 }}
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              style={{ borderRadius: 8, border: '1px solid #FCA5A5', padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#DC2626', background: '#FEF2F2', cursor: 'pointer', marginTop: 2 }}
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
  const router = useRouter();
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
    <main style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #EFF6FF 0%, #FFFFFF 100%)', padding: '32px 0', color: '#1E293B' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 40 }}>
        {/* Top Bar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 8, alignItems: 'stretch', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/adminDashboard"
              style={{ borderRadius: 8, border: '1px solid #BFDBFE', background: '#FFFFFF', padding: '10px 20px', fontSize: 15, fontWeight: 600, color: '#2563EB', boxShadow: '0 1px 4px #e0e7ef33', textDecoration: 'none', transition: 'background 0.2s' }}
            >
              ← Back to Dashboard
            </Link>
            <button
              type="button"
              onClick={handleAddNewService}
              style={{ borderRadius: 8, border: '1px solid #BBF7D0', background: '#ECFDF5', padding: '10px 20px', fontSize: 15, fontWeight: 600, color: '#059669', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              Add New Service
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' });
                  router.replace('/admin');
                } catch (err) {
                  console.error('Logout error:', err);
                  router.replace('/admin');
                }
              }}
              style={{ borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', padding: '10px 20px', fontSize: 15, fontWeight: 600, color: '#DC2626', cursor: 'pointer', transition: 'background 0.2s' }}
            >
              Logout
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasChanges || saving}
              style={{ borderRadius: 8, border: '1px solid #BFDBFE', background: '#FFFFFF', padding: '10px 20px', fontSize: 15, fontWeight: 600, color: '#2563EB', opacity: !hasChanges || saving ? 0.5 : 1, cursor: !hasChanges || saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!hasChanges || saving}
              style={{ borderRadius: 8, background: '#2563EB', padding: '10px 28px', fontSize: 15, fontWeight: 600, color: '#FFFFFF', boxShadow: '0 1px 4px #2563eb22', opacity: !hasChanges || saving ? 0.5 : 1, cursor: !hasChanges || saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s' }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Header */}
        <header style={{ borderRadius: 20, border: '1px solid #BFDBFE', background: 'linear-gradient(90deg, #EFF6FF 0%, #FFFFFF 100%)', padding: 32, boxShadow: '0 2px 8px #e0e7ef22' }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#0A0A0A', margin: 0 }}>Services & Pricing Editor</h1>
          <p style={{ marginTop: 10, fontSize: 16, color: '#2563EB' }}>
            Update prices, toggle availability, and adjust bullet points for each plan. Changes are saved directly to
            <code style={{ marginLeft: 8, borderRadius: 6, background: '#DBEAFE', padding: '2px 8px', fontSize: 13, color: '#1E40AF' }}>MongoDB (services collection)</code>.
          </p>
          {error && <div style={{ marginTop: 16, borderRadius: 8, border: '1px solid #FCA5A5', background: '#FEF2F2', padding: '10px 18px', fontSize: 15, color: '#DC2626' }}>{error}</div>}
          {success && <div style={{ marginTop: 16, borderRadius: 8, border: '1px solid #BBF7D0', background: '#ECFDF5', padding: '10px 18px', fontSize: 15, color: '#059669' }}>{success}</div>}
        </header>

        {/* Main Content */}
        {loading ? (
          <div style={{ borderRadius: 20, border: '1px solid #BFDBFE', background: '#FFFFFF', padding: 40, textAlign: 'center', color: '#2563EB', fontSize: 18, boxShadow: '0 1px 4px #e0e7ef33' }}>
            Loading services...
          </div>
        ) : services.length === 0 ? (
          <div style={{ borderRadius: 20, border: '1px solid #BFDBFE', background: '#FFFFFF', padding: 40, textAlign: 'center', color: '#2563EB', fontSize: 18, boxShadow: '0 1px 4px #e0e7ef33' }}>
            No services found. Add a new service to get started.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 36 }}>
            {services.map((service, index) => (
              <section key={service.id || index} style={{ borderRadius: 20, border: '1px solid #E0E7EF', background: '#FFFFFFF7', padding: 28, boxShadow: '0 2px 8px #e0e7ef22', transition: 'box-shadow 0.2s' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 8 }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', borderRadius: 16, background: '#DBEAFE', padding: '6px 16px', fontSize: 13, fontWeight: 600, color: '#2563EB' }}>
                      {service.id || 'New service'}
                    </span>
                    <h2 style={{ fontSize: 22, fontWeight: 600, color: '#0A0A0A', margin: 0 }}>
                      {service.title || 'Untitled Service'}
                    </h2>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(index)}
                      style={{ marginLeft: 'auto', borderRadius: 8, border: '1px solid #FCA5A5', padding: '8px 16px', fontSize: 14, fontWeight: 600, color: '#DC2626', background: '#FEF2F2', cursor: 'pointer' }}
                    >
                      Delete service
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div style={{ display: 'grid', gap: 18, gridTemplateColumns: '1fr', maxWidth: 900 }}>
                      <label style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', display: 'block' }}>
                        Service ID
                        <input
                          type="text"
                          value={service.id}
                          onChange={(event) => handleServiceChange(index, 'id', event.target.value)}
                          style={{ marginTop: 6, width: '100%', borderRadius: 8, border: '1px solid #CBD5E1', background: '#F1F5F9', padding: '10px 12px', fontSize: 15, color: '#1E293B' }}
                        />
                      </label>
                      <label style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', display: 'block' }}>
                        Title
                        <input
                          type="text"
                          value={service.title || ''}
                          onChange={(event) => handleServiceChange(index, 'title', event.target.value)}
                          style={{ marginTop: 6, width: '100%', borderRadius: 8, border: '1px solid #CBD5E1', background: '#F1F5F9', padding: '10px 12px', fontSize: 15, color: '#1E293B' }}
                        />
                      </label>
                      <label style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', display: 'block' }}>
                        Summary
                        <textarea
                          value={service.summary || ''}
                          onChange={(event) => handleServiceChange(index, 'summary', event.target.value)}
                          rows={3}
                          style={{ marginTop: 6, width: '100%', borderRadius: 8, border: '1px solid #CBD5E1', background: '#F1F5F9', padding: '10px 12px', fontSize: 15, color: '#1E293B', resize: 'vertical', minHeight: 48 }}
                        />
                      </label>
                      <label style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', display: 'block' }}>
                        Base Price
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={service.basePrice ?? ''}
                          onChange={(event) => handleNumberChange(index, 'basePrice', event.target.value)}
                          style={{ marginTop: 6, width: '100%', borderRadius: 8, border: '1px solid #CBD5E1', background: '#F1F5F9', padding: '10px 12px', fontSize: 15, color: '#1E293B' }}
                        />
                      </label>
                      <label style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', display: 'block' }}>
                        Revive Price
                        <input
                          type="number"
                          min="0"
                          step="1"
                          value={service.revivePrice ?? ''}
                          onChange={(event) => handleNumberChange(index, 'revivePrice', event.target.value)}
                          style={{ marginTop: 6, width: '100%', borderRadius: 8, border: '1px solid #CBD5E1', background: '#F1F5F9', padding: '10px 12px', fontSize: 15, color: '#1E293B' }}
                        />
                      </label>
                      <label style={{ fontSize: 15, fontWeight: 600, color: '#1E293B', display: 'block' }}>
                        Duration (minutes)
                        <input
                          type="number"
                          min="0"
                          step="15"
                          value={service.durationMinutes ?? ''}
                          onChange={(event) => handleNumberChange(index, 'durationMinutes', event.target.value)}
                          style={{ marginTop: 6, width: '100%', borderRadius: 8, border: '1px solid #CBD5E1', background: '#F1F5F9', padding: '10px 12px', fontSize: 15, color: '#1E293B' }}
                        />
                      </label>
                    </div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 600, color: '#1E293B', marginTop: 8 }}>
                      <input
                        type="checkbox"
                        checked={Boolean(service.comingSoon)}
                        onChange={(event) => handleServiceChange(index, 'comingSoon', event.target.checked)}
                        style={{ width: 20, height: 20, borderRadius: 6, border: '1px solid #93C5FD', accentColor: '#2563EB' }}
                      />
                      Coming soon (hide from booking form)
                    </label>
                  </div>
                </div>
                <div style={{ display: 'grid', gap: 24, gridTemplateColumns: '1fr', marginTop: 24 }}>
                  <FeatureListEditor
                    label="Base Plan Features"
                    features={service.baseFeatures || []}
                    onChange={(featureIndex, value) => handleFeatureChange(index, 'baseFeatures', featureIndex, value)}
                    onAdd={() => handleFeatureAdd(index, 'baseFeatures')}
                    onRemove={(featureIndex) => handleFeatureRemove(index, 'baseFeatures', featureIndex)}
                  />
                  <FeatureListEditor
                    label="Revive Plan Features"
                    features={service.reviveFeatures || []}
                    onChange={(featureIndex, value) => handleFeatureChange(index, 'reviveFeatures', featureIndex, value)}
                    onAdd={() => handleFeatureAdd(index, 'reviveFeatures')}
                    onRemove={(featureIndex) => handleFeatureRemove(index, 'reviveFeatures', featureIndex)}
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
