import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import { languages } from "../../.commonwidgets/statusicons_languages.js";
import Hyprland from "resource:///com/github/Aylur/ags/service/hyprland.js";
const { GLib } = imports.gi;

const ANIMATION_DURATION = 200; // Default animation duration

/**
 * Creates a keyboard layout widget using Hyprland's keyboard layout information.
 */
const createKeyboardWidget = () => {
    // Get current keyboard layouts
    const deviceData = JSON.parse(Utils.exec("hyprctl -j devices"));
    const layouts = deviceData.keyboards
        .find(kb => kb.main)?.layout
        .split(",")
        .map(l => l.trim()) || ["us"];

    // Create stack for layout labels
    const layoutLabels = layouts.reduce((acc, layout) => {
        const lang = languages.find(l => l.layout === layout);
        const label = lang ? lang.layout.toUpperCase() : layout.toUpperCase();
        acc[layout] = Widget.Label({
            label,
            className: 'txt-small onSurfaceVariant',
            hpack: 'center',
            vpack: 'center',
            justify: 'center'
        });
        return acc;
    }, {
        "unknown": Widget.Label({
            label: "?",
            className: 'txt-small onSurfaceVariant',
            hpack: 'center',
            vpack: 'center',
            justify: 'center'
        })
    });

    const labelStack = Widget.Stack({
        transition: "slide_up_down",
        transitionDuration: ANIMATION_DURATION,
        vpack: 'center',
        children: layoutLabels,
        setup: self => self.hook(Hyprland, (stack, kbName, layoutName) => {
            try {
                const deviceData = JSON.parse(Utils.exec("hyprctl -j devices"));
                const mainKeyboard = deviceData.keyboards.find(kb => kb.main);
                const currentLayout = mainKeyboard?.active_keymap || "unknown";

                // Find the matching layout
                const layout = Object.keys(layoutLabels).find(l =>
                    currentLayout.toLowerCase().includes(l.toLowerCase())
                ) || "unknown";

                stack.shown = layout;
            } catch (error) {
                stack.shown = "unknown";
            }
        }, "keyboard-layout"),
    });

    // Create the final widget with constant icon
    return Widget.Box({
        vertical: true,
        vpack: 'center',
        hpack: 'center',
        homogeneous: false,
        children: [
            Widget.EventBox({
                onPrimaryClick: () => {
                    App.toggleWindow("osk0");
                },
                hpack: 'center',
                child: Widget.Label({
                    label: 'keyboard',
                    className: 'txt-norm onSurfaceVariant icon-material',
                })
            }),
            Widget.Box({ child: labelStack })
        ]
    });
};

export default () => Widget.Box({
    vpack: 'center',
    hpack: 'center',
    children: [createKeyboardWidget()],
});