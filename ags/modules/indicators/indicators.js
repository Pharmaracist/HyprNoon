import App from 'resource:///com/github/Aylur/ags/app.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import BrightnessIndicator from './brightness.js';
import VolumeIndicator from './volume.js';

// Create singleton instances
const brightnessIndicator = BrightnessIndicator();
const volumeIndicator = VolumeIndicator();

// Duration for indicators to stay visible (in milliseconds)
const INDICATOR_TIMEOUT = 3000;

const createHideTimeout = (window) => {
    return setTimeout(() => {
        window.visible = false;
    }, INDICATOR_TIMEOUT);
};

// Create windows for the indicators
const createIndicatorWindow = (name, child, anchor) => {
    let hideTimeout;

    const window = Widget.Window({
        name: `${name}-indicator`,
        class_name: 'indicator-window',
        layer: 'top',
        anchor: anchor,
        child: child,
        visible: false,
    });

    // Add show method
    window.show = () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
        }
        window.visible = true;
        hideTimeout = createHideTimeout(window);
    };

    return window;
};

// Create the windows with different positions
const brightnessWindow = createIndicatorWindow('brightness', brightnessIndicator.widget, ['right']);
const volumeWindow = createIndicatorWindow('volume', volumeIndicator.widget, ['left']);

// Export the indicators and their update functions
export const Indicators = {
    brightness: {
        window: brightnessWindow,
        update: (value) => {
            brightnessIndicator.updateValue(value);
            brightnessWindow.show();
        },
    },
    volume: {
        window: volumeWindow,
        update: (value) => {
            volumeIndicator.updateValue(value);
            volumeWindow.show();
        },
    },
};