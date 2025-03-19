import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { execAsync, exec } = Utils;
const { Box, EventBox, Label, Revealer, Overlay } = Widget;
import { AnimatedCircProg } from "../../.commonwidgets/cairo_circularprogress.js";
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';
import Battery from "resource:///com/github/Aylur/ags/service/battery.js";

// Modified ResourceValue that uses the displayFunc to update its label.
const ResourceValue = (name, icon, interval, valueUpdateCmd, displayFunc, props = {}) => {
    // Create the label widget and start polling for label updates.
    const valueLabel = Label({
        className: 'txt-small onSurfaceVariant',
        css: 'margin-top:0.8rem',
        label: `${name}`
    });
    // Poll to update the label using displayFunc.
    valueLabel.poll(interval, (self) => {
        displayFunc(self);
    });

    return Box({
        ...props,
        className: 'bg-system-bg txt',
        vpack: 'center',
        hpack: 'center',
        vertical: true,
        children: [
            Overlay({
                child: Box({
                    hpack: 'center',
                    vpack: 'center',
                    children: [
                        AnimatedCircProg({
                            className: 'add-resources-circprog-main',
                            extraSetup: (self) => self.poll(interval, (self) => {
                                execAsync(['bash', '-c', valueUpdateCmd])
                                    .then((newValue) => {
                                        // Update only the font-size while container remains fixed.
                                        self.css = `font-size: ${Math.round(newValue)}px;`;
                                    })
                                    .catch(print);
                            }),
                        }),
                    ],
                }),
                overlays: [
                    Box({
                        hpack: 'center',
                        vpack: 'center',
                        vertical: true,
                        children: [
                            MaterialIcon(`${icon}`, 'hugeass'),
                        ],
                    }),
                ],
            }),
            valueLabel,
        ]
    });
};

const BatteryResource = (name, icon, props = {}) => Box({
    ...props,
    className: 'bg-system-bg txt',
    vpack: 'center',
    hpack: 'center',
    vertical: true,
    children: [
        Overlay({
            child: Box({
                hpack: 'center',
                vpack: 'center',
                children: [
                    AnimatedCircProg({
                        className: 'add-resources-circprog-main',
                        extraSetup: (self) => self.hook(Battery, () => {
                            const percent = Battery.percent;
                            self.css = `font-size: ${Math.round(percent)}px;`;
                        }),
                    }),
                ],
            }),
            overlays: [
                Box({
                    hpack: 'center',
                    vpack: 'center',
                    vertical: true,
                    children: [
                        MaterialIcon(`${icon}`, 'hugerass'),
                    ],
                }),
            ],
        }),
        Label({
            className: 'txt-small onSurfaceVariant',
            css: 'margin-top:0.8rem',
            setup: (self) => self.hook(Battery, () => {
                const chargingText = Battery.charging ? '' : ' ';
                self.label = `Charge: ${Battery.percent}%${chargingText}`;
            }),
            label: `${name}`
        })
    ]
});

const resources = Box({
    className: 'add-resources-block-bg',
    child: Box({
        spacing: 10,
        hpack: 'center',
        css: 'margin-left:1rem',
        children: [
            ResourceValue(
                'Memory',
                'memory',
                5000,
                `free | awk '/^Mem/ {printf("%.2f\\n", ($3/$2) * 100)}'`,
                (label) => {
                    execAsync(['bash', '-c', `free -h | awk '/^Mem/ {print $3 " / " $2}' | sed 's/Gi/Gib/g'`])
                        .then((output) => {
                            label.label = `${output}`;
                        })
                        .catch(print);
                },
            ),
            ResourceValue(
                'Root',
                'hard_drive_2',
                3600000,
                `echo $(df --output=pcent / | tr -dc '0-9')`,
                (label) => {
                    execAsync(['bash', '-c', `df -h --output=avail / | awk 'NR==2{print $1}'`])
                        .then((output) => {
                            label.label = `${output} available`;
                        })
                        .catch(print);
                },
            ),
            BatteryResource('Battery', 'local_fire_department', { hpack: 'end' }),
            ResourceValue(
                'Battery Health',
                'spa',
                3600000,
                `upower -i /org/freedesktop/UPower/devices/battery_BAT0 | grep capacity | awk '{print $2}' | cut -d '.' -f1 | tr -d '%'`,
                (label) => {
                    execAsync(['bash', '-c', `upower -i /org/freedesktop/UPower/devices/battery_BAT0 | grep capacity | awk '{print $2}' | cut -d '.' -f1 | tr -d '%'`])
                        .then((output) => {
                            label.label = `Health: ${output}%`;
                        })
                        .catch(print);
                },
            ),
        ]
    })
});

export default () => resources;
