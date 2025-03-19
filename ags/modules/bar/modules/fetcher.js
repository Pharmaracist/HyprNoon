import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
const { Box, Label, Icon } = Widget;
const { exec } = Utils;
import Variable from 'resource:///com/github/Aylur/ags/variable.js';
import { getDistroIcon } from '../../.miscutils/system.js';

const distroID = exec(`bash -c 'cat /etc/os-release | grep "^ID=" | cut -d "=" -f 2 | sed "s/\\"//g"'`).trim();

const packageCount = Variable(0, {
    poll: [5000, () => {
        return Number(exec('bash -c "pacman -Q | wc -l"').trim());
    }],
});

const freeSpace = Variable('', {
    poll: [10000, () => {
        const dfOutput = exec('df -h /').trim().split('\n')[1].split(/\s+/);
        return `${dfOutput[3]}`;
    }],
});

const kernelVersion = Variable('', {
    poll: [60000, () => {
        return exec('uname -r').trim();
    }],
});

export default () => {
    const distroIcon = getDistroIcon();
    
    return Box({
        className: 'txt-norm onSurfaceVariant spacing-h-15',
        children: [
            Icon({
                icon: distroIcon,
                size: 30,
                className: 'txt-primary',
            }),
            Box({
                vertical: true,
                vpack: 'center',
                children: [
                    Label({
                        className: 'txt-norm',
                        setup: self => {
                            self.hook(kernelVersion, () => {
                                self.label = kernelVersion.value;
                            });
                        },
                    }),
                    Box({
                        className: 'spacing-h-5',
                        children: [
                            Label({
                                className: 'txt-small onSurfaceVariant txt',
                                setup: self => {
                                    self.hook(packageCount, () => {
                                        self.label = `${packageCount.value} packages`;
                                    });
                                },
                            }),
                        ],
                    }),
                ],
            }),
            Label({
                className: 'txt-norm onSurfaceVariant txt',
                hpack:"end",
                hexpand:true,
                setup: self => {
                    self.hook(freeSpace, () => {
                        self.label = `${freeSpace.value} free disk space`;
                    });
                },
            }),
        ],
    });
};
