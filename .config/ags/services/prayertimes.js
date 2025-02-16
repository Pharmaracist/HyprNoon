const { Gio, GLib } = imports.gi;
import Service from 'resource:///com/github/Aylur/ags/service.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { exec, execAsync } = Utils;

class PrayerTimesService extends Service {
    static {
        Service.register(
            this,
            {
                'updated': [],
            },
            {
                'nextPrayerName': ['string', 'r'],
                'nextPrayerTime': ['string', 'r'],
                'hijriDate': ['string', 'r'],
                'isha': ['string', 'r'],
                'maghrib': ['string', 'r'],
                'asr': ['string', 'r'],
                'dhuhr': ['string', 'r'],
                'fajr': ['string', 'r'],
            },
        );
    }

    _data = {};
    _nextPrayerName = '';
    _nextPrayerTime = '';
    _hijriDate = '';
    _isha = '';
    _maghrib = '';
    _asr = '';
    _dhuhr = '';
    _fajr = '';

    get nextPrayerName() { return this._nextPrayerName; }
    get nextPrayerTime() { return this._nextPrayerTime; }
    get hijriDate() { return this._hijriDate; }
    get isha() { return this._isha; }
    get maghrib() { return this._maghrib; }
    get asr() { return this._asr; }
    get dhuhr() { return this._dhuhr; }
    get fajr() { return this._fajr; }

    refresh() {
        this.#fetchPrayerTimes();
    }

    #updateTimes(data) {
        if (!data || !data.data) return;

        this._data = data;
        const timings = data.data.timings;
        const date = data.data.date;

        // Update prayer times
        this._fajr = timings.Fajr;
        this._dhuhr = timings.Dhuhr;
        this._asr = timings.Asr;
        this._maghrib = timings.Maghrib;
        this._isha = timings.Isha;

        // Update Hijri date
        const hijri = date.hijri;
        this._hijriDate = `${hijri.day} ${hijri.month.en} ${hijri.year}`;

        // Calculate next prayer
        this.#calculateNextPrayer();

        this.emit('updated');
    }

    #calculateNextPrayer() {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

        const prayers = [
            { name: 'Fajr', time: this._fajr },
            { name: 'Dhuhr', time: this._dhuhr },
            { name: 'Asr', time: this._asr },
            { name: 'Maghrib', time: this._maghrib },
            { name: 'Isha', time: this._isha },
        ];

        let nextPrayer = prayers.find(prayer => prayer.time > currentTime);
        if (!nextPrayer) {
            nextPrayer = prayers[0]; // If no next prayer today, next is Fajr
        }

        this._nextPrayerName = nextPrayer.name;
        this._nextPrayerTime = nextPrayer.time;
    }

    #fetchPrayerTimes() {
        const currentDate = new Date();
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const year = currentDate.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;
        const city = userOptions.asyncGet().muslimStuff.city || Mekka ;
        execAsync([
            'curl',
            '-s',
            `https://api.aladhan.com/v1/timingsByCity/${formattedDate}?city=Sanaa&country=${city}`,
        ]).then(output => {
            try {
                const data = JSON.parse(output);
                this.#updateTimes(data);
            } catch (error) {
                console.error('Error parsing prayer times:', error);
            }
        }).catch(error => {
            console.error('Error fetching prayer times:', error);
        });
    }

    constructor() {
        super();
        this.#fetchPrayerTimes();
    }
}

// the singleton instance
const service = new PrayerTimesService();

// make it global for easy use
globalThis.prayerTimes = service;

// export to use in other modules
export default service;