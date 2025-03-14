import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { execAsync, exec } = Utils;
const { Box, EventBox, Label, Revealer, Overlay } = Widget;
import { AnimatedCircProg } from "../../.commonwidgets/cairo_circularprogress.js";
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';
import { getDistroName, getDistroIcon } from '../../.miscutils/system.js';


const ResourceValue = (name, icon, interval, valueUpdateCmd, displayFunc, props = {}) => Box({
    ...props,
    className: 'bg-system-bg txt',
    vpack: 'center',
    hpack: 'center',
    vertical: true,
    children: [
        Overlay({
            child: AnimatedCircProg({
                className: 'add-resources-circprog-main',
                hpack: 'center',
                vpack: 'center',
                extraSetup: (self) => self
                    .poll(interval, (self) => {
                        execAsync(['bash', '-c', `${valueUpdateCmd}`]).then((newValue) => {
                            self.css = `font-size: ${Math.round(newValue)}px;`
                        }).catch(print);
                    })
                ,
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
        Label({
            className: 'txt-small onSurfaceVariant',
            css: 'margin-top:0.8rem',
            label: `${name}`
        })
    ]
})

const resources = Box({
    className: 'add-resources-block-bg',
    child: Box({
        spacing: 22,
        hpack: 'center',
        css: 'margin-left:2.2rem',
        children: [
            ResourceValue('Memory', 'memory', 10000, `free | awk '/^Mem/ {printf("%.2f\\n", ($3/$2) * 100)}'`,
                (label) => {
                    execAsync(['bash', '-c', `free -h | awk '/^Mem/ {print $3 " / " $2}' | sed 's/Gi/Gib/g'`])
                        .then((output) => {
                            label.label = `${output}`
                        }).catch(print);
                }, { hpack: 'end' }),
            ResourceValue('Swap', 'swap_horiz', 10000, `free | awk '/^Swap/ {if ($2 > 0) printf("%.2f\\n", ($3/$2) * 100); else print "0";}'`,
                (label) => {
                    execAsync(['bash', '-c', `free -h | awk '/^Swap/ {if ($2 != "0") print $3 " / " $2; else print "No swap"}' | sed 's/Gi/Gib/g'`])
                        .then((output) => {
                            label.label = `${output}`
                        }).catch(print);
                }, { hpack: 'end' }),
            ResourceValue('Root', 'hard_drive_2', 3600000, `echo $(df --output=pcent / | tr -dc '0-9')`,
                (label) => {
                    execAsync(['bash', '-c', `df -h --output=avail / | awk 'NR==2{print $1}'`])
                        .then((output) => {
                            label.label = `${output} available`
                        }).catch(print);
                }, { hpack: 'end' }),
            ResourceValue('Disk 2', 'hard_drive_2', 3600000, `echo $(df --output=pcent / | tr -dc '0-9')`,
                (label) => {
                    execAsync(['bash', '-c', `df -h --output=avail / | awk 'NR==2{print $1}'`])
                        .then((output) => {
                            label.label = `${output} available`
                        }).catch(print);
                }, { hpack: 'end' }),

        ]
    })
});


export default () => resources