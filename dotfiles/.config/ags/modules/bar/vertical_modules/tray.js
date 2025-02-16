import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import SystemTray from 'resource:///com/github/Aylur/ags/service/systemtray.js';
const { Box, Icon, Button, Revealer } = Widget;
const { Gravity } = imports.gi.Gdk;

const SysTrayItem = (item, iconSize = userOptions.asyncGet().bar.traySize) => item.id !== null ? Button({
    className: 'bar-systray-item',
    child: Icon({
        hpack: 'center',
        size: iconSize,
    }).bind('icon', item, 'icon'),
    setup: (self) => self
        .hook(item, (self) => self.tooltipMarkup = item['tooltip-markup'])
    ,
    onPrimaryClick: async (_, event) => {
        try {
            await item.activate(event); // Assuming activate returns a promise
        } catch (error) {
            console.error('Error activating tray item:', error);
        }
    },
    onSecondaryClick: (btn, event) => item.menu.popup_at_widget(btn, Gravity.SOUTH, Gravity.NORTH, null),
}) : null;

export const Tray = ({ iconSize = userOptions.asyncGet().bar.traySize, ...props } = {}) => {
    const trayContent = Box({
        vertical:true,
        hexpand:true,
        hpack:"center",
        spacing:15,
        setup: (self) => self
            .hook(SystemTray, (self) => {
                self.children = SystemTray.items.map(item => SysTrayItem(item, iconSize));
                self.show_all();
            })
        ,
    });
    const trayRevealer = Widget.Revealer({
        revealChild: true,
        transition: 'slide_left',
        transitionDuration: userOptions.asyncGet().animations.durationLarge,
        child: trayContent,
    });
    return Box({
        ...props,
        vertical:true,
        hexpand:true,
        hpack:"center",
        spacing:5,
        children: [trayRevealer],
    });
}
