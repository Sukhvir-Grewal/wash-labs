import { useState, useEffect } from "react";

const baseFieldClass =
  "w-full rounded-2xl border border-slate-700/70 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 transition focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40";

export default function AdminAddBooking({ open, onClose, onAdd, editBooking, onEdit }) {
  const [submitStatus, setSubmitStatus] = useState(null);
  const [submitMsg, setSubmitMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState(false);
  const carTypeOptions = [
    { label: "Sedan", price: 0 },
    { label: "SUV", price: 20 },
    { label: "7 Seater", price: 20 },
    { label: "Truck", price: 40 },
  ];

  const [serviceOptions, setServiceOptions] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);

  const [newBooking, setNewBooking] = useState({
    name: "",
    cars: [{ name: "", type: carTypeOptions[0].label, service: "", addOns: [] }],
    date: "",
    time: "",
    amount: 0,
    status: "pending",
    phone: "",
    email: "",
    location: "",
    discount: 0,
    travelExpense: 0,
  });

  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [calendarStatus, setCalendarStatus] = useState(null);
  const [checkingCalendar, setCheckingCalendar] = useState(false);
  const [dismissCalendarWarning, setDismissCalendarWarning] = useState(false);

  useEffect(() => {
    async function loadServices() {
      setServicesLoading(true);
      try {
        const resp = await fetch("/api/services");
        const data = await resp.json();
        if (Array.isArray(data.services)) {
          const servicesData = data.services.map((s) => ({
            title: s.title,
            basePrice: s.basePrice,
            hasAddOns: Array.isArray(s.addOns) && s.addOns.length > 0,
            addOns: s.addOns,
          }));
          setServiceOptions(servicesData);

        } else {
          setServiceOptions([]);
        }
      } catch (err) {
        console.error("Failed to load services:", err);
        setServiceOptions([]);
      } finally {
        setServicesLoading(false);
      }
    }

    if (open && serviceOptions.length === 0 && !servicesLoading) {
      loadServices();
    }
  }, [open, serviceOptions.length, servicesLoading]);

  useEffect(() => {
    if (!open || editBooking || serviceOptions.length === 0) return;

    setNewBooking((prev) => {
      const cars = Array.isArray(prev.cars) && prev.cars.length
        ? prev.cars
        : [{ name: "", type: carTypeOptions[0].label, service: "", addOns: [] }];

      const updatedCars = cars.map((car, index) =>
        index === 0 && !car.service
          ? { ...car, service: serviceOptions[0].title }
          : car
      );

      const updated = { ...prev, cars: updatedCars };
      if (!overrideAmount) {
        const perCarTotals = updatedCars.map((car) =>
          calculatePrice(car.service || "", car.addOns || [], car.type)
        );
        const base = perCarTotals.reduce((sum, value) => sum + value, 0);
        updated.amount = base + Number(updated.travelExpense || 0) - Number(updated.discount || 0);
      }
      return updated;
    });
  }, [open, editBooking, serviceOptions, overrideAmount]);

  useEffect(() => {
    if (!open) return;

    if (editBooking) {
      setNewBooking({
        ...editBooking,
        cars:
          Array.isArray(editBooking.cars) && editBooking.cars.length
            ? editBooking.cars.map((c) => ({
                ...c,
                service: c.service || "",
                addOns: Array.isArray(c.addOns) ? c.addOns : [],
              }))
            : [
                {
                  name: editBooking.carName || "",
                  type: editBooking.carType || carTypeOptions[0].label,
                  service: editBooking.service || "",
                  addOns: [],
                },
              ],
        amount:
          Array.isArray(editBooking.cars) && editBooking.cars.length
            ? (Array.isArray(editBooking.perCarTotals)
                ? editBooking.perCarTotals.reduce((sum, value) => sum + value, 0)
                : 0) + Number(editBooking.travelExpense || 0) - Number(editBooking.discount || 0)
            : editBooking.amount || 0,
      });
      setOverrideAmount(false);
    } else {
      setNewBooking({
        name: "",
        cars: [
          {
            name: "",
            type: carTypeOptions[0].label,
            service: serviceOptions[0]?.title || "",
            addOns: [],
          },
        ],
        date: "",
        time: "",
        amount: serviceOptions[0]?.basePrice || 0,
        status: "pending",
        phone: "",
        email: "",
        location: "",
        discount: 0,
        travelExpense: 0,
      });
      setOverrideAmount(false);
    }
  }, [editBooking, open, serviceOptions]);

  useEffect(() => {
    const fetchCalendarStatus = async () => {
      setCheckingCalendar(true);
      try {
        const res = await fetch("/api/calendar-status");
        const json = await res.json();
        setCalendarStatus(json);
      } catch (err) {
        setCalendarStatus({ ok: false, error: err.message || "Failed to check calendar" });
      } finally {
        setCheckingCalendar(false);
      }
    };

    if (open) {
      fetchCalendarStatus();
    } else {
      setCalendarStatus(null);
      setDismissCalendarWarning(false);
    }
  }, [open]);

  if (!open) return null;

  const calculatePrice = (serviceTitle, addOns, carTypeLabel) => {
    const service = serviceOptions.find((s) => s.title === serviceTitle);
    if (!service) return 0;

    let base = service.basePrice || 0;
    const carType = carTypeOptions.find((c) => c.label === carTypeLabel);
    if (carType) base += carType.price;

    if (!service.hasAddOns || !Array.isArray(addOns) || addOns.length === 0) {
      return base;
    }

    const validNames = (service.addOns || []).map((addon) => addon.name);
    const validAddOns = addOns.filter((addon) => validNames.includes(addon.label));
    const addOnTotal = validAddOns.reduce((sum, addon) => {
      const svcAddon = service.addOns.find((a) => a.name === addon.label);
      return sum + (svcAddon ? svcAddon.price : 0);
    }, 0);

    return base + addOnTotal;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitStatus(null);
    setSubmitMsg("");

    const cars = Array.isArray(newBooking.cars) && newBooking.cars.length
      ? newBooking.cars
      : [
          {
            name: newBooking.carName || "N/A",
            type: carTypeOptions[0].label,
            service: serviceOptions[0]?.title || "",
            addOns: [],
          },
        ];

    const perCarTotals = cars.map((car) =>
      calculatePrice(car.service || serviceOptions[0]?.title || "", car.addOns || [], car.type)
    );
    const baseSum = perCarTotals.reduce((sum, value) => sum + value, 0);
    const travel = Number(newBooking.travelExpense || 0);
    const discount = Number(newBooking.discount || 0);
    const computedAmount = overrideAmount
      ? Number(newBooking.amount || 0)
      : baseSum + travel - discount;

    const payload = {
      ...newBooking,
      name: newBooking.name.trim() || "N/A",
      cars,
      phone: newBooking.phone.trim() || "N/A",
      email: newBooking.email.trim() || "N/A",
      location: newBooking.location.trim() || "N/A",
      date: newBooking.date || "N/A",
      time: newBooking.time || "N/A",
      amount: computedAmount,
      baseSum,
      discount,
      travelExpense: travel,
      perCarTotals,
    };

    try {
      if (editBooking && onEdit) {
        await onEdit(payload);
        setSubmitStatus("success");
        setSubmitMsg("Booking updated!");
      } else {
        const bookingPayload = {
          source: "admin",
          status: newBooking.status || "pending",
          service: {
            title:
              (Array.isArray(newBooking.cars) && newBooking.cars[0]?.service) ||
              serviceOptions[0]?.title ||
              "N/A",
          },
          vehicle: {
            name:
              (Array.isArray(newBooking.cars) && newBooking.cars[0]?.name) ||
              newBooking.carName ||
              "N/A",
            type:
              (Array.isArray(newBooking.cars) && newBooking.cars[0]?.type) ||
              carTypeOptions[0].label,
            service:
              (Array.isArray(newBooking.cars) && newBooking.cars[0]?.service) ||
              serviceOptions[0]?.title ||
              "N/A",
          },
          vehicles: Array.isArray(newBooking.cars)
            ? newBooking.cars.map((car, index) => ({
                name: car.name || `Vehicle ${index + 1}`,
                type: car.type || "",
                service: car.service || "",
                addOns: Array.isArray(car.addOns) ? car.addOns : [],
                lineTotal:
                  perCarTotals && typeof perCarTotals[index] === "number"
                    ? perCarTotals[index]
                    : undefined,
              }))
            : undefined,
          perCarTotals,
          baseSum,
          travelExpense: travel,
          discount,
          dateTime: {
            date: newBooking.date || "N/A",
            time: newBooking.time || "N/A",
          },
          location: {
            address: newBooking.location || "N/A",
          },
          userInfo: {
            name: newBooking.name || "N/A",
            email: newBooking.email || "N/A",
            phone: newBooking.phone || "N/A",
          },
        };

        const resp = await fetch("/api/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bookingPayload),
        });
        const data = await resp.json();

        if (!resp.ok) {
          throw new Error(data?.message || data?.error || "Failed to create booking");
        }

        setSubmitStatus("success");
        let successMsg = "Booking created. Emails sent (if email provided).";
        if (data?.calendarWarning) successMsg += ` ${data.calendarWarning}`;
        setSubmitMsg(successMsg);

        onAdd?.(payload);
      }

      setOverrideAmount(false);
      setNewBooking({
        name: "",
        cars: [
          {
            name: "",
            type: carTypeOptions[0].label,
            service: serviceOptions[0]?.title || "",
            addOns: [],
          },
        ],
        date: "",
        time: "",
        amount: serviceOptions[0]?.basePrice || 0,
        status: "pending",
        phone: "",
        email: "",
        location: "",
        discount: 0,
        travelExpense: 0,
      });
    } catch (err) {
      setSubmitStatus("error");
      setSubmitMsg(err.message || "Failed to save booking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentCars = Array.isArray(newBooking.cars) ? newBooking.cars : [];
  const computedPerCarTotals = currentCars.map((car) =>
    calculatePrice(car.service || serviceOptions[0]?.title || "", car.addOns || [], car.type)
  );
  const computedBaseSum = computedPerCarTotals.reduce((sum, value) => sum + value, 0);
  const computedTravel = Number(newBooking.travelExpense || 0);
  const computedDiscount = Number(newBooking.discount || 0);
  const computedEstimate = overrideAmount
    ? Number(newBooking.amount || 0)
    : computedBaseSum + computedTravel - computedDiscount;

  return (
    <div className="fixed inset-0 z-[120] flex flex-col justify-end sm:justify-center">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <div className="relative z-[1] mx-auto w-full max-w-4xl px-0 pb-0 sm:px-6 sm:pb-0">
        <div className="relative flex max-h-[92vh] flex-col overflow-hidden rounded-t-3xl border border-slate-800/80 bg-slate-900/95 shadow-2xl sm:rounded-3xl">
          <div className="absolute inset-x-0 top-0 flex justify-center pt-3 sm:hidden">
            <div className="h-1.5 w-12 rounded-full bg-slate-600/60" />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/70 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            aria-label="Close"
          >
            ×
          </button>

          <header className="space-y-4 px-5 pt-8 sm:px-8 sm:pt-10">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500/90">Booking admin</p>
              <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                {editBooking ? "Update booking" : "Add new booking"}
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400/70">Vehicles</p>
                <p className="mt-2 text-2xl font-semibold text-white">{currentCars.length}</p>
                <p className="text-xs text-slate-500/90">Configured</p>
              </div>
              <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400/70">Base subtotal</p>
                <p className="mt-2 text-2xl font-semibold text-white">${computedBaseSum.toFixed(2)}</p>
                <p className="text-xs text-slate-500/90">Before travel & discount</p>
              </div>
              <div className="rounded-3xl border border-slate-800/80 bg-slate-950/60 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-400/70">Estimated total</p>
                <p className="mt-2 text-2xl font-semibold text-sky-400">${computedEstimate.toFixed(2)}</p>
                <p className="text-xs text-slate-500/90">Includes adjustments</p>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto px-5 pb-32 pt-6 sm:px-8 sm:pb-40">
            {checkingCalendar && (
              <div className="mb-3 rounded-2xl border border-slate-700/60 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                Checking Google Calendar integration...
              </div>
            )}
            {calendarStatus && !calendarStatus.ok && !dismissCalendarWarning && (
              <div className="mb-4 rounded-3xl border border-amber-500/40 bg-amber-500/10 p-4 text-amber-100">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">
                      Calendar integration issue
                    </p>
                    <p className="mt-2 text-sm text-amber-100/90">
                      {calendarStatus.message ||
                        calendarStatus.error ||
                        "Google Calendar appears to be misconfigured. Bookings will still be created but events may not be added."}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-amber-300/40 px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-100 transition hover:bg-amber-400/20"
                      onClick={async () => {
                        setDismissCalendarWarning(false);
                        setCheckingCalendar(true);
                        try {
                          const res = await fetch("/api/calendar-status");
                          const json = await res.json();
                          setCalendarStatus(json);
                        } catch (err) {
                          setCalendarStatus({ ok: false, error: err.message || "Failed to check calendar" });
                        } finally {
                          setCheckingCalendar(false);
                        }
                      }}
                    >
                      Retry
                    </button>
                    <button
                      type="button"
                      className="rounded-full px-4 py-2 text-sm font-semibold uppercase tracking-[0.2em] text-amber-200/80 transition hover:text-amber-100"
                      onClick={() => setDismissCalendarWarning(true)}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            )}
            {submitStatus && (
              <div
                className={`mb-4 rounded-3xl border px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em] ${
                  submitStatus === "success"
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-200"
                }`}
              >
                {submitMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs uppercase tracking-wide text-slate-300/80">Customer name</label>
                <input
                  type="text"
                  placeholder="Name"
                  value={newBooking.name}
                  onChange={(e) => setNewBooking({ ...newBooking, name: e.target.value })}
                  className={baseFieldClass}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300/80">Vehicles</p>
                  <span className="rounded-full bg-slate-800/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300/70">
                    Per-vehicle pricing
                  </span>
                </div>

                <div className="space-y-4">
                  {currentCars.map((car, idx) => {
                    const service = serviceOptions.find((s) => s.title === (car.service || ""));
                    const availableAddOns = service?.addOns?.map((addon) => ({
                      label: addon.name,
                      price: addon.price,
                    })) || [];
                    const lineTotal = computedPerCarTotals[idx] || 0;

                    return (
                      <div
                        key={idx}
                        className="rounded-3xl border border-slate-800/70 bg-slate-950/60 p-5 shadow-[0_18px_32px_-24px_rgba(15,23,42,0.8)]"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-300/90">
                              Vehicle {idx + 1}
                            </p>
                            <p className="text-xs text-slate-400/80">Customize type, service, and add-ons</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-sky-300">
                              ${lineTotal.toFixed(2)}
                            </span>
                            {currentCars.length > 1 && (
                              <button
                                type="button"
                                className="rounded-full border border-rose-500/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-rose-200 transition hover:bg-rose-500/15"
                                onClick={() =>
                                  setNewBooking((prev) => {
                                    const copy = { ...prev };
                                    copy.cars = copy.cars.filter((_, carIndex) => carIndex !== idx);
                                    if (!overrideAmount) {
                                      const perCarTotals = (copy.cars || []).map((c) =>
                                        calculatePrice(c.service || "", c.addOns || [], c.type)
                                      );
                                      const base = perCarTotals.reduce((sum, value) => sum + value, 0);
                                      copy.amount =
                                        base + Number(copy.travelExpense || 0) - Number(copy.discount || 0);
                                    }
                                    return copy;
                                  })
                                }
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="mt-4 space-y-3">
                          <input
                            type="text"
                            placeholder="Vehicle name (e.g., Toyota Sienna)"
                            value={car.name}
                            onChange={(e) =>
                              setNewBooking((prev) => {
                                const copy = { ...prev };
                                copy.cars = copy.cars.map((c, carIndex) =>
                                  carIndex === idx ? { ...c, name: e.target.value } : c
                                );
                                return copy;
                              })
                            }
                            className={baseFieldClass}
                          />

                          <select
                            value={car.type}
                            onChange={(e) =>
                              setNewBooking((prev) => {
                                const copy = { ...prev };
                                copy.cars = copy.cars.map((c, carIndex) =>
                                  carIndex === idx ? { ...c, type: e.target.value } : c
                                );
                                if (!overrideAmount) {
                                  const perCarTotals = (copy.cars || []).map((c) =>
                                    calculatePrice(c.service || "", c.addOns || [], c.type)
                                  );
                                  const base = perCarTotals.reduce((sum, value) => sum + value, 0);
                                  copy.amount =
                                    base + Number(copy.travelExpense || 0) - Number(copy.discount || 0);
                                }
                                return copy;
                              })
                            }
                            className={`${baseFieldClass} cursor-pointer`}
                          >
                            {carTypeOptions.map((type) => (
                              <option key={type.label} value={type.label}>
                                {type.label}
                              </option>
                            ))}
                          </select>

                          <select
                            value={car.service || ""}
                            onChange={(e) =>
                              setNewBooking((prev) => {
                                const copy = { ...prev };
                                copy.cars = copy.cars.map((c, carIndex) =>
                                  carIndex === idx
                                    ? { ...c, service: e.target.value, addOns: [] }
                                    : c
                                );
                                if (!overrideAmount) {
                                  const perCarTotals = (copy.cars || []).map((c) =>
                                    calculatePrice(c.service || "", c.addOns || [], c.type)
                                  );
                                  const base = perCarTotals.reduce((sum, value) => sum + value, 0);
                                  copy.amount =
                                    base + Number(copy.travelExpense || 0) - Number(copy.discount || 0);
                                }
                                return copy;
                              })
                            }
                            disabled={servicesLoading || serviceOptions.length === 0}
                            className={`${baseFieldClass} cursor-pointer disabled:opacity-50`}
                          >
                            {servicesLoading && <option>Loading services...</option>}
                            {!servicesLoading && serviceOptions.length === 0 && <option>No services found</option>}
                            {!servicesLoading && serviceOptions.length > 0 && (
                              <>
                                <option value="">Select service</option>
                                {serviceOptions.map((serviceOption) => (
                                  <option key={serviceOption.title} value={serviceOption.title}>
                                    {serviceOption.title}
                                  </option>
                                ))}
                              </>
                            )}
                          </select>

                          {availableAddOns.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {availableAddOns.map((addon) => {
                                const isSelected = (car.addOns || []).some(
                                  (selected) => selected.label === addon.label
                                );
                                return (
                                  <button
                                    key={addon.label}
                                    type="button"
                                    onClick={() =>
                                      setNewBooking((prev) => {
                                        const copy = { ...prev };
                                        copy.cars = copy.cars.map((c, carIndex) => {
                                          if (carIndex !== idx) return c;
                                          const exists = (c.addOns || []).find(
                                            (selected) => selected.label === addon.label
                                          );
                                          const nextAddOns = exists
                                            ? (c.addOns || []).filter((selected) => selected.label !== addon.label)
                                            : [...(c.addOns || []), addon];
                                          return { ...c, addOns: nextAddOns };
                                        });
                                        if (!overrideAmount) {
                                          const perCarTotals = (copy.cars || []).map((c) =>
                                            calculatePrice(c.service || "", c.addOns || [], c.type)
                                          );
                                          const base = perCarTotals.reduce((sum, value) => sum + value, 0);
                                          copy.amount =
                                            base + Number(copy.travelExpense || 0) - Number(copy.discount || 0);
                                        }
                                        return copy;
                                      })
                                    }
                                    className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                                      isSelected
                                        ? "border-sky-500 bg-sky-500/80 text-slate-950"
                                        : "border-slate-700/70 bg-slate-950/60 text-slate-200 hover:border-sky-500/60 hover:text-sky-200"
                                    }`}
                                  >
                                    {addon.label}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  <button
                    type="button"
                    onClick={() =>
                      setNewBooking((prev) => {
                        const nextService = serviceOptions[0]?.title || "";
                        const copy = { ...prev };
                        copy.cars = [
                          ...(copy.cars || []),
                          { name: "", type: carTypeOptions[0].label, service: nextService, addOns: [] },
                        ];
                        if (!overrideAmount) {
                          const perCarTotals = (copy.cars || []).map((c) =>
                            calculatePrice(c.service || "", c.addOns || [], c.type)
                          );
                          const base = perCarTotals.reduce((sum, value) => sum + value, 0);
                          copy.amount =
                            base + Number(copy.travelExpense || 0) - Number(copy.discount || 0);
                        }
                        return copy;
                      })
                    }
                    className="w-full rounded-3xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm font-semibold uppercase tracking-[0.22em] text-sky-300 transition hover:bg-sky-500/20"
                  >
                    + Add another vehicle
                  </button>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-300/80">Date</label>
                  <input
                    type="date"
                    value={newBooking.date}
                    onChange={(e) => setNewBooking({ ...newBooking, date: e.target.value })}
                    className={baseFieldClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-wide text-slate-300/80">Time</label>
                  <input
                    type="time"
                    disabled={!newBooking.date}
                    value={newBooking.time}
                    onChange={(e) => setNewBooking({ ...newBooking, time: e.target.value })}
                    className={`${baseFieldClass} disabled:cursor-not-allowed disabled:opacity-40`}
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-3xl border border-slate-800/80 bg-slate-950/40 p-4 sm:p-5">
                <label className="flex items-center gap-3 text-sm text-white">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-sky-400 focus:ring-sky-400/40"
                    checked={overrideAmount}
                    onChange={(e) => setOverrideAmount(e.target.checked)}
                  />
                  Enter custom amount
                </label>
                <input
                  type="number"
                  placeholder="Amount"
                  value={newBooking.amount}
                  onChange={(e) => setNewBooking({ ...newBooking, amount: Number(e.target.value || 0) })}
                  className={`${baseFieldClass} ${
                    overrideAmount ? "border-sky-400 bg-slate-950/60" : "cursor-not-allowed opacity-60"
                  }`}
                  readOnly={!overrideAmount}
                  min={0}
                />
                {!overrideAmount && (
                  <p className="text-xs text-slate-400">
                    Amount auto-calculates from selected services, vehicle types, travel, and discounts.
                  </p>
                )}
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wide text-slate-300/80">Discount ($)</label>
                    <input
                      type="number"
                      min={0}
                      value={newBooking.discount}
                      onChange={(e) =>
                        setNewBooking((prev) => {
                          const updated = { ...prev, discount: Number(e.target.value || 0) };
                          if (!overrideAmount) {
                            const perCarTotals = (updated.cars || []).map((car) =>
                              calculatePrice(car.service || "", car.addOns || [], car.type)
                            );
                            const base = perCarTotals.reduce((sum, value) => sum + value, 0);
                            updated.amount =
                              base + Number(updated.travelExpense || 0) - Number(updated.discount || 0);
                          }
                          return updated;
                        })
                      }
                      className={baseFieldClass}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-wide text-slate-300/80">Travel expense ($)</label>
                    <input
                      type="number"
                      min={0}
                      value={newBooking.travelExpense}
                      onChange={(e) =>
                        setNewBooking((prev) => {
                          const updated = { ...prev, travelExpense: Number(e.target.value || 0) };
                          if (!overrideAmount) {
                            const perCarTotals = (updated.cars || []).map((car) =>
                              calculatePrice(car.service || "", car.addOns || [], car.type)
                            );
                            const base = perCarTotals.reduce((sum, value) => sum + value, 0);
                            updated.amount =
                              base + Number(updated.travelExpense || 0) - Number(updated.discount || 0);
                          }
                          return updated;
                        })
                      }
                      className={baseFieldClass}
                    />
                  </div>
                </div>
              </div>

              <input
                type="text"
                placeholder="Phone"
                value={newBooking.phone}
                onChange={(e) => {
                  const val = e.target.value.replace(/[^0-9]/g, "");
                  setNewBooking({ ...newBooking, phone: val });
                }}
                maxLength={10}
                className={baseFieldClass}
              />

              <input
                type="text"
                placeholder="Email"
                value={newBooking.email}
                onChange={(e) => setNewBooking({ ...newBooking, email: e.target.value })}
                className={baseFieldClass}
              />

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Location"
                  value={newBooking.location}
                  onChange={async (e) => {
                    const val = e.target.value;
                    setNewBooking({ ...newBooking, location: val });
                    if (typeof window !== "undefined" && val.length > 2) {
                      try {
                        const resp = await fetch(
                          `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
                            val
                          )}&key=YOUR_GOOGLE_API_KEY&types=(cities)`
                        );
                        const data = await resp.json();
                        setLocationSuggestions(data.predictions?.map((p) => p.description) || []);
                      } catch (err) {
                        // Ignore autocomplete errors; UI remains usable without them
                      }
                    } else {
                      setLocationSuggestions([]);
                    }
                  }}
                  className={baseFieldClass}
                  autoComplete="off"
                />
                {locationSuggestions.length > 0 && (
                  <div className="rounded-2xl border border-slate-800/80 bg-slate-950/90 text-sm text-slate-100 shadow-lg">
                    {locationSuggestions.map((suggestion, index) => (
                      <button
                        type="button"
                        key={index}
                        className="block w-full border-b border-slate-800/60 px-4 py-2 text-left transition hover:bg-slate-900/70 last:border-b-0"
                        onClick={() => {
                          setNewBooking((prev) => ({ ...prev, location: suggestion }));
                          setLocationSuggestions([]);
                        }}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <select
                value={newBooking.status}
                onChange={(e) => setNewBooking({ ...newBooking, status: e.target.value })}
                className={`${baseFieldClass} cursor-pointer`}
              >
                <option value="pending">Pending</option>
                <option value="complete">Complete</option>
              </select>

              <div className="sticky bottom-0 -mx-5 flex flex-col gap-3 bg-slate-900/95 px-5 pb-1 pt-4 sm:-mx-8 sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:pb-0 sm:pt-5">
                <div className="text-xs uppercase tracking-[0.18em] text-slate-400/80">Quick actions</div>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-[0_18px_28px_-18px_rgba(59,130,246,0.8)] transition hover:brightness-110 disabled:opacity-60 sm:min-w-[180px]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (editBooking ? "Saving..." : "Adding...") : editBooking ? "Save Changes" : "Add Booking"}
                  </button>
                  <button
                    type="button"
                    className="w-full rounded-2xl border border-slate-700/80 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-800 sm:min-w-[140px]"
                    onClick={onClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
