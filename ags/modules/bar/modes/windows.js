const { Gtk } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import Indicators from "../normal/spaceright.js";
import BarBattery from "../vertical_modules/battery.js";
import ScrolledModule from "../../.commonwidgets/scrolledmodule.js";
import ActiveApps from "../modules/active_apps.js";
import PinnedApps from "../modules/pinned_apps.js";
import clock from "../modules/windowsClock.js";
import music from "../modules/media.js";
import scrolledmodule from "../../.commonwidgets/scrolledmodule.js";
export const WindowsTaskbar = Widget.CenterBox({
  className: "bar-bg",
  css: `min-height:2.4rem;padding: 0.45rem 0`,
  startWidget: Widget.Box({
    spacing: 19,
    css: "margin-left:1.1rem;",
    children: [
      Widget.Button({
        child: Widget.Icon({ icon: "windows-icon-symbolic", size: 24 }),
        onClicked: () => App.toggleWindow("sideleft"),
      }),
      Widget.Button({
        child: Widget.Icon({ icon: "search-symbolic", size: 20 }),
        onClicked: () => App.toggleWindow("overview"),
      }),
      ActiveApps(),
      Widget.Box({hexpand:true})
    ],
  }),
  endWidget: Widget.Box({
    css: "margin-right:1.1rem;",
    spacing: 10,
    children: [
      await Indicators(),
      Widget.Button({
        child: clock(),
        onClicked: () => App.toggleWindow(`sideright`),
      }),
      scrolledmodule({
        children: [
          Widget.Button({
            child: BarBattery(),
            onClicked: () => App.toggleWindow("sideright"),
          }),
          Widget.Button({
            child: Widget.Icon({ icon: "notifications-symbolic", size: 24 }),
            onClicked: () => App.toggleWindow("sideright"),
          }),
        ],
      }),
    ],
  }),
});
