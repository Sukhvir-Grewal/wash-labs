"use client";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

export default function Location({ location, onNext, onBack }) {
    const [query, setQuery] = useState(location?.address || "");
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selected, setSelected] = useState(
        location?.address
            ? { display_name: location.address, lat: location.lat, lon: location.lon }
            : null
    );

    // Performance and UX helpers
    const debounceRef = useRef();
    const controllerRef = useRef(null);
    const cacheRef = useRef(new Map());
    const [activeIndex, setActiveIndex] = useState(-1);
    const listRef = useRef(null);

    // Canadian province/territory mapping (normalized)
    const provinceMap = {
        "alberta": "AB",
        "british columbia": "BC",
        "manitoba": "MB",
        "new brunswick": "NB",
        "newfoundland and labrador": "NL",
        "newfoundland & labrador": "NL",
        "nova scotia": "NS",
        "ontario": "ON",
        "prince edward island": "PE",
        "quebec": "QC",
        "québec": "QC",
        "saskatchewan": "SK",
        "yukon": "YT",
        "northwest territories": "NT",
        "nunavut": "NU",
    };

    const normalize = (s = "") =>
        s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const getProvinceAbbr = (addr = {}) => {
        if (addr.state_code) return String(addr.state_code).toUpperCase();
        const cand =
            addr.state ||
            addr.province ||
            addr.region ||
            addr.state_district ||
            "";
        const key = normalize(cand);
        return provinceMap[key] || "";
    };

    // Format concise suggestion parts
    const formatSuggestion = (s) => {
        const primaryParts = [];
        const addr = s.address || {};
        // Primary: house number + road or named place
        const primary =
            (addr.house_number ? addr.house_number + " " : "") +
            (addr.road || addr.pedestrian || addr.cycleway || addr.footway || addr.path || s.name || "");
        if (primary.trim().length) primaryParts.push(primary.trim());

        // Secondary: city + province/territory short code (no postcode)
        const locality = addr.city || addr.town || addr.village || addr.suburb || addr.hamlet || addr.neighbourhood;
        const provinceCode = getProvinceAbbr(addr);
        const secondary = [locality, provinceCode].filter(Boolean).join(", ");

        return {
            primary: primaryParts.join(" ").trim() || (s.name || "").trim(),
            secondary,
        };
    };

    // Query Nominatim (fast: debounce + abort + cache)
    useEffect(() => {
        const q = (query || "").trim();
        if (q.length < 3) {
            setSuggestions([]);
            setActiveIndex(-1);
            return;
        }

        // serve from cache instantly
        const cached = cacheRef.current.get(q.toLowerCase());
        if (cached) {
            setSuggestions(cached);
        }

        setLoading(true);
        clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            try {
                // Abort previous request
                if (controllerRef.current) controllerRef.current.abort();
                controllerRef.current = new AbortController();

                const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&dedupe=1&limit=8&countrycodes=ca&q=${encodeURIComponent(
                    q
                )}`;

                const res = await fetch(url, {
                    headers: {
                        Accept: "application/json",
                        "Accept-Language": "en-CA",
                    },
                    signal: controllerRef.current.signal,
                });
                if (!res.ok) throw new Error("Lookup failed");
                const data = await res.json();

                const mapped = (Array.isArray(data) ? data : []).map((d) => ({
                    display_name: d.display_name,
                    lat: Number(d.lat),
                    lon: Number(d.lon),
                    address: d.address || {},
                    name: d.name || "",
                }));

                cacheRef.current.set(q.toLowerCase(), mapped);
                setSuggestions(mapped);
                setActiveIndex(mapped.length ? 0 : -1);
            } catch (e) {
                if (e?.name !== "AbortError") {
                    setSuggestions([]);
                    setActiveIndex(-1);
                }
            } finally {
                setLoading(false);
            }
        }, 150);

        return () => {
            clearTimeout(debounceRef.current);
            // do not abort here to let the latest request finish if in-flight
        };
    }, [query]);

    const handleSelect = (s) => {
        const view = formatSuggestion(s);
        setSelected({ ...s, label: [view.primary, view.secondary].filter(Boolean).join(", ") });
        setQuery([view.primary, view.secondary].filter(Boolean).join(", "));
        setSuggestions([]);
        setActiveIndex(-1);
    };

    const handleKeyDown = (e) => {
        if (!suggestions.length) return;
        if (e.key === "ArrowDown") {
            e.preventDefault();
            setActiveIndex((i) => (i + 1) % suggestions.length);
            scrollIntoView((activeIndex + 1) % suggestions.length);
        } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
            scrollIntoView((activeIndex - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === "Enter") {
            e.preventDefault();
            if (activeIndex >= 0) handleSelect(suggestions[activeIndex]);
        } else if (e.key === "Escape") {
            setSuggestions([]);
            setActiveIndex(-1);
        }
    };

    const scrollIntoView = (index) => {
        const node = listRef.current?.querySelector(`[data-idx="${index}"]`);
        if (node) node.scrollIntoView({ block: "nearest" });
    };

    const canProceed = !!selected?.display_name;

    return (
        <motion.div
            key="location-step"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
        >
            <div onBlur={() => setTimeout(() => setSuggestions([]), 120)}>
                <label htmlFor="service-address" className="block text-sm mb-1 text-gray-700">
                    Service Address
                </label>
                <div className="relative">
                    <input
                        id="service-address"
                        type="text"
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setSelected(null);
                        }}
                        onKeyDown={handleKeyDown}
                        placeholder="Start typing your address"
                        autoComplete="off"
                        className="w-full px-4 py-3 rounded-lg bg-white border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
                        required
                        aria-required="true"
                        aria-autocomplete="list"
                        aria-controls="address-suggestions"
                        role="combobox"
                        aria-expanded={suggestions.length > 0}
                    />
                    {loading && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-blue-600">
                            Searching…
                        </div>
                    )}
                    {suggestions.length > 0 && (
                        <ul
                            id="address-suggestions"
                            ref={listRef}
                            role="listbox"
                            className="absolute top-full left-0 mt-1 bg-white rounded-lg overflow-auto z-50 border border-blue-200 max-h-64 w-full shadow"
                        >
                            {suggestions.map((s, i) => {
                                const view = formatSuggestion(s);
                                return (
                                    <li
                                        key={`${s.display_name}-${i}`}
                                        data-idx={i}
                                        role="option"
                                        aria-selected={activeIndex === i}
                                        onMouseDown={() => handleSelect(s)}
                                        className={`px-4 py-2 cursor-pointer transition text-black text-left ${
                                            activeIndex === i ? "bg-blue-100 text-blue-700" : "hover:bg-blue-50"
                                        }`}
                                        title={s.display_name}
                                    >
                                        <div className="font-semibold truncate">{view.primary || s.name || "Address"}</div>
                                        {view.secondary ? (
                                            <div className="text-sm text-gray-600 truncate">{view.secondary}</div>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    We use your address to confirm availability and estimate travel time. Extra charges may apply if the address is far.
                </p>
            </div>

            <div className="flex justify-between gap-4">
                <button
                    type="button"
                    onClick={onBack}
                    className="py-3 px-6 rounded-lg bg-gray-200 hover:bg-gray-300 text-blue-700 font-semibold transition border border-blue-200"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={() =>
                        canProceed &&
                        onNext({
                            address: selected.label || selected.display_name,
                            lat: selected.lat,
                            lon: selected.lon,
                        })
                    }
                    disabled={!canProceed}
                    className={`py-3 px-6 rounded-lg font-semibold transition border 
                        ${
                            canProceed
                                ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                                : "bg-gray-200 cursor-not-allowed text-gray-400 border-blue-100"
                        }`}
                >
                    Next
                </button>
            </div>
        </motion.div>
    );
}
