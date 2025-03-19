const { GLib } = imports.gi;
import App from "resource:///com/github/Aylur/ags/app.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";

const REFRESH_INTERVAL = 1000;

const formatSpeed = (bytesPerSec) => {
    if (bytesPerSec === 0) return '0 Mb/s';
    if (!bytesPerSec || isNaN(bytesPerSec)) return '0 Mb/s';
    
    // Convert bytes to bits and then to megabits
    const bitsPerSec = bytesPerSec * 8;
    const mbps = bitsPerSec / 1000000;
    
    return `${mbps.toFixed(1)} Mb/s`;
};

const getNetworkBytes = () => {
    try {
        const activeIface = Utils.exec('ip route get 1.1.1.1').split('dev ')[1]?.split(' ')[0];
        if (!activeIface) {
            return { rxBytes: 0, txBytes: 0 };
        }

        const stats = Utils.exec(`ip -s link show ${activeIface}`);
        const lines = stats.split('\n');
        
        const rxLine = lines[3]?.trim().split(/\s+/);
        const txLine = lines[5]?.trim().split(/\s+/);
        
        const rxBytes = parseInt(rxLine?.[0]) || 0;
        const txBytes = parseInt(txLine?.[0]) || 0;
        
        return { rxBytes, txBytes };
    } catch (error) {
        return { rxBytes: 0, txBytes: 0 };
    }
};

const NetworkSpeedIndicator = () => {
    let lastRx = 0;
    let lastTx = 0;
    let lastTime = GLib.get_monotonic_time() / 1000000;

    const downloadLabel = Widget.Label({
        className: 'bar-cpu-txt onSurfaceVariant',
        label: '0 Mb/s',
    });

    const uploadLabel = Widget.Label({
        className: 'bar-cpu-txt onSurfaceVariant',
        label: '0 Mb/s',
    });

    const downloadIcon = Widget.Box({ className: 'sec-txt', child: MaterialIcon('download', 'larger') });
    const uploadIcon = Widget.Box({ className: 'sec-txt', child: MaterialIcon('upload', 'larger') });
    const download = Widget.Box({ hexpand: true, children: [downloadIcon, downloadLabel] });
    const upload = Widget.Box({ hexpand: true, children: [uploadIcon, uploadLabel] });

    const content = Widget.Box({
        className: 'spacing-h-10',
        css: 'min-width: 15rem;',
        hpack: 'center',
        children: [
            Widget.Box({
                spacing: 6,
                hpack: 'center',
                hexpand: true,
                children: [download, Widget.Label({ className: 'sec-txt', label: ' ' }), upload],
            }),
        ],
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

        return true; // Continue the timeout
    };

    const updateTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, REFRESH_INTERVAL, update);

    // Cleanup function
    const cleanup = () => {
        if (updateTimeout) {
            GLib.source_remove(updateTimeout);
        }
        // Explicitly destroy child widgets
        downloadLabel.destroy();
        uploadLabel.destroy();
        downloadIcon.destroy();
        uploadIcon.destroy();
    };

    // Connect the cleanup function to the widget's destroy signal
    content.connect('destroy', cleanup);

    // Initial update
    update();

    return content;
};

export default () => NetworkSpeedIndicator();