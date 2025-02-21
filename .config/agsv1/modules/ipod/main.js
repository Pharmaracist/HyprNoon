import Widget from "resource:///com/github/Aylur/ags/widget.js";
import IpodWidget from "./ipodwidget.js";
import App from 'resource:///com/github/Aylur/ags/app.js';

const toggleWindow = () => {
    const win = App.getWindow('ipod');
    if (!win) return;
    win.visible = !win.visible;
};

// Export the toggle function so it can be used from other modules
export { toggleWindow };

export default () => {
    const win = Widget.Window({
        name: 'ipod',
        layer: 'overlay',
        anchor: ['top', 'bottom', 'right', 'left'],
        visible: false,
        child: Widget.Overlay({
            child: Widget.EventBox({
                onPrimaryClick: () => App.closeWindow('ipod'),
                onSecondaryClick: () => App.closeWindow('ipod'),
                onMiddleClick: () => App.closeWindow('ipod'),
                child: Widget.Box({
                    css: `min-height: ${parseInt(userOptions.asyncGet().ipod.widget.minHeight)}px;`,
                    vexpand: true,
                    hexpand: true,
                }),
            }),
            overlays: [
                Widget.Box({
                    css: `margin: ${userOptions.asyncGet().ipod.widget.margin};`,
                    vpack: 'end',
                    vexpand: true,
                    hexpand: true,
                    child: IpodWidget(),
                }),
            ],
        }),
    });

    // Ensure window is hidden on startup
    App.connect('window-toggled', (_, name, visible) => {
        if (name === 'ipod' && visible) {
            const overlay = win.get_children()[0];
            const widgetBox = overlay.get_children()[1];
            if (!widgetBox.visible) {
                App.closeWindow('ipod');
            }
        }
    });

    return win;
};
