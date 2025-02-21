import App from 'resource:///com/github/Aylur/ags/app.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Audio from 'resource:///com/github/Aylur/ags/service/audio.js';
import Brightness from '../../../services/brightness.js';
import Indicator from '../../../services/indicator.js';

// Volume constants
const VOLUME_STEP = 0.02;
const VOLUME_SMALL_STEP = 0.001;
const VOLUME_LARGE_STEP = 0.01;
const VOLUME_THRESHOLD = 0.05;

// Brightness constants
const BRIGHTNESS_STEP = 0.005;

export const VolumeControl = () => {
    const handleVolume = (direction) => {
        if (!Audio.speaker) return;
        const step = Audio.speaker.volume <= VOLUME_THRESHOLD
            ? VOLUME_SMALL_STEP
            : VOLUME_LARGE_STEP;
        Audio.speaker.volume += direction * step;
        Indicator.popup(1);
    };

    return Widget.EventBox({
        onScrollUp: () => handleVolume(1),
        onScrollDown: () => handleVolume(-1),
        hexpand: true,
        vexpand: true,
        child: Widget.Box({
            hexpand: true,
            vexpand: true,
            css: 'min-height: 9rem;'
        })
    });
};

export const BrightnessControl = () => {
    const handleBrightness = (direction) => {
        // Get the first monitor's brightness service
        const brightness = Brightness[0] || Brightness;
        const currentValue = brightness.screen_value;
        
        // Calculate new value with bounds checking
        const newValue = Math.min(1, Math.max(0, currentValue + direction * BRIGHTNESS_STEP));
        
        // Set the new value
        brightness.screen_value = newValue;
        
        Indicator.popup(1);
    };

    return Widget.EventBox({
        onScrollUp: () => handleBrightness(1),
        onScrollDown: () => handleBrightness(-1),
        hexpand: true,
        vexpand: true,
        child: Widget.Box({
            hexpand: true,
            vexpand: true,
            css: 'min-height: 9rem;'
        })
    });
};

export default [
    VolumeControl,
    BrightnessControl,
];
