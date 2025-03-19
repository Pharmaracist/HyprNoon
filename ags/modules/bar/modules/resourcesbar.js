const { GLib } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";

const { Box, ProgressBar } = Widget;
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";

const Resource = (name, icon, command) => {
    return Box({
        className: 'bar-resources',
        css:`margin:-2px 0`,
        vpack: 'center',
        children: [
            MaterialIcon(icon, 'smallie', {
                className: 'onSurfaceVariant icon-material',
                css: 'margin-right: 0.5rem;font-size:1.15rem',
                vpack: 'center',
            }),
            Box({
                hexpand: true,
                vpack: 'center',
                child: ProgressBar({
                    className: 'resourcebar-progress',
                    // css: 'margin: -0.2rem 0;',
                    vertical: false,
                    setup: (self) => self.poll(2000, () => {
                        Utils.execAsync(['bash', '-c', command])
                            .then(output => {
                                const value = Math.round(Number(output));
                                self.value = value / 100;
                                self.tooltipText = `${name}: ${value}%`;
                            })
                            .catch(print);
                    }),
                }),
            }),
        ],
    });
};

const ResourcesWidget = () => Box({
    className: 'resourcebar-box',
    css:`margin:0px 15px;`,
    homogeneous: true,
    vertical: true,
    vpack: 'center',
    children: [
        Resource(
            'CPU',
            'memory',
            'top -b -n 1 | grep "Cpu(s)" | awk \'{print ($2 + $4)}\''
        ),
        Resource(
            'Memory',
            'database',
            'free | grep Mem | awk \'{print ($3/$2 * 100)}\''
        ),
        // Resource(
        //     'Disk',
        //     'storage',
        //     'df -h / | awk \'NR==2 {print substr($5, 1, length($5)-1)}\''
        // ),
        Resource(
            'Battery',
            'battery_full',
            'upower -i $(upower -e | grep BAT) | grep percentage | awk \'{print $2}\' | tr -d "%"'
        ),
    ],
});

export default () => ResourcesWidget();