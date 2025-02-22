import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
const { Box, EventBox, Stack } = Widget;
const { GLib } = imports.gi;
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
import PrayerTimesWidget from './prayertimes.js';
import WeatherOnly from './weatherOnly.js';
import Media from 'resource:///com/github/Aylur/ags/service/mpris.js';
import Notifications from 'resource:///com/github/Aylur/ags/service/notifications.js';
import Clock from './clock.js';

const MAX_TEXT_LENGTH = 30;
const userName = GLib.get_real_name() + " ~ " + GLib.get_user_name();

const WeatherWidget = () => {
    const CYCLE_INTERVAL = userOptions.asyncGet().etc.weather.cycleTimeout || 10000;
    const PRIORITY_DISPLAY_TIME = 1000;
    
    let displayMode = 'weather';
    let previousMode = 'weather';
    let notificationTimeout = null;
    let cycleTimeout = null;
    let lastTitle = null;

    // Media components
    const mediaIcon = MaterialIcon('music_note', 'large txt-norm txt-onLayer1');
    const mediaTitleLabel = Widget.Label({
        className: 'txt-norm txt-onLayer1',
    });

    // Notification components
    const notificationIcon = MaterialIcon('notifications', 'large txt-norm txt-onLayer1');
    const notificationLabel = Widget.Label({
        className: 'txt-norm txt-onLayer1',
    });

    // Reusable content components
    const mediaContent = Box({
        className: 'content-box spacing-h-4',
        hpack: 'center',
        hexpand:true,
        children: [
            mediaIcon,
            mediaTitleLabel
        ]
    });

    const notificationContent = Box({
        className: 'content-box spacing-h-4',
        hpack: 'center',
        hexpand:true,
        children: [
            notificationIcon,
            notificationLabel
        ]
    });

    const usernameContent = Box({
        className: 'content-box',
        hpack: 'center',
        hexpand:true,
        child: Widget.Label({
            className: 'txt-norm txt-onLayer1',
            label: userName
        })
    });

    const clockContent = Box({
        className: 'content-box',
        child: Clock()
    });

    // Main content stack
    const contentStack = Stack({
        transition: 'slide_up_down',
        transitionDuration: userOptions.asyncGet().animations.durationSmall,
        children: {
            'weather': WeatherOnly(),
            'prayer': PrayerTimesWidget(),
            'media': mediaContent,
            'notification': notificationContent,
            'clock': clockContent,
            'username': usernameContent,
        },
        shown: displayMode
    });

    // Priority display management
    const showPriorityContent = (mode, duration) => {
        if (notificationTimeout) GLib.source_remove(notificationTimeout);
        
        previousMode = displayMode;
        displayMode = mode;
        contentStack.shown = mode;

        notificationTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, duration, () => {
            displayMode = previousMode;
            contentStack.shown = previousMode;
            notificationTimeout = null;
            return GLib.SOURCE_REMOVE;
        });
    };

    // Media tracking
    const updateMediaInfo = () => {
        const title = Media.title ? Utils.truncateString(Media.title, MAX_TEXT_LENGTH) : 'Silent Mode';
        
        if (title !== lastTitle && Media.title) {
            mediaTitleLabel.label = title;
            showPriorityContent('media', PRIORITY_DISPLAY_TIME);
        }
        
        lastTitle = title;
    };

    // Notification handling
    const showNotification = (notification) => {
        notificationLabel.label = Utils.truncateString(notification.summary, MAX_TEXT_LENGTH);
        showPriorityContent('notification', PRIORITY_DISPLAY_TIME);
    };

    // Cycling logic
    const cycleModes = () => {
        const modes = ['weather', 'prayer', 'media', 'clock', 'username'];
        const currentIndex = modes.indexOf(displayMode);
        displayMode = modes[(currentIndex + 1) % modes.length];
        contentStack.shown = displayMode;
    };

    const startAutoCycle = () => {
        if (cycleTimeout) GLib.source_remove(cycleTimeout);
        cycleTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, CYCLE_INTERVAL, () => {
            if (!notificationTimeout) cycleModes();
            return GLib.SOURCE_CONTINUE;
        });
    };

    return Widget.EventBox({
        onPrimaryClick: () => {
            cycleModes();
            startAutoCycle();
        },
        child: Box({
            className: 'complex-status',
            hpack: 'center',
            hexpand:true,
            child: contentStack,
            setup: self => {
                // Initialize services
                self
                    .hook(Media, updateMediaInfo, 'changed')
                    .hook(Notifications, (box, id) => {
                      const notifications = Notifications.notifications;
                      if (notifications.length > 0) showNotification(notifications[0]);
                  }, 'notified')
                // Start initial cycle
                startAutoCycle();
            }
        })
    });
};

export default WeatherWidget;