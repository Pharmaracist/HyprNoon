import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

const BrightnessIndicator = () => {
    let updateTimeout = null;

    const getBrightness = () => {
        try {
            const output = Utils.exec('brightnessctl get');
            const max = Utils.exec('brightnessctl max');
            return Number(output) / Number(max);
        } catch {
            return 0.6;
        }
    };

    const getBrightnessIcon = value => {
        const percent = value * 100;
        if (percent >= 80)
            return 'brightness_7';
        if (percent >= 60)
            return 'brightness_6';
        if (percent >= 40)
            return 'brightness_5';
        if (percent >= 20)
            return 'brightness_4';
        if (percent >= 1)
            return 'brightness_3';
        return 'brightness_2';
    };

    const getBrightnessCSS = value => {
        const percent = value * 100;
        return `margin-bottom: ${Math.max(0.5, percent / 100)}rem;`;
    };

    const slider = Widget.Slider({
        class_name: 'indicator-brightness-slider',
        draw_value: false,
        orientation: 1,
        inverted: true,
        value: getBrightness(),
        on_change: ({ value }) => {
            Utils.execAsync(['brightnessctl', 'set', `${Math.round(value * 100)}%`])
                .catch(console.error);
        },
    });

    const iconLabel = Widget.Label({
        hpack: 'center',
        hexpand: true,
        vexpand: true,
        vpack: 'end',
        css: `margin-bottom: -0.5rem;`,
        class_name: 'brightness-indicator icon-material',
        label: getBrightnessIcon(getBrightness()),
    });

    const icon = Widget.Box({
        class_name: 'brightness-icon',
        hpack: 'center',
        hexpand: true,
        child: iconLabel,
    });

    const overlay = Widget.Overlay({
        child: slider,
        overlays: [icon],
        setup: self => self.set_overlay_pass_through(icon, true),
    });

    const indicator = Widget.Box({
        class_name: 'brightness-indicator',
        child: overlay,
    });

    const widget = Widget.Box({
        child: indicator,
        setup: self => self.hook(App, (_, windowName, visible) => {
            if (windowName === 'brightness-indicator' && !visible && updateTimeout) {
                clearTimeout(updateTimeout);
                updateTimeout = null;
            }
        }, 'window-toggled'),
    });

    const updateValue = value => {
        if (updateTimeout) {
            clearTimeout(updateTimeout);
        }
        
        updateTimeout = setTimeout(() => {
            slider.value = value;
            iconLabel.label = getBrightnessIcon(value);
            iconLabel.css = getBrightnessCSS(value);
            updateTimeout = null;
        }, 50);
    };

    // Update initial value
    updateValue(getBrightness());

    // Poll brightness every second to keep slider in sync
    Utils.interval(1000, () => {
        const brightness = getBrightness();
        updateValue(brightness);
        return true; // keep running
    });

    return {
        widget,
        updateValue,
    };
};

export default BrightnessIndicator;