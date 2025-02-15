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
                'cityChanged': ['string'],
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
                'city': ['string', 'rw'],
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
    _city = userOptions.asyncGet().sidebar?.prayerTimes?.city || 'Cairo';
    _latitude = null;
    _longitude = null;
    _timezone = null;
    _notificationTimeout = null;
    _soundsDir = GLib.build_filenamev([GLib.get_home_dir(), '.config', 'ags', 'assets', 'sounds']);
    _defaultAdhan = userOptions.asyncGet().sidebar.adhan.default || 'adhan_default.mp3';
    _fajrAdhan = userOptions.asyncGet().sidebar.adhan.fajr || 'adhan_fajr.mp3';
    _reminderSound = 'reminder.mp3';
    _currentAdhanPID = null;

    constructor() {
        super();
        this.#createSoundsDirectory();
        this.#createDefaultSounds();
        this.#fetchPrayerTimes();
        this.#startNotificationTimer();
    }

    #createSoundsDirectory() {
        const dir = Gio.File.new_for_path(this._soundsDir);
        if (!dir.query_exists(null)) {
            dir.make_directory_with_parents(null);
        }
    }

    #createDefaultSounds() {
        // Create default reminder sound if it doesn't exist
        const reminderPath = GLib.build_filenamev([this._soundsDir, this._reminderSound]);
        const reminderFile = Gio.File.new_for_path(reminderPath);
        if (!reminderFile.query_exists(null)) {
            // Use canberra-gtk-play for the default reminder sound
            // execAsync(['canberra-gtk-play', '--id=message-new-instant']).catch(console.error);
        }
    }

    stopAdhan() {
        if (this._currentAdhanPID) {
            try {
                execAsync(['pkill', '-P', this._currentAdhanPID.toString()]);
                execAsync(['kill', this._currentAdhanPID.toString()]);
                this._currentAdhanPID = null;
            } catch (error) {
                console.error('Error stopping adhan:', error);
            }
        }
    }

    #playSound(soundFile) {
        const soundPath = GLib.build_filenamev([this._soundsDir, soundFile]);
        const file = Gio.File.new_for_path(soundPath);
        
        if (file.query_exists(null)) {
            if (soundFile.endsWith('.mp3')) {
                execAsync(['mpg123', soundPath])
                    .catch(error => console.error('Error playing sound:', error));
            } else if (soundFile.endsWith('.wav')) {
                execAsync(['paplay', soundPath])
                    .catch(error => console.error('Error playing sound:', error));
            }
        } else {
            // Fallback to system sound
            execAsync(['canberra-gtk-play', '--id=message-new-instant'])
                .catch(console.error);
        }
    }

    #playAdhan(isFajr = false) {
        this.stopAdhan(); // Stop any currently playing adhan
        
        const adhanFile = isFajr ? this._fajrAdhan : this._defaultAdhan;
        if (adhanFile === 'none') return;

        const adhanPath = GLib.build_filenamev([this._soundsDir, adhanFile]);
        
        // Check if the adhan file exists
        const file = Gio.File.new_for_path(adhanPath);
        if (file.query_exists(null)) {
            // Determine file type and use appropriate player
            if (adhanFile.endsWith('.mp3')) {
                execAsync(['mpg123', adhanPath]).then(({ pid }) => {
                    this._currentAdhanPID = pid;
                }).catch(error => console.error('Error playing adhan:', error));
            } else if (adhanFile.endsWith('.wav')) {
                execAsync(['paplay', adhanPath]).then(({ pid }) => {
                    this._currentAdhanPID = pid;
                }).catch(error => console.error('Error playing adhan:', error));
            } else {
                console.log(`Unsupported audio format for file: ${adhanPath}`);
            }
        } else {
            console.log(`Adhan file not found: ${adhanPath}`);
        }
    }

    get nextPrayerName() { return this._nextPrayerName; }
    get nextPrayerTime() { return this._nextPrayerTime; }
    get hijriDate() { return this._hijriDate; }
    get isha() { return this._isha; }
    get maghrib() { return this._maghrib; }
    get asr() { return this._asr; }
    get dhuhr() { return this._dhuhr; }
    get fajr() { return this._fajr; }
    get city() { return this._city; }
    set city(value) {
        if (this._city === value) return;
        this._city = value;
        this.emit('cityChanged', value);
        this.#updateCoordinates();
    }

    refresh() {
        this.#fetchPrayerTimes();
    }

    #showReminderNotification() {
        execAsync([
            'notify-send',
            `Prayer Time Reminder - ${this._nextPrayerName}`,
            `${this._nextPrayerName} prayer will be in 15 minutes`,
            '--urgency=normal',
            '--app-name=AGS',
        ]);

        // Play reminder sound
        this.#playSound(this._reminderSound);
    }

    #showPrayerNotification() {
        // Create a temporary script to handle the action
        const scriptPath = '/tmp/stop_adhan.sh';
        Utils.writeFile(
            `#!/bin/bash
            ags -r "prayerTimes.stopAdhan()"`,
            scriptPath
        );
        execAsync(['chmod', '+x', scriptPath]);

        execAsync([
            'notify-send',
            `Prayer Time - ${this._nextPrayerName}`,
            `It's time for ${this._nextPrayerName} prayer`,
            '--urgency=critical',
            '--app-name=AGS',
            '--action=stop:Stop Adhan',
            `--default-action=bash ${scriptPath}`,
        ]);

        // Play the appropriate adhan
        this.#playAdhan(this._nextPrayerName === 'Fajr');
        
        // Schedule next notification after showing current one
        Utils.timeout(1000, () => {
            this.refresh();
        });
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

        // Calculate next prayer and set up notification
        this.#calculateNextPrayer();
        this.#scheduleNextPrayerNotification();

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

    #scheduleNextPrayerNotification() {
        // Clear any existing notification timeout
        if (this._notificationTimeout) {
            GLib.source_remove(this._notificationTimeout);
            this._notificationTimeout = null;
        }

        // Calculate time until next prayer
        const [hours, minutes] = this._nextPrayerTime.split(':').map(Number);
        const now = new Date();
        const prayerTime = new Date();
        prayerTime.setHours(hours, minutes, 0, 0);

        // Calculate reminder time (15 minutes before)
        const reminderTime = new Date(prayerTime);
        reminderTime.setMinutes(reminderTime.getMinutes() - 15);

        // If prayer time is earlier today, set it for tomorrow
        if (prayerTime < now) {
            prayerTime.setDate(prayerTime.getDate() + 1);
            reminderTime.setDate(reminderTime.getDate() + 1);
        }

        // Calculate milliseconds until reminder and prayer time
        const timeUntilReminder = reminderTime.getTime() - now.getTime();
        const timeUntilPrayer = prayerTime.getTime() - now.getTime();

        // Schedule reminder notification if it's in the future
        if (timeUntilReminder > 0) {
            this._notificationTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeUntilReminder, () => {
                this.#showReminderNotification();
                // Schedule the prayer time notification
                this._notificationTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 15 * 60 * 1000, () => {
                    this.#showPrayerNotification();
                    return GLib.SOURCE_REMOVE;
                });
                return GLib.SOURCE_REMOVE;
            });
        }
        // If reminder time has passed but prayer time hasn't
        else if (timeUntilPrayer > 0) {
            this._notificationTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, timeUntilPrayer, () => {
                this.#showPrayerNotification();
                return GLib.SOURCE_REMOVE;
            });
        }
    }

    async #updateCoordinates() {
        try {
            const response = await execAsync(['curl', '-s', `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(this._city)}&format=json`]);
            const data = JSON.parse(response);
            
            if (data && data[0]) {
                this._latitude = data[0].lat;
                this._longitude = data[0].lon;
                this.refresh();
            } else {
                console.error('City not found:', this._city);
            }
        } catch (error) {
        }
    }

    #fetchPrayerTimes() {
        if (!this._latitude || !this._longitude) {
            this.#updateCoordinates();
            return;
        }

        const currentDate = new Date();
        const day = currentDate.getDate().toString().padStart(2, '0');
        const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
        const year = currentDate.getFullYear();
        const formattedDate = `${day}-${month}-${year}`;

        // Using method 5 (Egyptian General Authority of Survey) for Egypt
        // and method 3 (Muslim World League) for other locations
        const method = this._city.toLowerCase() === 'Cairo' ? 5 : 3;
        
        // Get timezone offset in hours
        const tzOffset = -(new Date().getTimezoneOffset() / 60);

        execAsync(['curl', '-s', `http://api.aladhan.com/v1/timings/${formattedDate}?latitude=${this._latitude}&longitude=${this._longitude}&method=${method}&tune=0,0,0,0,0,0,0,0&timezonestring=Africa/Cairo`])
            .then(output => {
                const data = JSON.parse(output);
                this.#updateTimes(data);
            })
            .catch(error => {
                console.error('Error fetching prayer times:', error);
            });
    }

    #startNotificationTimer() {
        // Start timer to check for prayer times every hour
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 60 * 60 * 1000, () => {
            this.refresh();
            return GLib.SOURCE_CONTINUE;
        });
    }

    testNotifications() {
        // Clear any existing notifications
        if (this._notificationTimeout) {
            GLib.source_remove(this._notificationTimeout);
            this._notificationTimeout = null;
        }

        console.log('Testing prayer notifications...');
        
        // Show reminder in 5 seconds
        this._notificationTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
            console.log('Showing reminder notification...');
            this.#showReminderNotification();
            
            // Show prayer notification 5 seconds after reminder
            this._notificationTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 5000, () => {
                console.log('Showing prayer notification...');
                this.#showPrayerNotification();
                return GLib.SOURCE_REMOVE;
            });
            
            return GLib.SOURCE_REMOVE;
        });

        return 'Test notifications scheduled: Reminder in 5s, Prayer notification in 10s';
    }
}

// the singleton instance
const service = new PrayerTimesService();

// make it global for easy use
globalThis["prayerTimes"] = service;
export default service;
