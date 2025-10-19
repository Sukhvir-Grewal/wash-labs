import { useState, useEffect } from "react";

export default function AdminAddBooking({ open, onClose, onAdd, editBooking, onEdit }) {
  const [submitStatus, setSubmitStatus] = useState(null); // null | 'success' | 'error'
  const [submitMsg, setSubmitMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [overrideAmount, setOverrideAmount] = useState(false);
  const serviceOptions = [
    { title: "Premium Exterior Wash", basePrice: 50, hasAddOns: true },
    { title: "Complete Interior Detail", basePrice: 110, hasAddOns: true },
    { title: "Ultimate Full Detail", basePrice: 150, hasAddOns: true },
  ];
  const addOnOptions = [
    { label: "Pet Hair Removal", price: 20 },
    { label: "Clay Bar", price: 20 },
    { label: "Iron Removal", price: 25 },
    { label: "Ceramic Sealant", price: 10 },
  ];
  const carTypeOptions = [
    { label: "Sedan", price: 0 },
    { label: "SUV", price: 10 },
    { label: "Truck", price: 20 },
  ];
  const [newBooking, setNewBooking] = useState({
    name: "",
    carName: "",
    service: serviceOptions[0].title,
    date: "",
    time: "",
    amount: serviceOptions[0].basePrice,
    status: "pending",
    phone: "",
    email: "",
    location: "",
    addOns: [],
    carType: carTypeOptions[0].label,
  });

  // Prefill form in edit mode
  useEffect(() => {
    if (editBooking && open) {
      setNewBooking({
        ...editBooking,
        amount: editBooking.amount || serviceOptions.find(s => s.title === editBooking.service)?.basePrice || serviceOptions[0].basePrice,
      });
    } else if (open && !editBooking) {
      setNewBooking({
        name: "",
        carName: "",
        service: serviceOptions[0].title,
        date: "",
        time: "",
        amount: serviceOptions[0].basePrice,
        status: "pending",
        phone: "",
        email: "",
        location: "",
        addOns: [],
        carType: carTypeOptions[0].label,
      });
    }
  }, [editBooking, open]);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  if (!open) return null;
  const calculatePrice = (serviceTitle, addOns, carTypeLabel) => {
    const service = serviceOptions.find(s => s.title === serviceTitle);
    let base = service ? service.basePrice : 0;
    if (serviceTitle === "Complete Interior Detail") {
      if (carTypeLabel === "SUV") base = 130;
      else if (carTypeLabel === "Truck") base = 140;
      else base = 110;
    } else {
      const carType = carTypeOptions.find(c => c.label === carTypeLabel);
      if (carType) base += carType.price;
    }

    let addOnTotal = 0;
    if (service && service.hasAddOns && addOns.length) {
      let filteredAddOns = [];
      if (serviceTitle === "Premium Exterior Wash") {
        filteredAddOns = addOns.filter(a => ["Clay Bar", "Iron Removal", "Ceramic Sealant"].includes(a.label));
      } else if (serviceTitle === "Complete Interior Detail") {
        filteredAddOns = addOns.filter(a => a.label === "Pet Hair Removal");
      } else if (serviceTitle === "Ultimate Full Detail") {
        filteredAddOns = addOns;
      }
      addOnTotal = filteredAddOns.reduce((sum, a) => sum + a.price, 0);
      const clay = filteredAddOns.find(a => a.label === "Clay Bar");
      const iron = filteredAddOns.find(a => a.label === "Iron Removal");
      if (clay && iron) addOnTotal -= 5;
    }

    return base + addOnTotal;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Respect overrideAmount: if enabled, use user-entered amount; else auto-calc
    const computedAmount = overrideAmount
      ? Number(newBooking.amount || 0)
      : calculatePrice(newBooking.service, newBooking.addOns, newBooking.carType);
    // Fill empty fields with "N/A" before saving
    const payload = {
      ...newBooking,
      name: newBooking.name.trim() || "N/A",
      carName: newBooking.carName.trim() || "N/A",
      phone: newBooking.phone.trim() || "N/A",
      email: newBooking.email.trim() || "N/A",
      location: newBooking.location.trim() || "N/A",
      date: newBooking.date || "N/A",
      time: newBooking.time || "N/A",
      amount: computedAmount,
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
          carName: "",
          service: serviceOptions[0].title,
          date: "",
          time: "",
          amount: serviceOptions[0].basePrice,
          status: "pending",
          phone: "",
          email: "",
          location: "",
          addOns: [],
          carType: carTypeOptions[0].label,
        });
      } else {
        // Map admin form to public booking API shape so emails are sent automatically
        const bookingPayload = {
          source: 'admin',
          status: newBooking.status || 'pending',
          service: {
            title: newBooking.service,
            totalPrice: computedAmount,
            addOns: Array.isArray(newBooking.addOns) ? newBooking.addOns : [],
          },
          vehicle: {
            name: newBooking.carName,
            type: newBooking.carType,
          },
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
          setSubmitMsg('Booking created. Emails sent (if email provided).');
          onAdd?.(payload);
          setOverrideAmount(false);
          setNewBooking({
            name: "",
            carName: "",
            service: serviceOptions[0].title,
            date: "",
            time: "",
            amount: serviceOptions[0].basePrice,
            status: "pending",
            phone: "",
            email: "",
            location: "",
            addOns: [],
            carType: carTypeOptions[0].label,
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
        className="bg-white rounded-2xl shadow-xl w-full max-w-md md:max-w-lg border border-blue-100 flex flex-col relative"
        style={{ maxHeight: '90vh', minHeight: '60vh', width: '100%', margin: '0 1rem' }}
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
        <div className="overflow-y-auto px-2 pb-2" style={{ maxHeight: '70vh' }}>
          {submitStatus && (
            <div className={`mb-2 text-center font-semibold ${submitStatus === 'success' ? 'text-green-600' : 'text-red-600'}`}>{submitMsg}</div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <input type="text" placeholder="Name" value={newBooking.name} onChange={e => setNewBooking({ ...newBooking, name: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800" />
            {/* Car Name */}
            <input type="text" placeholder="Car (e.g., Toyota Camry)" value={newBooking.carName} onChange={e => setNewBooking({ ...newBooking, carName: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800" />
            {/* Service dropdown */}
            <select required value={newBooking.service} onChange={e => {
              const selectedService = e.target.value;
              setNewBooking(nb => ({
                ...nb,
                service: selectedService,
                addOns: [],
                amount: overrideAmount ? nb.amount : calculatePrice(selectedService, [], nb.carType),
              }));
            }} className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800">
              {serviceOptions.map(s => (
                <option key={s.title} value={s.title}>{s.title}</option>
              ))}
            </select>
            {/* Car type dropdown */}
            <select required value={newBooking.carType} onChange={e => {
              const carType = e.target.value;
              setNewBooking(nb => ({
                ...nb,
                carType,
                amount: overrideAmount ? nb.amount : calculatePrice(nb.service, nb.addOns, carType),
              }));
            }} className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800">
              {carTypeOptions.map(c => (
                <option key={c.label} value={c.label}>{c.label}</option>
              ))}
            </select>
            {/* Add-ons */}
            <div>
              <div className="text-base font-semibold text-gray-700 mb-2 text-left">Add-Ons</div>
              <div className="flex flex-wrap gap-3 mb-2">
                {(() => {
                  let validAddOns = [];
                  if (newBooking.service === "Premium Exterior Wash") {
                    validAddOns = addOnOptions.filter(opt => ["Clay Bar", "Iron Removal", "Ceramic Sealant"].includes(opt.label));
                  } else if (newBooking.service === "Complete Interior Detail") {
                    validAddOns = addOnOptions.filter(opt => opt.label === "Pet Hair Removal");
                  } else if (newBooking.service === "Ultimate Full Detail") {
                    validAddOns = addOnOptions;
                  }
                  return validAddOns.map(opt => (
                    <button
                      key={opt.label}
                      type="button"
                      onClick={() => {
                        setNewBooking(nb => {
                          const exists = nb.addOns.find(a => a.label === opt.label);
                          const updated = exists
                            ? nb.addOns.filter(a => a.label !== opt.label)
                            : [...nb.addOns, opt];
                          return {
                            ...nb,
                            addOns: updated,
                            amount: overrideAmount ? nb.amount : calculatePrice(nb.service, updated, nb.carType),
                          };
                        });
                      }}
                      className={`px-5 py-2 rounded-full border font-medium transition-all ${newBooking.addOns.find(a => a.label === opt.label) ? "bg-blue-600 text-white border-blue-600 shadow" : "bg-white border-gray-300 text-blue-600 hover:bg-blue-50"}`}
                    >
                      {opt.label}
                    </button>
                  ));
                })()}
              </div>
              {/* Combo discount message */}
              {(() => {
                let validAddOns = [];
                if (newBooking.service === "Premium Exterior Wash") {
                  validAddOns = newBooking.addOns.filter(a => ["Clay Bar", "Iron Removal", "Ceramic Sealant"].includes(a.label));
                } else if (newBooking.service === "Complete Interior Detail") {
                  validAddOns = newBooking.addOns.filter(a => a.label === "Pet Hair Removal");
                } else if (newBooking.service === "Ultimate Full Detail") {
                  validAddOns = newBooking.addOns;
                }
                return validAddOns.find(a => a.label === "Clay Bar") && validAddOns.find(a => a.label === "Iron Removal") ? (
                  <div className="text-xs text-blue-600 mt-2 font-semibold">Combo discount applied (-$5)</div>
                ) : null;
              })()}
            </div>
            {/* Date */}
            <input type="date" value={newBooking.date} onChange={e => setNewBooking({ ...newBooking, date: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800" />
            {/* Time (enabled after selecting date) */}
            <input
              type="time"
              disabled={!newBooking.date}
              value={newBooking.time}
              onChange={e => setNewBooking({ ...newBooking, time: e.target.value })}
              className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800 disabled:bg-gray-100"
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
                className={`w-full px-4 py-3 rounded-lg border ${overrideAmount ? 'border-blue-500 bg-white' : 'border-blue-200 bg-gray-100'} text-gray-800`}
                readOnly={!overrideAmount}
                min={0}
              />
              {!overrideAmount && (
                <div className="text-xs text-gray-500">Amount is auto-calculated from service, car type and add-ons.</div>
              )}
            </div>
            {/* Phone (numbers only) */}
            <input type="text" placeholder="Phone" value={newBooking.phone} onChange={e => {
              const val = e.target.value.replace(/[^0-9]/g, "");
              setNewBooking({ ...newBooking, phone: val });
            }} maxLength={10} className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800" />
            {/* Email */}
            <input type="text" placeholder="Email" value={newBooking.email} onChange={e => setNewBooking({ ...newBooking, email: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800" />
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
            }} className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800" autoComplete="off" />
            {/* Location suggestions dropdown */}
            {locationSuggestions.length > 0 && (
              <div className="bg-white border border-blue-200 rounded-lg shadow mt-1">
                {locationSuggestions.map((sug, i) => (
                  <div key={i} className="px-4 py-2 cursor-pointer hover:bg-blue-50" onClick={() => {
                    setNewBooking(nb => ({ ...nb, location: sug }));
                    setLocationSuggestions([]);
                  }}>{sug}</div>
                ))}
              </div>
            )}
            {/* Status dropdown */}
            <select value={newBooking.status} onChange={e => setNewBooking({ ...newBooking, status: e.target.value })} className="w-full px-4 py-3 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-800">
              <option value="pending">Pending</option>
              <option value="complete">Complete</option>
            </select>
            <div className="flex gap-4 mt-4 pb-4">
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
