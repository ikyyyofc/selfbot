class TimeHelper {
    constructor() {
        this.timezone = "Asia/Jakarta";
        this.locale = "id-ID";
    }

    now() {
        return Date.now();
    }

    getWIBDate(timestamp = Date.now()) {
        return new Date(timestamp).toLocaleString(this.locale, {
            timeZone: this.timezone
        });
    }

    getWIBDateOnly(timestamp = Date.now()) {
        return new Date(timestamp).toLocaleDateString(this.locale, {
            timeZone: this.timezone,
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    getWIBTimeOnly(timestamp = Date.now()) {
        return new Date(timestamp).toLocaleTimeString(this.locale, {
            timeZone: this.timezone,
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    getWIBDateTime(timestamp = Date.now()) {
        return new Date(timestamp).toLocaleString(this.locale, {
            timeZone: this.timezone,
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    getWIBHour(timestamp = Date.now()) {
        const dateStr = new Date(timestamp).toLocaleString(this.locale, {
            timeZone: this.timezone,
            hour: "numeric",
            hour12: false
        });
        return parseInt(dateStr);
    }

    startOfDayWIB(timestamp = Date.now()) {
        const date = new Date(timestamp);
        const wibStr = date.toLocaleString(this.locale, {
            timeZone: this.timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
        const [day, month, year] = wibStr.split("/");
        return new Date(`${year}-${month}-${day}T00:00:00+07:00`).getTime();
    }

    addDays(timestamp, days) {
        return timestamp + days * 24 * 60 * 60 * 1000;
    }

    addHours(timestamp, hours) {
        return timestamp + hours * 60 * 60 * 1000;
    }

    formatDuration(ms) {
        const days = Math.floor(ms / (1000 * 60 * 60 * 24));
        const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

        const parts = [];
        if (days > 0) parts.push(`${days} hari`);
        if (hours > 0) parts.push(`${hours} jam`);
        if (minutes > 0) parts.push(`${minutes} menit`);

        return parts.join(" ") || "0 menit";
    }

    getDaysLeft(expiryTimestamp) {
        const now = this.now();
        const timeLeft = expiryTimestamp - now;
        return Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
    }

    getNextResetTime(hour = 0) {
        const now = this.now();
        const currentDate = new Date(now);
        
        const wibStr = currentDate.toLocaleString(this.locale, {
            timeZone: this.timezone,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        });
        
        const [day, month, year] = wibStr.split("/");
        let nextReset = new Date(`${year}-${month}-${day}T${hour.toString().padStart(2, "0")}:00:00+07:00`).getTime();
        
        if (nextReset <= now) {
            nextReset = this.addDays(nextReset, 1);
        }
        
        return nextReset;
    }
}

export default new TimeHelper();