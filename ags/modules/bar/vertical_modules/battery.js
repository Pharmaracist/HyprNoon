// External dependencies
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import Battery from "resource:///com/github/Aylur/ags/service/battery.js";
const { Box, Label, Overlay, EventBox, Button } = Widget;
const { execAsync } = Utils;
const { Gtk, GLib } = imports.gi;
import { AnimatedCircProg } from "../../.commonwidgets/cairo_circularprogress.js";

// Configuration
const { userOptions } = globalThis;

// Power draw monitoring
const POWER_PATHS = {
    CURRENT: "/sys/class/power_supply/BAT0/current_now",
    VOLTAGE: "/sys/class/power_supply/BAT0/voltage_now"
};

const powerDrawCache = { 
    value: "N/A", 
    timestamp: 0,
    duration: 5000
};

const fetchPowerDraw = async () => {
    if (powerDrawCache.timestamp + powerDrawCache.duration > Date.now()) {
        return powerDrawCache.value;
    }

    try {
        const current = parseInt(await execAsync(`cat ${POWER_PATHS.CURRENT}`), 10);
        const voltage = parseInt(await execAsync(`cat ${POWER_PATHS.VOLTAGE}`), 10);
        const powerInWatts = ((current * voltage) / 1e12).toFixed(2);
        
        powerDrawCache.value = `${powerInWatts} W`;
        powerDrawCache.timestamp = Date.now();
        return powerDrawCache.value;
    } catch (error) {
        return 'N/A';
    }
};

// Battery progress indicator
const BarBatteryProgress = () => AnimatedCircProg({
    className: "bar-bat-circprog",
    vpack: "center",
    hpack: "center",
    extraSetup: (self) => self.hook(Battery, (circprog) => {
        const percent = Battery.percent;
        circprog.css = `font-size: ${percent}px;`;
        circprog.toggleClassName("bar-bat-circprog-low", percent <= (userOptions.battery?.low || 20));
        circprog.toggleClassName("bar-bat-circprog-full", Battery.charged);
        circprog.toggleClassName("bar-bat-circprog-charging", Battery.charging);
    }),
});

// Battery content
const BatteryContent = () => {
    let tooltipText = "";

    // Battery icon with percentage/charging indicator
    const batteryIcon = Button({
        tooltipText: "",
        child: Overlay({
            child: Box({
                vpack: "center",
                className: "bar-bat",
                homogeneous: true,
                children: [Label({ 
                    setup: (self) => self.hook(Battery, (label) => {
                        if (Battery.charging) {
                            label.className = "icon-material sec-txt txt-bold txt-small";
                            label.label = "bolt";
                        } else {
                            label.className = "sec-txt";
                            label.label = `${Battery.percent.toFixed(0)}`;
                        }
                    })
                })],
                setup: (self) => self.hook(Battery, (box) => {
                    box.toggleClassName("bar-bat-low", Battery.percent <= (userOptions.battery?.low || 20));
                    box.toggleClassName("bar-bat-full", Battery.charged);
                    box.toggleClassName("bar-bat-charging", Battery.charging);
                }),
            }),
            overlays: [BarBatteryProgress()],
        }),
    });

    // Update battery details periodically
    const updateDetails = async () => {
        const powerDraw = await fetchPowerDraw();
        try {
            const result = await execAsync("upower -i /org/freedesktop/UPower/devices/battery_BAT0");
            const timeInfo = result.split('\n').find(line => line.includes("time to"));
            const timeText = timeInfo ? timeInfo.split(":")[1].trim() : "N/A";
            
            tooltipText = `Battery: ${Battery.percent.toFixed(0)}%\nPower: ${powerDraw}\n${timeText}`;
            batteryIcon.tooltipText = tooltipText;
        } catch (error) {
            tooltipText = `Battery: ${Battery.percent.toFixed(0)}%\nPower: ${powerDraw}\nTime: Error`;
            batteryIcon.tooltipText = tooltipText;
        }
    };

    updateDetails();
    GLib.timeout_add(GLib.PRIORITY_DEFAULT, 10000, () => {
        updateDetails();
        return GLib.SOURCE_CONTINUE;
    });

    return EventBox({
        child: Box({
            className: "battery-module spacing-h-5",
            vertical: true,
            children: [batteryIcon],
        }),
    });
};

export default () => EventBox({
    onPrimaryClick: () => {
      App.toggleWindow("sideleft");
    },
    onSecondaryClick: () => {
        execAsync(["bash", "-c", userOptions.asyncGet().apps.taskManager]);
    },
    child: BatteryContent(),
});
