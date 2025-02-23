// User Configuration
const USER_CONFIG = {
    // Visualization
    bars: 60,
    framerate: 144,
    sensitivity: 150,
    
    // Audio Processing
    mode: 'normal',
    channels: 'stereo',
    smoothing: 0.5,
    
    // Visual Options
    monstercat: 1.5,
    noise_reduction: 0.77,
    
    // Advanced Audio
    autosens: 1.0,
    overshoot: 50,
    integral: 57,
    
    // Frequency Ranges
    lower_cutoff_freq: 50,
    higher_cutoff_freq: 10000,
    
    // Bar Appearance
    barWidth: 3,
    spacing: 1,
    gravity: 0,
    
    // Colors and Style
    reverse: false,
    mirror: true,
    waves: false,
    
    // Performance
    sleep_timer: 1,
    framerate_divisor: 2,
    
    // Input Method
    method: 'pulse',
    source: 'auto',
    
    // Advanced Drawing
    continuous_rendering: false,
    bar_delimiter: 0,
    
    // Effects
    eq: [1,1,1,1,1,1,1,1],
    rms_calculation: true,
    peak_cut: 0.8,
};

import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import Service from 'resource:///com/github/Aylur/ags/service.js';
import GLib from 'gi://GLib';
import App from 'resource:///com/github/Aylur/ags/app.js';

class AudioVisualizerService extends Service {
    static {
        Service.register(this, {
            'output-changed': ['string'],
        });
    }

    #output = "▁".repeat(60);
    #proc = null;
    #config = {};
    #configFile = GLib.build_filenamev([App.configDir, 'modules/.configuration/user_options.default.json']);
    #fileMonitor = null;
    #destroyed = false;

    constructor() {
        super();
        
        this.#config = { ...USER_CONFIG };
        
        this.#loadConfig();
        this.#initCava();

        this.#fileMonitor = Utils.monitorFile(this.#configFile, () => {
            if (this.#destroyed) return;
            this.#loadConfig();
            this.#initCava();
        });
    }

    #loadConfig() {
        try {
            const content = Utils.readFile(this.#configFile);
            if (!content) return;
            
            const options = JSON.parse(content);
            if (options?.visualizer) {
                this.#config = { ...this.#config, ...options.visualizer };
            }
        } catch (error) {
            console.error('Failed to load cava config:', error);
        }
    }

    getConfig() {
        return { ...this.#config };
    }

    #initCava() {
        if (this.#destroyed) return;
        
        if (this.#proc) {
            this.#proc.force_exit();
            this.#proc = null;
        }

        const audioSource = this.#detectAudioSource();
        const configPath = '/tmp/cava.config';

        const config = `
[general]
bars = ${this.#config.bars}
framerate = ${this.#config.framerate}
sensitivity = ${this.#config.sensitivity}
mode = ${this.#config.mode}
smoothing = ${this.#config.smoothing}
barWidth = ${this.#config.barWidth}
spacing = ${this.#config.spacing}
autosens = ${this.#config.autosens}
overshoot = ${this.#config.overshoot}
integral = ${this.#config.integral}
lower_cutoff_freq = ${this.#config.lower_cutoff_freq}
higher_cutoff_freq = ${this.#config.higher_cutoff_freq}

[input]
method = ${this.#config.method}
source = ${this.#config.source}
sample_rate = 44100
sample_bits = 16
channels = 2
autoconnect = 2

[output]
method = raw
raw_target = /dev/stdout
data_format = ascii
channels = stereo
ascii_max_range = 7

[smoothing]
monstercat = ${this.#config.monstercat}
noise_reduction = ${this.#config.noise_reduction}
`;

        Utils.writeFile(config, configPath);

        try {
            this.#proc = Utils.subprocess(
                ['cava', '-p', configPath],
                output => {
                    if (this.#destroyed || !output?.trim()) return;

                    const values = output.trim().split('').map(char => char.charCodeAt(0) - 48);
                    const bars = values.slice(0, this.#config.bars)
                        .map(n => {
                            const scaledValue = Math.log1p(n) / Math.log1p(7);
                            const level = Math.min(Math.max(0, Math.floor(scaledValue * 8)));
                            return ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"][level];
                        })
                        .join('');

                    if (bars !== this.#output) {
                        this.#output = bars;
                        this.emit('output-changed', bars);
                    }
                },
                error => {
                    if (this.#destroyed) return;
                    console.error('Cava error:', error);
                    if (!this.#output) {
                        this.#output = "▁".repeat(this.#config.bars);
                        this.emit('output-changed', this.#output);
                    }
                }
            );
        } catch (error) {
            console.error('Failed to start cava:', error);
            this.#output = "▁".repeat(this.#config.bars);
            this.emit('output-changed', this.#output);
        }
    }

    #detectAudioSource() {
        try {
            const paOutput = Utils.exec('pactl info');
            const defaultSinkMatch = paOutput.match(/Default Sink: (.+)/);
            if (defaultSinkMatch) return `${defaultSinkMatch[1]}.monitor`;
        } catch (e) {
            console.error('Failed to detect default sink:', e);
        }
        return 'auto';
    }

    get output() {
        return this.#output;
    }

    destroy() {
        if (this.#destroyed) return;
        this.#destroyed = true;

        if (this.#proc) {
            this.#proc.force_exit();
            this.#proc = null;
        }

        if (this.#fileMonitor) {
            this.#fileMonitor.disconnect();
            this.#fileMonitor = null;
        }

        super.destroy();
    }

    start() {
        if (!this.#proc && !this.#destroyed) {
            this.#initCava();
        }
    }

    stop() {
        if (this.#proc) {
            this.#proc.force_exit();
            this.#proc = null;
            this.#output = "▁".repeat(this.#config.bars);
            this.emit('output-changed', this.#output);
        }
    }
}

const service = new AudioVisualizerService();
export default service;