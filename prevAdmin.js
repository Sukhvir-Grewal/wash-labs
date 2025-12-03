import { useState, useEffect } from "react";

export default function AdminAddBooking({ open, onClose, onAdd, editBooking, onEdit }) {
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'success' | 'error'
  const [submitMsg, setSubmitMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState(false);
  const carTypeOptions = [
    { label: "Sedan", price: 0 },
    { label: "SUV", price: 20 },
    { label: "Truck", price: 40 },
  ];

  const [serviceOptions, setServiceOptions] = useState([]);
  const [addOnOptions, setAddOnOptions] = useState([]); // kept if needed elsewhere
  const [servicesLoading, setServicesLoading] = useState(false);

  // Load services when modal opens (or if list empty); track loading state
  useEffect(() => {
    async function loadServices() {
      setServicesLoading(true);
      try {
        const resp = await fetch('/api/services');
        const data = await resp.json();
        if (Array.isArray(data.services)) {
          const servicesData = data.services.map(s => ({
            title: s.title,
            basePrice: s.basePrice,
            hasAddOns: Array.isArray(s.addOns) && s.addOns.length > 0,
            addOns: s.addOns
          }));
          setServiceOptions(servicesData);
          // Collect all unique add-ons (may not be used now but preserved)
          const allAddOns = new Set();
          data.services.forEach(service => {
            if (Array.isArray(service.addOns)) {
              service.addOns.forEach(addon => {
                allAddOns.add(JSON.stringify({ label: addon.name, price: addon.price }));
              });
            }
          });
          setAddOnOptions(Array.from(allAddOns).map(str => JSON.parse(str)));
        } else {
          setServiceOptions([]);
        }
      } catch (err) {
        console.error('Failed to load services:', err);
        setServiceOptions([]);
      } finally {
        setServicesLoading(false);
      }
    }
    if (open && serviceOptions.length === 0 && !servicesLoading) {
      loadServices();
    }
  }, [open, serviceOptions.length, servicesLoading]);

  // Ensure first car gets a default service after services load (when adding new booking)
  useEffect(() => {
    if (open && !editBooking && serviceOptions.length > 0) {
      setNewBooking(prev => {
        // If first car already has a service keep it
        const cars = (prev.cars && prev.cars.length) ? prev.cars : [{ name: '', type: carTypeOptions[0].label, service: '', addOns: [] }];
        if (cars[0].service) return prev; // already set by user or earlier
        const updatedCars = cars.map((c,i)=> i===0 ? { ...c, service: serviceOptions[0].title } : c);
        // Recompute amount from per-car totals
        const perCarTotals = updatedCars.map(car => calculatePrice(car.service || '', car.addOns || [], car.type));
        const base = perCarTotals.reduce((s,v)=>s+v,0);
        return { ...prev, cars: updatedCars, amount: overrideAmount ? prev.amount : base + Number(prev.travelExpense||0) - Number(prev.discount||0) };
      });
    }
  }, [open, editBooking, serviceOptions, overrideAmount]);
  const [newBooking, setNewBooking] = useState({
    name: "",
    // support multiple cars
  cars: [{ name: "", type: carTypeOptions[0].label, service: "", addOns: [] }],
    date: "",
    time: "",
    amount: 0,
    status: "pending",
    phone: "",
    email: "",
    location: "",
    // per-car addOns live on each car object now
    discount: 0,
    travelExpense: 0,
  });

  // Prefill form in edit mode
  useEffect(() => {
    if (editBooking && open) {
      setNewBooking(prev => ({
        // Preserve incoming editBooking but ensure cars array exists
        ...editBooking,
        cars: Array.isArray(editBooking.cars) && editBooking.cars.length
          ? editBooking.cars.map(c => ({ ...c, service: c.service || '', addOns: Array.isArray(c.addOns) ? c.addOns : [] }))
          : [{ name: editBooking.carName || '', type: editBooking.carType || carTypeOptions[0].label, service: '', addOns: [] }],
        // compute amount from per-car totals when available
        amount: (Array.isArray(editBooking.cars) && editBooking.cars.length)
          ? (editBooking.perCarTotals ? editBooking.perCarTotals.reduce((s,v)=>s+v,0) : 0) + Number(editBooking.travelExpense || 0) - Number(editBooking.discount || 0)
          : editBooking.amount || 0,
      }));
    } else if (open && !editBooking) {
      setNewBooking({
        name: "",
        cars: [{ name: "", type: carTypeOptions[0].label, service: serviceOptions[0]?.title || '', addOns: [] }],
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
    }
  }, [editBooking, open]);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  // Calendar status for admin banner
  const [calendarStatus, setCalendarStatus] = useState(null); // null | { ok: true } | { ok: false, error }
  const [checkingCalendar, setCheckingCalendar] = useState(false);
  const [dismissCalendarWarning, setDismissCalendarWarning] = useState(false);
  // Reusable calendar check (used on open and when admin clicks Retry)
  const fetchCalendarStatus = async () => {
    setCheckingCalendar(true);
    try {
      const res = await fetch('/api/calendar-status');
      const json = await res.json();
      setCalendarStatus(json);
    } catch (err) {
      setCalendarStatus({ ok: false, error: err.message || 'Failed to check calendar' });
    } finally {
      setCheckingCalendar(false);
    }
  };

  // Fetch calendar status when modal opens
  useEffect(() => {
    if (open) fetchCalendarStatus();
    else setCalendarStatus(null);
  }, [open]);

  if (!open) return null;
  const calculatePrice = (serviceTitle, addOns, carTypeLabel) => {
    const service = serviceOptions.find(s => s.title === serviceTitle);
    if (!service) return 0;

    let base = service.basePrice || 0;
    
    // Add vehicle type price adjustment
    const carType = carTypeOptions.find(c => c.label === carTypeLabel);
    if (carType) base += carType.price;

    // Calculate add-ons total
    let addOnTotal = 0;
    if (service.hasAddOns && addOns.length) {
      // Get valid add-ons for this service
      const validAddOnNames = (service.addOns || []).map(a => a.name);
      const validAddOns = addOns.filter(a => validAddOnNames.includes(a.label));
      
      // Sum up add-on prices
      addOnTotal = validAddOns.reduce((sum, addon) => {
        const serviceAddon = service.addOns.find(a => a.name === addon.label);
        return sum + (serviceAddon ? serviceAddon.price : 0);
      }, 0);
    }

    return base + addOnTotal;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Respect overrideAmount: if enabled, use user-entered amount; else auto-calc
    // compute per-car totals
  const cars = Array.isArray(newBooking.cars) && newBooking.cars.length ? newBooking.cars : [{ name: newBooking.carName || 'N/A', type: carTypeOptions[0].label, service: serviceOptions[0]?.title || '' }];
  const perCarTotals = cars.map(c => calculatePrice(c.service || (serviceOptions[0]?.title || ''), Array.isArray(c.addOns) ? c.addOns : [], c.type));
    const baseSum = perCarTotals.reduce((s,v)=>s+v, 0);
    const travel = Number(newBooking.travelExpense || 0);
    const discount = Number(newBooking.discount || 0);
    const computedAmount = overrideAmount ? Number(newBooking.amount || 0) : (baseSum + travel - discount);
    // Fill empty fields with "N/A" before saving
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
    setSubmitStatus(null);
    setSubmitMsg("");
    try {
      if (editBooking && onEdit) {
        await onEdit(payload);
          setSubmitStatus("success");
          setSubmitMsg("Booking updated!");
          // Reset form state after successful edit; parent will close modal
          setOverrideAmount(false);
          setNewBooking({
            name: "",
            cars: [{ name: "", type: carTypeOptions[0].label, service: serviceOptions[0]?.title || '', addOns: [] }],
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
      } else {
        // Map admin form to public booking API shape so emails are sent automatically
        const bookingPayload = {
          source: 'admin',
          status: newBooking.status || 'pending',
          // Provide top-level service object for API validation
          service: {
            title: (Array.isArray(newBooking.cars) && newBooking.cars[0]?.service) || (serviceOptions[0]?.title || 'N/A')
          },
          // Provide both legacy single-vehicle fields and new vehicles array with per-car service/addOns
          vehicle: {
            name: (Array.isArray(newBooking.cars) && newBooking.cars[0]?.name) || newBooking.carName || 'N/A',
            type: (Array.isArray(newBooking.cars) && newBooking.cars[0]?.type) || carTypeOptions[0].label,
            service: (Array.isArray(newBooking.cars) && newBooking.cars[0]?.service) || (serviceOptions[0]?.title || 'N/A')
          },
          vehicles: Array.isArray(newBooking.cars) ? newBooking.cars.map((c, i) => ({
            name: c.name || `Vehicle ${i+1}`,
            type: c.type || '',
            service: c.service || '',
            addOns: Array.isArray(c.addOns) ? c.addOns : [],
            lineTotal: perCarTotals && typeof perCarTotals[i] === 'number' ? perCarTotals[i] : undefined
          })) : undefined,
          perCarTotals: perCarTotals || undefined,
          baseSum: baseSum || undefined,
          travelExpense: Number(newBooking.travelExpense || 0),
          discount: Number(newBooking.discount || 0),
          dateTime: {
            date: newBooking.date || 'N/A',
            time: newBooking.time || 'N/A',
          },
          location: {
            address: newBooking.location || 'N/A',
          },
          userInfo: {
            name: newBooking.name || 'N/A',
            email: newBooking.email || 'N/A',
            phone: newBooking.phone || 'N/A',
          },
        };

        const resp = await fetch('/api/booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(bookingPayload),
        });
        const data = await resp.json();
        if (resp.ok) {
          setSubmitStatus('success');
          let successMsg = 'Booking created. Emails sent (if email provided).';
          if (data?.calendarWarning) successMsg += ` ${data.calendarWarning}`;
          setSubmitMsg(successMsg);
          onAdd?.(payload);
          setOverrideAmount(false);
          setNewBooking({
            name: "",
            cars: [{ name: "", type: carTypeOptions[0].label, service: serviceOptions[0]?.title || '', addOns: [] }],
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
        } else {
          setSubmitStatus('error');
          setSubmitMsg(data?.message || data?.error || 'Failed to create booking');
        }
      }
    } catch (err) {
      setSubmitStatus("error");
      setSubmitMsg(err.message || "Failed to save booking");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div
  className="bg-white rounded-2xl shadow-xl w-full max-w-lg border border-blue-100 flex flex-col relative mx-4 sm:mx-0 overflow-hidden"
        style={{ maxHeight: '90vh', minHeight: '60vh' }}
      >
        {/* Close (X) button */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-blue-600 text-2xl font-bold z-10"
          style={{ background: 'none', border: 'none' }}
        >
          &times;
        </button>
        <h3 className="text-xl font-bold mb-4 text-center mt-6" style={{ color: '#888' }}>Add Booking</h3>
  <div className="overflow-y-auto overflow-x-hidden px-3 sm:px-4 pb-3" style={{ maxHeight: '70vh' }}>
            {/* Calendar integration banner */}
            {checkingCalendar && (
              <div className="mb-2 text-sm text-gray-600">Checking Google Calendar integration...</div>
            )}
            {calendarStatus && !calendarStatus.ok && !dismissCalendarWarning && (
              <div className="mb-3 p-3 rounded bg-yellow-50 border border-yellow-200 text-yellow-800">
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <div className="font-semibold">Calendar integration issue</div>
                    <div className="text-sm mt-1">{calendarStatus.message || calendarStatus.error || 'Google Calendar appears to be misconfigured. Bookings will still be created but events may not be added.'}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button type="button" onClick={() => fetchCalendarStatus()} className="px-3 py-1 rounded bg-yellow-100 text-yellow-800 text-sm">Retry</button>
                    <button type="button" onClick={() => setDismissCalendarWarning(true)} className="px-3 py-1 text-sm underline">Dismiss</button>
                  </div>
                </div>
              </div>
            )}
            {submitStatus && (
              <div className={`mb-2 text-center font-semibold ${submitStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>{submitMsg}</div>
            )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <input type="text" placeholder="Name" value={newBooking.name} onChange={e => setNewBooking({ ...newBooking, name: e.target.value })} className="w-full px-3 py-3 sm:px-4 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800" />
            {/* Cars - support multiple */}
            <div>
              <div className="text-base font-semibold text-gray-700 mb-2">Cars</div>
              <div className="space-y-2">
                {(newBooking.cars || []).map((c, idx) => {
                  const serviceForCar = c.service || '';
                  const lineTotal = calculatePrice(serviceForCar, c.addOns || [], c.type);
                  return (
                    <div key={idx} className="w-full p-3 border border-blue-50 rounded-lg mb-3">
                      <div className="flex justify-between items-start gap-2">
                        <div className="font-semibold">Car {idx + 1}</div>
                        <div className="flex gap-2">
                          <div className="text-sm font-medium px-2">${lineTotal.toFixed(2)}</div>
                          <button type="button" onClick={() => setNewBooking(nb => {
                            const copy = { ...nb };
                            copy.cars = copy.cars.filter((_, i) => i !== idx);
                            if (!overrideAmount) {
                              const perCarTotals = (copy.cars || []).map(car => calculatePrice(car.service || '', car.addOns || [], car.type));
                              const base = perCarTotals.reduce((s, v) => s + v, 0);
                              copy.amount = base + Number(copy.travelExpense || 0) - Number(copy.discount || 0);
                            }
                            return copy;
                          })} className="px-3 py-1 rounded-lg bg-red-100 text-red-700">Remove</button>
                        </div>
                      </div>

                      <div className="mt-3 space-y-2">
                        <input type="text" placeholder="Name (e.g., Toyota Camry)" value={c.name} onChange={e => setNewBooking(nb => {
                          const copy = { ...nb };
                          copy.cars = copy.cars.map((cc, i) => i === idx ? { ...cc, name: e.target.value } : cc);
                          return copy;
                        })} className="w-full px-3 py-2 rounded-lg border border-blue-200 text-gray-800" />

                        <select value={c.type} onChange={e => setNewBooking(nb => {
                          const copy = { ...nb };
                          copy.cars = copy.cars.map((cc, i) => i === idx ? { ...cc, type: e.target.value } : cc);
                          if (!overrideAmount) {
                            const perCarTotals = (copy.cars || []).map(car => calculatePrice(car.service || '', car.addOns || [], car.type));
                            const base = perCarTotals.reduce((s, v) => s + v, 0);
                            copy.amount = base + Number(copy.travelExpense || 0) - Number(copy.discount || 0);
                          }
                          return copy;
                        })} className="w-full px-3 py-2 rounded-lg border border-blue-200 text-gray-800">
                          {carTypeOptions.map(t => (<option key={t.label} value={t.label}>{t.label}</option>))}
                        </select>

                        {/* per-car service selector */}
                        <select value={c.service || ''} onChange={e => setNewBooking(nb => {
                          const copy = { ...nb };
                          copy.cars = copy.cars.map((cc, i) => i === idx ? { ...cc, service: e.target.value, addOns: [] } : cc);
                          // Recalculate amount
                          if (!overrideAmount) {
                            const perCarTotals = (copy.cars || []).map(car => calculatePrice(car.service || '', car.addOns || [], car.type));
                            const base = perCarTotals.reduce((s, v) => s + v, 0);
                            copy.amount = base + Number(copy.travelExpense || 0) - Number(copy.discount || 0);
                          }
                          return copy;
                        })} disabled={servicesLoading || serviceOptions.length===0} className="w-full px-3 py-2 rounded-lg border border-blue-200 text-gray-800">
                          {servicesLoading && <option>Loading services...</option>}
                          {!servicesLoading && serviceOptions.length === 0 && <option>No services found</option>}
                          {!servicesLoading && serviceOptions.length > 0 && <>
                            <option value="">Select service</option>
                            {serviceOptions.map(s => (<option key={s.title} value={s.title}>{s.title}</option>))}
                          </>}
                        </select>

                        {/* per-car add-ons for the selected service */}
                        <div className="flex flex-wrap gap-2">
                          {(() => {
                            const svc = serviceOptions.find(s => s.title === (c.service || ''));
                            const validAddOns = svc?.addOns?.map(a => ({ label: a.name, price: a.price })) || [];
                            return validAddOns.map(opt => (
                              <button key={opt.label} type="button" onClick={() => setNewBooking(nb => {
                                const copy = { ...nb };
                                copy.cars = copy.cars.map((cc, i) => {
                                  if (i !== idx) return cc;
                                  const exists = (cc.addOns || []).find(a => a.label === opt.label);
                                  const updated = exists ? (cc.addOns || []).filter(a => a.label !== opt.label) : [...(cc.addOns || []), opt];
                                  return { ...cc, addOns: updated };
                                });
                                if (!overrideAmount) {
                                  const perCarTotals = (copy.cars || []).map(car => calculatePrice(car.service || '', car.addOns || [], car.type));
                                  const base = perCarTotals.reduce((s, v) => s + v, 0);
                                  copy.amount = base + Number(copy.travelExpense || 0) - Number(copy.discount || 0);
                                }
                                return copy;
                              })} className={`px-3 py-1 rounded-full border text-sm ${ (c.addOns||[]).find(a=>a.label===opt.label) ? 'bg-blue-600 text-white' : 'bg-white text-blue-600' }`}>
                                {opt.label}
                              </button>
                            ));
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div>
                  <button type="button" onClick={() => setNewBooking(nb => {
                    const copy = { ...nb };
                    copy.cars = [...(copy.cars||[]), { name: '', type: carTypeOptions[0].label, service: serviceOptions[0]?.title || '', addOns: [] }];
                    if (!overrideAmount) {
                      const perCarTotals = (copy.cars || []).map(car => calculatePrice(car.service || '', car.addOns || [], car.type));
                      const base = perCarTotals.reduce((s, v) => s + v, 0);
                      copy.amount = base + Number(copy.travelExpense || 0) - Number(copy.discount || 0);
                    }
                    return copy;
                  })} className="px-4 py-2 rounded-lg bg-blue-50 text-blue-700">+ Add car</button>
                </div>
              </div>
            </div>
            {/* Per-car service & add-ons are rendered inside each car block above; global service/add-ons removed */}
            {/* Date */}
            <label className="block text-sm font-medium text-gray-600">Date</label>
            <input type="date" value={newBooking.date} onChange={e => setNewBooking({ ...newBooking, date: e.target.value })} className="w-full px-3 py-3 sm:px-4 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800" />
            {/* Time (enabled after selecting date) */}
            <label className="block text-sm font-medium text-gray-600">Time</label>
            <input
              type="time"
              disabled={!newBooking.date}
              value={newBooking.time}
              onChange={e => setNewBooking({ ...newBooking, time: e.target.value })}
              className="w-full px-3 py-3 sm:px-4 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 disabled:bg-gray-100"
            />
            {/* Amount override */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={overrideAmount} onChange={e => setOverrideAmount(e.target.checked)} />
                Enter custom amount
              </label>
              <input
                type="number"
                placeholder="Amount"
                value={newBooking.amount}
                onChange={e => setNewBooking({ ...newBooking, amount: Number(e.target.value || 0) })}
                className={`w-full px-3 py-3 sm:px-4 rounded-lg border ${overrideAmount ? 'border-blue-500 bg-white' : 'border-blue-200 bg-gray-100'} text-gray-800`}
                readOnly={!overrideAmount}
                min={0}
              />
              {!overrideAmount && (
                <div className="text-xs text-gray-500">Amount is auto-calculated from service, car types and add-ons per car.</div>
              )}
              {/* Discount & Travel Expense */}
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <div>
                      <label className="text-sm text-gray-700">Discount ($)</label>
                      <input type="number" min={0} value={newBooking.discount} onChange={e => setNewBooking(nb=>{
                        const updated = { ...nb, discount: Number(e.target.value||0) };
                        if (!overrideAmount) {
                          const perCarTotals = (updated.cars || []).map(car => calculatePrice(car.service || '', car.addOns || [], car.type));
                          const base = perCarTotals.reduce((s, v) => s + v, 0);
                          updated.amount = base + Number(updated.travelExpense || 0) - Number(updated.discount || 0);
                        }
                        return updated;
                      })} className="w-full px-3 py-2 rounded-lg border border-blue-200" style={{ color: '#000' }} />
                    </div>
                    <div>
                      <label className="text-sm text-gray-700">Travel expense ($)</label>
                      <input type="number" min={0} value={newBooking.travelExpense} onChange={e => setNewBooking(nb=>{
                        const updated = { ...nb, travelExpense: Number(e.target.value||0) };
                        if (!overrideAmount) {
                          const perCarTotals = (updated.cars || []).map(car => calculatePrice(car.service || '', car.addOns || [], car.type));
                          const base = perCarTotals.reduce((s, v) => s + v, 0);
                          updated.amount = base + Number(updated.travelExpense || 0) - Number(updated.discount || 0);
                        }
                        return updated;
                      })} className="w-full px-3 py-2 rounded-lg border border-blue-200" style={{ color: '#000' }} />
                    </div>
                  </div>
            </div>
            {/* Phone (numbers only) */}
            <input type="text" placeholder="Phone" value={newBooking.phone} onChange={e => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setNewBooking({ ...newBooking, phone: val });
            }} maxLength={10} className="w-full px-3 py-3 sm:px-4 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800" />
            {/* Email */}
            <input type="text" placeholder="Email" value={newBooking.email} onChange={e => setNewBooking({ ...newBooking, email: e.target.value })} className="w-full px-3 py-3 sm:px-4 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800" />
            {/* Location autocomplete (Google Places API) */}
            <input type="text" placeholder="Location" value={newBooking.location} onChange={async e => {
              const val = e.target.value;
              setNewBooking({ ...newBooking, location: val });
              if (typeof window !== 'undefined' && val.length > 2) {
                try {
                  const resp = await fetch(`https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(val)}&key=YOUR_GOOGLE_API_KEY&types=(cities)`);
                  const data = await resp.json();
                  setLocationSuggestions(data.predictions?.map(p => p.description) || []);
                } catch {}
              } else {
                setLocationSuggestions([]);
              }
            }} className="w-full px-3 py-3 sm:px-4 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800" autoComplete="off" />
            {/* Location suggestions dropdown */}
            {locationSuggestions.length > 0 && (
              <div className="bg-white border border-blue-200 rounded-lg shadow mt-1 w-full">
                {locationSuggestions.map((sug, i) => (
                  <div key={i} className="px-4 py-2 cursor-pointer hover:bg-blue-50" onClick={() => {
                    setNewBooking(nb => ({ ...nb, location: sug }));
                    setLocationSuggestions([]);
                  }}>{sug}</div>
                ))}
              </div>
            )}
            {/* Status dropdown */}
            <select value={newBooking.status} onChange={e => setNewBooking({ ...newBooking, status: e.target.value })} className="w-full px-3 py-3 sm:px-4 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800">
              <option value="pending">Pending</option>
              <option value="complete">Complete</option>
            </select>
            <div className="flex flex-col sm:flex-row gap-3 mt-4 pb-4">
              <button type="submit" className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold" disabled={isSubmitting}>
                {isSubmitting ? (editBooking ? 'Saving...' : 'Adding...') : (editBooking ? 'Edit' : 'Add')}
              </button>
              <button type="button" className="w-full py-3 rounded-lg bg-gray-200 hover:bg-gray-300 text-blue-700 font-semibold" onClick={onClose} disabled={isSubmitting}>Cancel</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
