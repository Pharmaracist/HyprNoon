const { GLib } = imports.gi;
import App from "resource:///com/github/Aylur/ags/app.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import { MaterialIcon } from "./materialicon.js";
import { NetworkIndicator } from "./statusicons.js"
import Network from "resource:///com/github/Aylur/ags/service/network.js";
const REFRESH_INTERVAL = 1000;

const formatSpeed = (bytesPerSec) => {
    if (bytesPerSec === 0) return '0 Mb/s';
    if (!bytesPerSec || isNaN(bytesPerSec)) return '0 Mb/s';
    
    const bitsPerSec = bytesPerSec * 8;
    const mbps = bitsPerSec / 1000000;
    return `${mbps.toFixed(1)} Mb/s`;
};

const downloadLabel = Widget.Label({
    className: 'bar-cpu-txt onSurfaceVariant',
    label: '0 Mb/s',
});

const uploadLabel = Widget.Label({
    className: 'bar-cpu-txt onSurfaceVariant',
    label: '0 Mb/s',
});

const downloadIcon = Widget.Box({ className: 'sec-txt', child: MaterialIcon('arrow_warm_up', 'norm') });
const uploadIcon = Widget.Box({ className: 'sec-txt', child: MaterialIcon('arrow_cool_down', 'norm') });
const download = Widget.Box({ hexpand: true, children: [downloadIcon, downloadLabel] });
const upload = Widget.Box({ hexpand: true, children: [uploadIcon, uploadLabel] });

const getNetworkBytes = () => {
    try {
        const activeIface = Utils.exec('ip route get 1.1.1.1').split('dev ')[1]?.split(' ')[0];
        if (!activeIface) return { rxBytes: 0, txBytes: 0 };

        const stats = Utils.exec(`ip -s link show ${activeIface}`);
        const lines = stats.split('\n');
        
        const rxBytes = parseInt(lines[3]?.trim().split(/\s+/)[0]) || 0;
        const txBytes = parseInt(lines[5]?.trim().split(/\s+/)[0]) || 0;
        
        return { rxBytes, txBytes };
    } catch (error) {
        return { rxBytes: 0, txBytes: 0 };
    }
};

const NetworkSpeedIndicator = () => {
    let lastRx = 0;
    let lastTx = 0;
    let lastTime = GLib.get_monotonic_time() / 1000000;

    const speedBox = Widget.Box({
        hpack: 'fill',
        hexpand: true,
        css:`margin-right:1.5rem`,
        spacing: 6,
        children: [
            download,
            Widget.Label({ className: 'sec-txt', label: ' ' }),
            upload
        ]
    });

    // Create revealer for speed indicators
    const speedRevealer = Widget.Revealer({
        revealChild: false,
        transition: 'slide_left',
        transitionDuration: 200,
        child: speedBox
    });

    // Network name with click handler
    const networkName = Widget.EventBox({
        child: Widget.Box({
            className: 'txt-smallie bar-group2',
            css: `padding: 0 1.5rem;`,
            hexpand: true,
            hpack: 'fill',
            spacing: 10,
            children: [
                NetworkIndicator(),
                Widget.Label({
                    label: Network.wifi?.ssid,
                }),
            ],
        }),
        onPrimaryClick: () => speedRevealer.revealChild = !speedRevealer.revealChild,
    });

    const content = Widget.Box({
        children: [
            Widget.Box({
                spacing:8,
                 children: [networkName, speedRevealer]
            })
        ]
    });

    const update = () => {
        const currentTime = GLib.get_monotonic_time() / 1000000;
        const timeDelta = currentTime - lastTime;
        const { rxBytes, txBytes } = getNetworkBytes();

        if (timeDelta > 0 && lastRx !== 0) {
            const rxSpeed = Math.max(0, (rxBytes - lastRx) / timeDelta);
            const txSpeed = Math.max(0, (txBytes - lastTx) / timeDelta);
            downloadLabel.label = `${formatSpeed(rxSpeed)}`;
            uploadLabel.label = `${formatSpeed(txSpeed)}`;
        }

        lastRx = rxBytes;
        lastTx = txBytes;
        lastTime = currentTime;
        return true;
    };

    const updateTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, REFRESH_INTERVAL, update);
    content.connect('destroy', () => GLib.source_remove(updateTimeout));
    update();

    return content;
};

export default () => NetworkSpeedIndicator();