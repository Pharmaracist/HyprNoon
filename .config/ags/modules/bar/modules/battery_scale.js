import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import Battery from "resource:///com/github/Aylur/ags/service/battery.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
const { Box, Label, Button, Overlay, Revealer, Scrollable, Stack, EventBox, ProgressBar } = Widget;
const { exec, execAsync } = Utils;
const { GLib } = imports.gi;

const BRIGHTNESS_STEP = 0.05;

const BatteryScale = () => {
    let isRevealed = false;
    let batteryHook = null;
    let percentageHook = null;

    const percentageLabel = Label({
        className: "txt-smallie sec-txt txt-semibold",
        truncate:"end",
        wrap:true,
        css: "margin-left: 8px;",
    });

    const percentageRevealer = Revealer({
        transitionDuration: userOptions.asyncGet().animations.durationLarge,
        transition: "slide_right",
        revealChild: false,
        child: percentageLabel,
    });

    const batteryIcon = MaterialIcon("battery_full", "small");
    const batteryProgress = ProgressBar({
        className: "battery-scale-bar",
        vpack: "center",
        tooltipText: "0%",
    });

    const handleScroll = (direction) => {
        execAsync(`brightnessctl set ${direction > 0 ? "10%+" : "10%-"}`);
    };

    const updateBatteryInfo = () => {
        const percent = Math.max(0, Math.min(100, Battery.percent));
        const isCharging = Battery.charging;
        const isLow = percent <= userOptions.asyncGet().battery.low;
        
        batteryIcon.toggleClassName("bar-batt-low", isLow);
        batteryIcon.toggleClassName("bar-batt-charging", isCharging);
        
        batteryProgress.fraction = Math.max(0, Math.min(1, percent / 100));
        batteryProgress.tooltipText = `${percent}%${isCharging ? " Charging" : ""}`;
        batteryProgress.toggleClassName("bar-batt-low", isLow);
        batteryProgress.toggleClassName("bar-batt-charging", isCharging);
        
        const chargingText = isCharging ? "  " : "";
        percentageLabel.label = `${percent} % ${chargingText} `;
    };

    const widget = Box({
        className: "battery-scale-container spacing-h-10",
        setup: (self) => {
            // Clean up previous hooks if they exist
            if (batteryHook) Battery.disconnect(batteryHook);
            if (percentageHook) Battery.disconnect(percentageHook);
            
            // Set up new hooks
            batteryHook = Battery.connect('changed', updateBatteryInfo);
            
            self.connect('destroy', () => {
                if (batteryHook) Battery.disconnect(batteryHook);
                if (percentageHook) Battery.disconnect(percentageHook);
            });
        },
        children: [
            EventBox({
                // onScrollUp: () => handleScroll(1),
                // onScrollDown: () => handleScroll(-1),
                onPrimaryClick: () => {
                    isRevealed = !isRevealed;
                    percentageRevealer.revealChild = isRevealed;
                },
                child: Box({
                    className: "battery-scale-box",
                    children: [
                        batteryProgress,
                    ],
                }),
            }),
            percentageRevealer,
        ],
    });

    // Initial update
    updateBatteryInfo();
    return widget;
};

const BatteryScaleModule = () => Box({
    className: "spacing-h-4",
    children: [
        Stack({
            transition: "slide_up_down",
            transitionDuration: userOptions.asyncGet().animations.durationLarge,
            children: {
                laptop: BatteryScale(),
                hidden: Widget.Box({}),
            },
            setup: (stack) => {
                stack.hook(globalThis.devMode, () => {
                    if (globalThis.devMode.value) {
                        stack.shown = "laptop";
                    } else {
                        if (!Battery.available) stack.shown = "hidden";
                        else stack.shown = "laptop";
                    }
                });
            },
        }),
    ],
});

export default BatteryScaleModule;
