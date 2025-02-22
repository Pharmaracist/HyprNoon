const { Gio, GLib } = imports.gi;
import Service from 'resource:///com/github/Aylur/ags/service.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import App from 'resource:///com/github/Aylur/ags/app.js';
const { exec, execAsync } = Utils;

class TimersService extends Service {
    static {
        Service.register(
            this,
            { 
                'updated': [],
                'active-changed': ['boolean'],
                'timer-tick': ['string', 'int'],
                'timer-complete': ['string'],
                'urgent-notification': ['string'],
            },
        );
    }

    _timers = {};
    _configPath = '';
    _notified = new Set();
    _activeTimer = null;

    constructor() {
        super();

        this._configPath = `${GLib.get_user_state_dir()}/ags/user/timers.json`;

        // Ensure directory exists
        Utils.exec(`mkdir -p ${GLib.get_user_state_dir()}/ags/user`);

        // Load saved timers
        try {
            const content = Utils.readFile(this._configPath);
            const savedTimers = JSON.parse(content);
            savedTimers.forEach(timer => {
                this._timers[timer.id] = {
                    ...timer,
                    running: false,
                    remaining: timer.duration,
                    interval: null,
                    notified: false,
                };
            });
        } catch {
            Utils.writeFile('[]', this._configPath);
        }
    }

    _save() {
        const timersArray = Object.values(this._timers).map(timer => ({
            id: timer.id,
            name: timer.name,
            duration: timer.duration,
        }));
        Utils.writeFile(JSON.stringify(timersArray, null, 2), this._configPath);
    }

    _notifyComplete(timer) {
        if (timer.notified) return;
        
        timer.notified = true;
        App.notify({
            summary: `Timer Complete: ${timer.name}`,
            body: 'Your timer has finished!',
            urgency: 'critical',
        });
        Utils.execAsync(['paplay', '/usr/share/sounds/freedesktop/stereo/complete.oga']);

    }

    get activeTimer() {
        if (!this._activeTimer) return null;
        return this._timers[this._activeTimer];
    }

    addTimer(name, duration) {
        const id = Math.random().toString(36).substring(2, 15);
        this._timers[id] = {
            id,
            name,
            duration,
            remaining: duration,
            running: false,
            interval: null,
            notified: false,
        };
        this._save();
        this.emit('updated');
        return id;
    }

    removeTimer(id) {
        if (this._timers[id]) {
            if (this._timers[id].interval) {
                clearInterval(this._timers[id].interval);
            }
            delete this._timers[id];
            this._save();
            this.emit('updated');
        }
    }

    startTimer(id) {
        const timer = this._timers[id];
        if (!timer || timer.running) return;

        // Stop any other running timer
        Object.values(this._timers).forEach(t => {
            if (t.running && t.id !== id) {
                this.stopTimer(t.id);
            }
        });

        timer.running = true;
        timer.notified = false;
        this._activeTimer = id;
        this.emit('active-changed', true);
        
        timer.interval = setInterval(() => {
            if (timer.remaining > 0) {
                timer.remaining--;
                this.emit('timer-tick', timer.name, timer.remaining);
                this.emit('updated');
            } else {
                clearInterval(timer.interval);
                timer.interval = null;
                this.ring();
                this.ring();
                this.emit('urgent-notification', timer.name);
                const repeatSound = setInterval(() => this.ring(), 1000);
                timer.running = false;
                this._activeTimer = null;
                this.emit('active-changed', false);
                this._notifyComplete(timer);
                this.emit('timer-complete', timer.name);
                this.emit('updated');
                clearInterval(repeatSound);
                clearInterval(timer.interval);
            }
        }, 1000);
        this.emit('updated');
    }

    stopTimer(id) {
        const timer = this._timers[id];
        if (!timer || !timer.running) return;

        if (timer.interval) {
            clearInterval(timer.interval);
        }
        timer.running = false;
        timer.interval = null;
        if (this._activeTimer === id) {
            this._activeTimer = null;
            this.emit('active-changed', false);
        }
        this.emit('updated');
    }

    resetTimer(id) {
        const timer = this._timers[id];
        if (!timer) return;

        this.stopTimer(id);
        timer.remaining = timer.duration;
        this.emit('updated');
    }

    getTimer(id) {
        return this._timers[id];
    }

    get timers() {
        return Object.values(this._timers);
    }
}

// the singleton instance
const service = new TimersService();

// make it global for easy use
globalThis.timers = service;

// export to use in other modules
export default service;
