const { Gtk } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import Update from "../modules/update.js";
import { Tray } from "../modules/tray.js";
import { NotificationIndicator } from "../../.commonwidgets/statusicons.js";
import Clock from "../modules/clock.js";
import NetworkSpeed from "../../.commonwidgets/networkspeed.js";
import PrayerTimesWidget from "../modules/prayertimes.js";
import WeatherOnly from "../modules/weatherOnly.js";
import NormalOptionalWorkspaces from "../normal/workspaces_hyprland.js";
import SystemResources from "../normal/resources.js";

const Box = Widget.Box;

export const SaadiBar = Widget.CenterBox({
  className: "bar-saadi",
  css: `padding:0 1.8rem`,
  startWidget: Widget.Box({
    className: "spacing-h-4",
    children: [
      NotificationIndicator(),
      Update,
      Box({
        className: "group-saadi",
        children: [
          Tray(),
        ]
      }),
      Box({
        hexpand: false,
        css: `padding : 0`,
        className: "group-saadi",
        children: [
          NetworkSpeed()
        ]
      }),
      Box({
        hexpand: false,
        className: "group-saadi",
        children: [
          WeatherOnly()
        ]
      }),
    ]
  }),
  centerWidget: Widget.Box({
    className: "group-saadi",
    children: [
      Clock(),
    ],
  }),
  endWidget: Widget.Box({
    children: [
      Widget.Box({
        hexpand: true,
        hpack: 'end',
        children: [
          Widget.Box({
            hpack: 'end',
            hexpand: true,
            className: "group-saadi",
            children: [
              PrayerTimesWidget()
            ],
          }),
          Widget.Box({
            hpack: 'end',
            hexpand: true,
            className: "group-saadi",
            children: [
              SystemResources()
            ],
          }),
          Widget.Box({
            hpack: 'end',
            hexpand: true,
            className: "group-saadi",
            children: [
              NormalOptionalWorkspaces(),
            ]
          })
        ]
      }),
    ]
  }),
});
