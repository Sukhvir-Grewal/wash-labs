const DEFAULT_TIME_ZONE = 'America/Halifax';

// Compute the offset, in minutes, between UTC and the target time zone for the given date.
const getTimeZoneOffsetMinutes = (date, timeZone) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const map = {};
    for (const { type, value } of parts) {
        if (type !== 'literal') {
            map[type] = value;
        }
    }

    const asUtc = Date.UTC(
        Number(map.year),
        Number(map.month) - 1,
        Number(map.day),
        Number(map.hour),
        Number(map.minute),
        Number(map.second)
    );

    return (asUtc - date.getTime()) / 60000;
};

const parse24Hour = (time24h) => {
    if (!time24h) return null;
    const match = String(time24h).trim().match(/^(\d{2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
        return null;
    }
    return { hours, minutes };
};

export const normalizeTo24Hour = (value) => {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;

    if (/^\d{1,2}:\d{2}$/.test(raw)) {
        const [h, m] = raw.split(":");
        const hours = Number(h);
        const minutes = Number(m);
        if (Number.isInteger(hours) && Number.isInteger(minutes) && hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60) {
            return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
        }
    }

    const normalized = raw
        .toLowerCase()
        .replace(/\./g, "")
        .replace(/\s+/g, " ")
        .trim();
    const match = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
    if (!match) return null;

    let hours = Number(match[1]);
    const minutes = Number(match[2] ?? "0");
    const period = match[3];

    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes < 0 || minutes >= 60) {
        return null;
    }

    if (period) {
        if (hours < 1 || hours > 12) return null;
        if (period === "pm" && hours !== 12) hours += 12;
        if (period === "am" && hours === 12) hours = 0;
    } else if (hours < 0 || hours > 23) {
        return null;
    }

    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
};

export const zonedDateToUtc = (dateStr, time24h, timeZone = DEFAULT_TIME_ZONE) => {
    if (!dateStr) return null;
    const parts = String(dateStr).split('-');
    if (parts.length !== 3) return null;
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const day = Number(parts[2]);
    if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
        return null;
    }
    const timeParts = parse24Hour(time24h);
    if (!timeParts) return null;
    const base = new Date(Date.UTC(year, month - 1, day, timeParts.hours, timeParts.minutes, 0, 0));
    const offsetMinutes = getTimeZoneOffsetMinutes(base, timeZone);
    return new Date(base.getTime() - offsetMinutes * 60000);
};

export const getZonedDayBoundsUtc = (dateStr, timeZone = DEFAULT_TIME_ZONE) => {
    const start = zonedDateToUtc(dateStr, '00:00', timeZone);
    if (!start) return { start: null, end: null };
    const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
    return { start, end };
};

export const formatTimeInZone = (date, timeZone = DEFAULT_TIME_ZONE, options = {}) => {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
        return null;
    }
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        ...options,
    });
    const formatted = formatter.format(date);
    if (options && options.hour12 === false) return formatted;
    return formatted
        .replace(/\s?a\.m\./gi, ' AM')
        .replace(/\s?p\.m\./gi, ' PM');
};

export const SERVICE_TIME_ZONE = DEFAULT_TIME_ZONE;
export const SERVICE_TIME_ZONE_POINTER = SERVICE_TIME_ZONE;
