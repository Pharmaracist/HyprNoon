// User Configuration
const USER_CONFIG = {
    // Visualization
    bars: 60,              // Number of bars to show
    framerate: 144,         // Framerate for the visualization
    sensitivity: 150,      // Audio sensitivity (higher = more responsive)
    
    // Audio Processing
    mode: 'normal',    // Frequency distribution mode (normal/scientific)
    channels: 'stereo',    // mono or stereo
    smoothing: 0.5,        // Smoothing factor for bar transitions (0-1)
    
    // Visual Options
    monstercat: 1.5,       // Monstercat smoothing factor (0-2)
    noise_reduction: 0.77, // Noise reduction amount (0-1)
    
    // Advanced Audio
    autosens: 1.0,        // Automatic sensitivity adjustment (0-1)
    overshoot: 50,        // Allow bars to overshoot (0-100)
    integral: 57,         // Integral value for smoothing (0-100)
    
    // Frequency Ranges
    lower_cutoff_freq: 50,     // Lower frequency cutoff
    higher_cutoff_freq: 10000, // Higher frequency cutoff
    
    // Bar Appearance
    barWidth: 3,          // Width of each bar in pixels
    spacing: 1,           // Spacing between bars in pixels
    gravity: 0.,           // Bar fall speed (1-10)
    
    // Colors and Style
    reverse: false,       // Reverse bar order
    mirror: true,         // Mirror the bars
    waves: false,         // Use wave style instead of bars
    
    // Performance
    sleep_timer: 1,       // Sleep timer in seconds (0 to disable)
    framerate_divisor: 2, // Divide framerate by this value when hidden
    
    // Input Method
    method: 'pulse',      // Input method (pulse/alsa/fifo/sndio)
    source: 'auto',       // Source device (auto/hw:0,0/etc)
    
    // Advanced Drawing
    continuous_rendering: false, // Render continuously even if no change
    bar_delimiter: 0,           // Delimiter between bars (0 for none)
    
    // Effects
    eq: [1,1,1,1,1,1,1,1], // Equalizer values for frequency bands
    rms_calculation: true,  // Use RMS value calculation
    peak_cut: 0.8,         // Peak cut amount (0-1)
};

import * as Utils from 'resource:///com/github/Aylur/ags/utils.js'
import Service from 'resource:///com/github/Aylur/ags/service.js';
import GLib from 'gi://GLib'
import App from 'resource:///com/github/Aylur/ags/app.js'

class AudioVisualizerService extends Service {
    static {
        Service.register(this, {
            'output-changed': ['string'],
        });
    }

    #output = "▁".repeat(60)
    #proc = null
    #config = {}
    #configFile = GLib.build_filenamev([App.configDir, 'modules/.configuration/user_options.default.json'])

    constructor() {
        super()
        
        // Set default config
        this.#config = {
            bars: USER_CONFIG.bars,
            framerate: USER_CONFIG.framerate,
            sensitivity: USER_CONFIG.sensitivity,
            mode: USER_CONFIG.mode,
            channels: USER_CONFIG.channels,
            smoothing: USER_CONFIG.smoothing,
            monstercat: USER_CONFIG.monstercat,
            noise_reduction: USER_CONFIG.noise_reduction,
            gravity: USER_CONFIG.gravity,
            barWidth: USER_CONFIG.barWidth,
            autosens: USER_CONFIG.autosens,
            overshoot: USER_CONFIG.overshoot,
            integral: USER_CONFIG.integral,
            lower_cutoff_freq: USER_CONFIG.lower_cutoff_freq,
            higher_cutoff_freq: USER_CONFIG.higher_cutoff_freq,
            spacing: USER_CONFIG.spacing,
            reverse: USER_CONFIG.reverse,
            mirror: USER_CONFIG.mirror,
            waves: USER_CONFIG.waves,
            sleep_timer: USER_CONFIG.sleep_timer,
            framerate_divisor: USER_CONFIG.framerate_divisor,
            method: USER_CONFIG.method,
            source: USER_CONFIG.source,
            continuous_rendering: USER_CONFIG.continuous_rendering,
            bar_delimiter: USER_CONFIG.bar_delimiter,
            eq: USER_CONFIG.eq,
            rms_calculation: USER_CONFIG.rms_calculation,
            peak_cut: USER_CONFIG.peak_cut,
        }
        
        this.#loadConfig()
        this.#initCava()

        // Watch for config file changes
        Utils.monitorFile(this.#configFile, () => {
            this.#loadConfig()
            this.#initCava()
        })
    }

    #loadConfig() {
        try {
            const content = Utils.readFile(this.#configFile)
            if (!content) return
            
            const options = JSON.parse(content)
            if (options?.visualizer) {
                this.#config = { ...this.#config, ...options.visualizer }
            }
        } catch (error) {
            console.error('Failed to load cava config:', error)
        }
    }

    getConfig() {
        return { ...this.#config }
    }

    #initCava() {
        if (this.#proc) {
            this.#proc.force_exit()
            this.#proc = null
        }

        // Determine the best audio source
        const audioSource = this.#detectAudioSource()

        // Create a temporary config file for cava
        const configPath = '/tmp/cava.config'

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

`
        Utils.writeFile(config, configPath)

        // Start cava with error handling
        try {
            this.#proc = Utils.subprocess([
                'cava',
                '-p', configPath
            ], output => {
                if (!output?.trim()) return

                // Clean the output and convert numbers to bars
                const values = output.trim().split('').map(char => char.charCodeAt(0) - 48)
                
                // Take only the number of bars we want
                const bars = values.slice(0, this.#config.bars)
                    .map(n => {
                        // Logarithmic scaling to prevent maximum height artifacts
                        const scaledValue = Math.log1p(n) / Math.log1p(7)
                        const level = Math.min(Math.max(0, Math.floor(scaledValue * 8)))
                        return ["▁", "▂", "▃", "▄", "▅", "▆", "▇", "█"][level]
                    })
                    .join('')

                if (bars !== this.#output) {
                    this.#output = bars
                    this.emit('output-changed', bars)
                }
            }, error => {
                console.error('Cava error:', error)
                if (!this.#output) {
                    this.#output = "▁".repeat(this.#config.bars)
                    this.emit('output-changed', this.#output)
                }
            })
        } catch (error) {
            console.error('Failed to start cava:', error)
            this.#output = "▁".repeat(this.#config.bars)
            this.emit('output-changed', this.#output)
        }
    }

    #detectAudioSource() {
        try {
            // Try to get default PulseAudio sink
            const paOutput = Utils.exec('pactl info')
            const defaultSinkMatch = paOutput.match(/Default Sink: (.+)/)
            if (defaultSinkMatch) {
                return defaultSinkMatch[1] + '.monitor'
            }
        } catch (e) {
            console.error('Failed to detect default sink:', e)
        }

        return 'auto'
    }

    get output() {
        return this.#output
    }

    destroy() {
        if (this.#proc) {
            this.#proc.force_exit()
            this.#proc = null
        }
        super.destroy()
    }

    start() {
        if (!this.#proc) {
            this.#initCava()
        }
    }

    stop() {
        if (this.#proc) {
            this.#proc.force_exit();
            this.#proc = null;
            this.#output = "▁".repeat(60);
            // Don't emit on stop, just update the output
        }
    }
}

const service = new AudioVisualizerService();
export default service;