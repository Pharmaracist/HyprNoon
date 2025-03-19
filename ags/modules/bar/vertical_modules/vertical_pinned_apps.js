const { Gtk } = imports.gi;
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
const { Box, Button } = Widget;
import Applications from 'resource:///com/github/Aylur/ags/service/applications.js';
import { setupCursorHover } from '../../.widgetutils/cursorhover.js';
const AppButton = ({ icon, name, ...rest }) => {
    return Button({
        className: 'bar-pinned-btn',
        child: Box({
            className: 'spacing-h-5 txt-norm',
            hpack: 'center',
            hexpand: true,
            children: [
                Widget.Icon({
                    icon: icon || '',
                    size: 24,
                }),
            ],
        }),
        tooltipText: name,
        setup: setupCursorHover,
        ...rest,
    });
};
export default () => {
    const pinnedApps = userOptions.asyncGet().bar?.pinnedApps || [];
    return Box({
        hexpand: true,
        hpack: 'center',
        vexpand: true,
        vpack: 'center',
        spacing:8,
        orientation:Gtk.Orientation.VERTICAL,
        className: 'bar-pinned-apps spacing-v-5',
        children: pinnedApps.map(appId => {
            const app = Applications.list.find(a => 
                a.desktop?.toLowerCase().includes(appId.toLowerCase()) ||
                a.name?.toLowerCase().includes(appId.toLowerCase())
            );
            
            if (!app) return null;
            
            return AppButton({
                icon: app.icon_name,
                name: app.name,
                onClicked: () => {
                    app.launch();
                },
            });
        }).filter(Boolean),
    });
};
