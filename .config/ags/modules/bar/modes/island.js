const { GLib } = imports.gi;
import { StatusIcons } from "../../.commonwidgets/statusicons.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import BarBattery from "../modules/battery.js";
import InLineClock from "../modules/inline_clock.js";
import Notifications from 'resource:///com/github/Aylur/ags/service/notifications.js';

// Create a label for the notification title/summary.
const notificationTitleLabel = Widget.Label({
  className: 'txt-norm txt-onLayer1',
  hpack: 'center',
});

// Create a new label for the notification content.
const notificationContentLabel = Widget.Label({
  className: 'txt-norm txt-onLayer1',
  hpack: 'center',
  label: ''
});

// Group the notification title and content into a container.
const notificationContainer = Widget.Box({
  className: 'notification-container',
  children: [
    Widget.Box({ css: "min-width:4rem" }),
    notificationTitleLabel,
    notificationContentLabel
  ]
});

export const IslandBar = Widget.CenterBox({
  centerWidget: Widget.Box({
    className: "bar-island",
    spacing: 15,
    children: [
      BarBattery(),
      InLineClock(),
      StatusIcons(),
      notificationContainer
    ]
  }),
  setup: self => {
    notificationContainer.hide();
    notificationContainer.toggleClassName('island-notification-deactivate', true);

    self.hook(Notifications, () => {
      const notifications = Notifications.notifications;
      if (notifications.length > 0) {
        notificationTitleLabel.label = notifications[0].summary || "Unknown Notification";
        notificationContentLabel.label = notifications[0].body ? "  |  " + notifications[0].body : "";
        notificationContainer.show();
        notificationContainer.toggleClassName('island-notification-deactivate', false);
        notificationContainer.toggleClassName('island-notification-active', true);
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 3000, () => {
          notificationContainer.toggleClassName('island-notification-active', false);
          GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => {
            notificationContainer.hide();
            notificationContainer.toggleClassName('bar-island', true);
            return GLib.SOURCE_REMOVE;
          });
          return GLib.SOURCE_REMOVE;
        });
      }
    }, 'notified');
  }
});
