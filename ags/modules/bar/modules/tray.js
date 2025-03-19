import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import SystemTray from 'resource:///com/github/Aylur/ags/service/systemtray.js';
const { Box, Icon, Button, Revealer } = Widget;
const { Gravity } = imports.gi.Gdk;

const SysTrayItem = (item, iconSize = userOptions.asyncGet().bar.traySize) => {
    if (item.id === null) return null;

    const icon = Icon({
        hpack: 'center',
        size: iconSize,
    });

    // Bind the icon to the item's icon property
    icon.bind('icon', item, 'icon');

    const button = Button({
        className: 'bar-systray-item',
        child: icon,
    });

    // Set up tooltip
    button.hook(item, (self) => {
        self.tooltipMarkup = item['tooltip-markup'];
    });

    // Handle primary click
    button.onPrimaryClick = async (_, event) => {
        try {
            await item.activate(event);
        } catch (error) {
            console.error('Error activating tray item:', error);
        }
    };

    // Handle secondary click
    button.onSecondaryClick = (btn, event) => {
        item.menu.popup_at_widget(btn, Gravity.SOUTH, Gravity.NORTH, null);
    };

    return button;
};

export const Tray = ({ iconSize = userOptions.asyncGet().bar.traySize, ...props } = {}) => {
    const trayContent = Box({
        className: 'margin-right-5 spacing-h-15',
    });

    // Hook into the SystemTray service to update the tray items
    trayContent.hook(SystemTray, (self) => {
        // Destroy existing children to prevent leaks
        self.get_children().forEach(child => {
            child.destroy();
        });

        // Create new children, filtering out any nulls
        self.children = SystemTray.items
            .map(item => SysTrayItem(item, iconSize))
            .filter(widget => widget !== null);

        self.show_all();
    });

    const trayRevealer = Revealer({
        revealChild: true,
        transition: 'slide_left',
        transitionDuration: userOptions.asyncGet().animations.durationLarge,
        child: trayContent,
    });

    return Box({
        ...props,
        children: [trayRevealer],
    });
};