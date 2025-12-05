import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { isAuthenticated } from "../lib/auth";

export async function getServerSideProps(context) {
  const authenticated = isAuthenticated(context.req);

  if (!authenticated) {
    return {
      redirect: {
        destination: "/admin",
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
  addOns: [],
};

const cloneServices = (source) =>
  source.map((service) => ({
    ...service,
    baseFeatures: Array.isArray(service.baseFeatures) ? [...service.baseFeatures] : [],
    reviveFeatures: Array.isArray(service.reviveFeatures) ? [...service.reviveFeatures] : [],
    addOns: Array.isArray(service.addOns) ? service.addOns.map((addon) => ({ ...addon })) : [],
  }));

function AddOnEditor({ addOns, onChange, onAdd, onRemove }) {
  return (
    <div className="admin-services-panel">
      <div className="admin-services-panel__header">
        <h4 className="admin-services-panel__title" style={{ color: "#0f172a" }}>Add-ons</h4>
        <button type="button" onClick={onAdd} className="admin-services-chip-button">
          + Add add-on
        </button>
      </div>
      {addOns.length === 0 && (
        <p className="admin-services-panel__empty" style={{ color: "#2563eb" }}>
          No add-ons yet. Add one above.
        </p>
      )}
      <div className="admin-services-panel__body">
        {addOns.map((addon, index) => (
          <div key={index} className="admin-services-input-row">
            <input
              value={addon.name || ""}
              onChange={(event) => onChange(index, { ...addon, name: event.target.value })}
              placeholder="Add-on name"
              className="admin-services-input admin-services-input--grow"
            />
            <input
              type="number"
              value={addon.price ?? ""}
              onChange={(event) => {
                const parsed = Number(event.target.value);
                const price = Number.isNaN(parsed) ? 0 : parsed;
                onChange(index, { ...addon, price });
              }}
              placeholder="Price"
              min="0"
              className="admin-services-input admin-services-input--price"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="admin-services-btn admin-services-btn--danger"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureListEditor({ label, features, onChange, onAdd, onRemove }) {
  return (
    <div className="admin-services-panel">
      <div className="admin-services-panel__header">
        <h4 className="admin-services-panel__title" style={{ color: "#0f172a" }}>{label}</h4>
        <button type="button" onClick={onAdd} className="admin-services-chip-button">
          + Add item
        </button>
      </div>
      {features.length === 0 && (
        <p className="admin-services-panel__empty" style={{ color: "#2563eb" }}>
          No items yet. Add one above.
        </p>
      )}
      <div className="admin-services-panel__body">
        {features.map((feature, index) => (
          <div key={`${label}-${index}`} className="admin-services-input-row">
            <textarea
              value={feature}
              onChange={(event) => onChange(index, event.target.value)}
              rows={2}
              placeholder="Add bullet point"
              className="admin-services-textarea"
            />
            <button
              type="button"
              onClick={() => onRemove(index)}
              className="admin-services-btn admin-services-btn--danger"
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
    let active = true;

    const loadServices = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/services");
        if (!response.ok) {
          throw new Error("Unable to load services");
        }
        const data = await response.json();
        const fetched = Array.isArray(data.services) ? data.services : [];
        const normalized = fetched.map((service) => {
          const { _id, baseFeatures = [], reviveFeatures = [], addOns = [], ...rest } = service;
          return {
            ...emptyServiceTemplate,
            ...rest,
            baseFeatures: Array.isArray(baseFeatures) ? [...baseFeatures] : [],
            reviveFeatures: Array.isArray(reviveFeatures) ? [...reviveFeatures] : [],
            addOns: Array.isArray(addOns)
              ? addOns.map((addon) => ({ name: addon.name || "", price: Number(addon.price) || 0 }))
              : [],
            comingSoon: Boolean(service.comingSoon),
          };
        });
        if (active) {
          const cloned = cloneServices(normalized);
          setServices(cloned);
          setInitialServices(cloneServices(cloned));
        }
      } catch (fetchError) {
        if (active) {
          setError(fetchError.message || "Failed to load services.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadServices();

    return () => {
      active = false;
    };
  }, []);

  const hasChanges = useMemo(() => {
    if (services.length !== initialServices.length) {
      return true;
    }
    return JSON.stringify(services) !== JSON.stringify(initialServices);
  }, [services, initialServices]);

  const bannerVisible = hasChanges || saving;

  const handleServiceChange = (serviceIndex, field, value) => {
    setServices((prev) =>
      prev.map((service, index) =>
        index === serviceIndex
          ? { ...service, [field]: field === "id" ? value.trim() : value }
          : service
      )
    );
  };

  const handleNumberChange = (serviceIndex, field, value) => {
    if (value === "") {
      handleServiceChange(serviceIndex, field, null);
      return;
    }
    const parsed = Number(value);
    handleServiceChange(serviceIndex, field, Number.isNaN(parsed) ? null : parsed);
  };

  const handleFeatureChange = (serviceIndex, key, featureIndex, value) => {
    setServices((prev) =>
      prev.map((service, index) => {
        if (index !== serviceIndex) {
          return service;
        }
        const items = Array.isArray(service[key]) ? [...service[key]] : [];
        items[featureIndex] = value;
        return { ...service, [key]: items };
      })
    );
  };

  const handleFeatureAdd = (serviceIndex, key) => {
    setServices((prev) =>
      prev.map((service, index) => {
        if (index !== serviceIndex) {
          return service;
        }
        const items = Array.isArray(service[key]) ? [...service[key]] : [];
        items.push("");
        return { ...service, [key]: items };
      })
    );
  };

  const handleFeatureRemove = (serviceIndex, key, featureIndex) => {
    setServices((prev) =>
      prev.map((service, index) => {
        if (index !== serviceIndex) {
          return service;
        }
        const items = Array.isArray(service[key]) ? [...service[key]] : [];
        items.splice(featureIndex, 1);
        return { ...service, [key]: items };
      })
    );
  };

  const handleAddOnChange = (serviceIndex, addOnIndex, nextAddon) => {
    setServices((prev) =>
      prev.map((service, index) => {
        if (index !== serviceIndex) {
          return service;
        }
        const addOns = Array.isArray(service.addOns) ? [...service.addOns] : [];
        addOns[addOnIndex] = nextAddon;
        return { ...service, addOns };
      })
    );
  };

  const handleAddOnAdd = (serviceIndex) => {
    setServices((prev) =>
      prev.map((service, index) => {
        if (index !== serviceIndex) {
          return service;
        }
        const addOns = Array.isArray(service.addOns) ? [...service.addOns] : [];
        addOns.push({ name: "", price: 0 });
        return { ...service, addOns };
      })
    );
  };

  const handleAddOnRemove = (serviceIndex, addOnIndex) => {
    setServices((prev) =>
      prev.map((service, index) => {
        if (index !== serviceIndex) {
          return service;
        }
        const addOns = Array.isArray(service.addOns) ? [...service.addOns] : [];
        addOns.splice(addOnIndex, 1);
        return { ...service, addOns };
      })
    );
  };

  const handleReset = () => {
    setServices(cloneServices(initialServices));
    setError("");
    setSuccess("");
  };

  const handleAddNewService = () => {
    setServices((prev) => {
      const nextId = `service-${prev.length + 1}`;
      return [...prev, { ...emptyServiceTemplate, id: nextId }];
    });
  };

  const handleDeleteService = (serviceIndex) => {
    setServices((prev) => prev.filter((_, index) => index !== serviceIndex));
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
      const normalized = updated.map((service) => {
        const { _id, baseFeatures = [], reviveFeatures = [], addOns = [], ...rest } = service;
        return {
          ...emptyServiceTemplate,
          ...rest,
          baseFeatures: Array.isArray(baseFeatures) ? [...baseFeatures] : [],
          reviveFeatures: Array.isArray(reviveFeatures) ? [...reviveFeatures] : [],
          addOns: Array.isArray(addOns)
            ? addOns.map((addon) => ({ name: addon.name || "", price: Number(addon.price) || 0 }))
            : [],
          comingSoon: Boolean(service.comingSoon),
        };
      });

      const cloned = cloneServices(normalized);
      setServices(cloned);
      setInitialServices(cloneServices(cloned));
      setSuccess("Services updated successfully.");
    } catch (saveError) {
      setError(saveError.message || "Failed to save services.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="admin-services-page">
      <div className="admin-services-container">
        <div className="admin-services-toolbar">
          <div className="admin-services-toolbar__row">
            <Link href="/adminDashboard" className="admin-services-btn admin-services-btn--ghost">
              ← Back to Dashboard
            </Link>
            <button
              type="button"
              onClick={handleAddNewService}
              className="admin-services-btn admin-services-btn--success"
            >
              Add New Service
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await fetch("/api/auth/logout", { method: "POST" });
                  router.replace("/admin");
                } catch (logoutError) {
                  console.error("Logout error:", logoutError);
                  router.replace("/admin");
                }
              }}
              className="admin-services-btn admin-services-btn--danger"
            >
              Logout
            </button>
          </div>
        </div>

        <div
          className={`admin-services-banner ${bannerVisible ? "admin-services-banner--visible" : ""}`}
          aria-hidden={!bannerVisible}
        >
          <div className="admin-services-banner__content">
            <div className="admin-services-banner__text">
              <span className="admin-services-banner__status" style={{ color: saving ? "#2563eb" : "#0f172a" }}>
                {saving ? "Saving updates…" : "Unsaved changes"}
              </span>
              {!saving && (
                <span className="admin-services-banner__message" style={{ color: "#2563eb" }}>
                  Your edits will persist once you save.
                </span>
              )}
            </div>
            <div className="admin-services-banner__actions">
              <button
                type="button"
                onClick={handleReset}
                disabled={!hasChanges || saving}
                className="admin-services-btn admin-services-btn--ghost"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!hasChanges || saving}
                className="admin-services-btn admin-services-btn--primary"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>

        <header className="admin-services-hero">
          <h1 className="admin-services-hero__title" style={{ color: "#0f172a" }}>
            Services & Pricing Editor
          </h1>
          <p className="admin-services-hero__subtitle" style={{ color: "#2563eb" }}>
            Update prices, toggle availability, and adjust bullet points for each plan. Changes are saved directly to
            <code className="admin-services-hero__badge">MongoDB (services collection)</code>.
          </p>
          {error && (
            <div className="admin-services-alert admin-services-alert--error" style={{ color: "#dc2626" }}>
              {error}
            </div>
          )}
          {success && (
            <div className="admin-services-alert admin-services-alert--success" style={{ color: "#047857" }}>
              {success}
            </div>
          )}
        </header>

        {loading ? (
          <div className="admin-services-empty" style={{ color: "#2563eb" }}>
            Loading services...
          </div>
        ) : services.length === 0 ? (
          <div className="admin-services-empty" style={{ color: "#2563eb" }}>
            No services found. Add a new service to get started.
          </div>
        ) : (
          <div className="admin-services-list">
            {services.map((service, index) => (
              <section
                key={service.id || index}
                className="admin-service-card"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="admin-service-card__header">
                  <div className="admin-service-card__meta">
                    <span className="admin-service-chip">{service.id || "New service"}</span>
                    <h2 className="admin-service-card__title" style={{ color: "#0f172a" }}>
                      {service.title || "Untitled Service"}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteService(index)}
                    className="admin-services-btn admin-services-btn--danger"
                  >
                    Delete service
                  </button>
                </div>
                <div className="admin-service-card__content">
                  <div className="admin-service-grid">
                    <label className="admin-service-field">
                      <span className="admin-service-field__label" style={{ color: "#1e293b" }}>
                        Service ID
                      </span>
                      <input
                        type="text"
                        value={service.id}
                        onChange={(event) => handleServiceChange(index, "id", event.target.value)}
                        className="admin-services-input"
                      />
                    </label>
                    <label className="admin-service-field">
                      <span className="admin-service-field__label" style={{ color: "#1e293b" }}>
                        Title
                      </span>
                      <input
                        type="text"
                        value={service.title || ""}
                        onChange={(event) => handleServiceChange(index, "title", event.target.value)}
                        className="admin-services-input"
                      />
                    </label>
                    <label className="admin-service-field">
                      <span className="admin-service-field__label" style={{ color: "#1e293b" }}>
                        Summary
                      </span>
                      <textarea
                        value={service.summary || ""}
                        onChange={(event) => handleServiceChange(index, "summary", event.target.value)}
                        rows={3}
                        className="admin-services-textarea"
                      />
                    </label>
                    <label className="admin-service-field">
                      <span className="admin-service-field__label" style={{ color: "#1e293b" }}>
                        Base Price
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={service.basePrice ?? ""}
                        onChange={(event) => handleNumberChange(index, "basePrice", event.target.value)}
                        className="admin-services-input"
                      />
                    </label>
                    <label className="admin-service-field">
                      <span className="admin-service-field__label" style={{ color: "#1e293b" }}>
                        Revive Price
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={service.revivePrice ?? ""}
                        onChange={(event) => handleNumberChange(index, "revivePrice", event.target.value)}
                        className="admin-services-input"
                      />
                    </label>
                    <label className="admin-service-field">
                      <span className="admin-service-field__label" style={{ color: "#1e293b" }}>
                        Duration (minutes)
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="15"
                        value={service.durationMinutes ?? ""}
                        onChange={(event) => handleNumberChange(index, "durationMinutes", event.target.value)}
                        className="admin-services-input"
                      />
                    </label>
                  </div>
                  <label className="admin-services-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(service.comingSoon)}
                      onChange={(event) => handleServiceChange(index, "comingSoon", event.target.checked)}
                      className="admin-services-toggle__input"
                    />
                    <span style={{ color: "#1e293b" }}>Coming soon (hide from booking form)</span>
                  </label>
                </div>
                <div className="admin-services-editor-grid">
                  <FeatureListEditor
                    label="Base Plan Features"
                    features={service.baseFeatures || []}
                    onChange={(featureIndex, value) =>
                      handleFeatureChange(index, "baseFeatures", featureIndex, value)
                    }
                    onAdd={() => handleFeatureAdd(index, "baseFeatures")}
                    onRemove={(featureIndex) =>
                      handleFeatureRemove(index, "baseFeatures", featureIndex)
                    }
                  />
                  <FeatureListEditor
                    label="Revive Plan Features"
                    features={service.reviveFeatures || []}
                    onChange={(featureIndex, value) =>
                      handleFeatureChange(index, "reviveFeatures", featureIndex, value)
                    }
                    onAdd={() => handleFeatureAdd(index, "reviveFeatures")}
                    onRemove={(featureIndex) =>
                      handleFeatureRemove(index, "reviveFeatures", featureIndex)
                    }
                  />
                  <AddOnEditor
                    addOns={service.addOns || []}
                    onChange={(addOnIndex, addon) =>
                      handleAddOnChange(index, addOnIndex, addon)
                    }
                    onAdd={() => handleAddOnAdd(index)}
                    onRemove={(addOnIndex) => handleAddOnRemove(index, addOnIndex)}
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
