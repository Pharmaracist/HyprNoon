import App from "resource:///com/github/Aylur/ags/app.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import Bluetooth from "resource:///com/github/Aylur/ags/service/bluetooth.js";
import Network from "resource:///com/github/Aylur/ags/service/network.js";
import Notifications from "resource:///com/github/Aylur/ags/service/notifications.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
import { AnimatedCircProg } from "../../.commonwidgets/cairo_circularprogress.js";
const { GLib,Gtk } = imports.gi;
import { Tray } from "./tray.js";
export const NotificationIndicator = (notifCenterName = "sideright") => {
  const widget = Widget.Revealer({
    transition: "slide_left",
    transitionDuration: userOptions.asyncGet().animations.durationSmall,
    revealChild: false,
    setup: (self) =>
      self
        .hook(
          Notifications,
          (self, id) => {
            if (!id || Notifications.dnd) return;
            if (!Notifications.getNotification(id)) return;
            self.revealChild = true;
          },
          "notified",
        )
        .hook(App, (self, currentName, visible) => {
          if (visible && currentName === notifCenterName) {
            self.revealChild = false;
          }
        }),
    child: Widget.Box({
      vertical:true,
      className: "txt-small onSurfaceVariant titlefont",
      children: [
        MaterialIcon("notifications", "norm"),
        Widget.Label({
          className: "txt-small onSurfaceVariant titlefont",
          attribute: {
            unreadCount: 0,
            update: (self) => (self.label = `${self.attribute.unreadCount}`),
          },
          setup: (self) =>
            self
              .hook(
                Notifications,
                (self, id) => {
                  if (!id || Notifications.dnd) return;
                  if (!Notifications.getNotification(id)) return;
                  self.attribute.unreadCount++;
                  self.attribute.update(self);
                },
                "notified",
              )
              .hook(App, (self, currentName, visible) => {
                if (visible && currentName === notifCenterName) {
                  self.attribute.unreadCount = 0;
                  self.attribute.update(self);
                }
              }),
        }),
      ],
    }),
  });
  return widget;
};

export const BluetoothIndicator = () =>
  Widget.Stack({
    transition: "slide_up_down",
    transitionDuration: userOptions.asyncGet().animations.durationSmall,
    children: {
      false: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "bluetooth_disabled",
      }),
      true: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "bluetooth",
      }),
    },
    setup: (self) =>
      self.hook(Bluetooth, (stack) => {
        stack.shown = String(Bluetooth.enabled);
      }),
  });

const BluetoothDevices = () =>
  Widget.Box({
    spacing:6,
    setup: (self) =>
      self.hook(
        Bluetooth,
        (self) => {
          self.children = Bluetooth.connected_devices.map((device) => {
            return Widget.Box({
              className: "bar-bluetooth-device onSurfaceVariant",
              vpack: "center",
              tooltipText: device.name,
              vertical: true,
              spacing: 8,
              children: [
                Widget.Icon(`${device.iconName}-symbolic`),
                ...(device.batteryPercentage
                  ? [
                      Widget.Label({
                        className: "txt-small onSurfaceVariant",
                        label: `${device.batteryPercentage}`,
                        setup: (self) => {
                          self.hook(
                            device,
                            (self) => {
                              self.label = `${device.batteryPercentage}`;
                            },
                            "notify::batteryPercentage",
                          );
                        },
                      }),
                    ]
                  : []),
              ],
            });
          });
          self.visible = Bluetooth.connected_devices.length > 0;
        },
        "notify::connected-devices",
      ),
  });

const NetworkWiredIndicator = () =>
  Widget.Stack({
    transition: "slide_up_down",
    transitionDuration: userOptions.asyncGet().animations.durationSmall,
    children: {
      fallback: SimpleNetworkIndicator(),
      unknown: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "wifi_off",
      }),
      disconnected: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "signal_wifi_off",
      }),
      connected: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "lan",
      }),
      connecting: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "settings_ethernet",
      }),
    },
    setup: (self) =>
      self.hook(Network, (stack) => {
        if (!Network.wired) return;

        const { internet } = Network.wired;
        if (["connecting", "connected"].includes(internet))
          stack.shown = internet;
        else if (Network.connectivity !== "full") stack.shown = "disconnected";
        else stack.shown = "fallback";
      }),
  });

const SimpleNetworkIndicator = () =>
  Widget.Icon({
    setup: (self) =>
      self.hook(Network, (self) => {
        const icon = Network[Network.primary || "wifi"]?.iconName;
        self.icon = icon || "";
        self.visible = icon;
      }),
  });

const NetworkWifiIndicator = () =>
  Widget.Stack({
    transition: "slide_up_down",
    transitionDuration: userOptions.asyncGet().animations.durationSmall,
    children: {
      disabled: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "wifi_off",
      }),
      disconnected: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "signal_wifi_off",
      }),
      connecting: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "settings_ethernet",
      }),
      0: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "signal_wifi_0_bar",
      }),
      1: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "network_wifi_1_bar",
      }),
      2: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "network_wifi_2_bar",
      }),
      3: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "network_wifi_3_bar",
      }),
      4: Widget.Label({
        className: "txt-norm onSurfaceVariant icon-material",
        label: "signal_wifi_4_bar",
      }),
    },
    setup: (self) =>
      self.hook(Network, (stack) => {
        if (!Network.wifi) {
          return;
        }
        if (Network.wifi.internet == "connected") {
          stack.shown = String(Math.ceil(Network.wifi.strength / 25));
        } else if (
          ["disconnected", "connecting"].includes(Network.wifi.internet)
        ) {
          stack.shown = Network.wifi.internet;
        }
      }),
  });

export const NetworkIndicator = () =>
  Widget.Stack({
    transition: "slide_up_down",
    transitionDuration: userOptions.asyncGet().animations.durationSmall,
    children: {
      fallback: SimpleNetworkIndicator(),
      wifi: NetworkWifiIndicator(),
      wired: NetworkWiredIndicator(),
    },
    setup: (self) =>
      self.hook(Network, (stack) => {
        if (!Network.primary) {
          stack.shown = "wifi";
          return;
        }
        const primary = Network.primary || "fallback";
        if (["wifi", "wired"].includes(primary)) stack.shown = primary;
        else stack.shown = "fallback";
      }),
  });


export const StatusIcons = (props = {}, monitor = 0) =>
  Widget.Box({
    ...props,
    child: Widget.Box({
      orientation:Gtk.Orientation.VERTICAL,
      hpack:"center",
      hexpand:true,
      children: [
        Widget.Box({
          orientation:Gtk.Orientation.VERTICAL,
          spacing:10,
          children: [
            NotificationIndicator(),
            Tray(),
            BluetoothDevices(),
            BluetoothIndicator(),
            NetworkIndicator(),
          ],
        }),
      ],
    }),
  });
