const { Gtk } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import Battery from "resource:///com/github/Aylur/ags/service/battery.js";
import FocusOptionalWorkspaces from "../focus/workspaces_hyprland.js";
export const FocusBar = Widget.CenterBox({
  className: "bar-bg-focus",
  css: `min-height:1.8rem`,
  startWidget: Widget.EventBox({
    css: `min-width:5rem`,
    onPrimaryClick: () => {
      App.toggleWindow("sideleft");
    },
  }),
  centerWidget: Widget.Box({
    className: "spacing-h-4",
    children: [
      Widget.Box({
        children: [await FocusOptionalWorkspaces()],
      }),
    ],
  }),
  endWidget: Widget.EventBox({
    css: `min-width:5rem`,
    onPrimaryClick: () => {
      App.toggleWindow("sideright");
    },
  }),
  setup: (self) => {
    self.hook(Battery, (self) => {
      if (!Battery.available) return;
      self.toggleClassName(
        "bar-bg-focus-batterylow",
        Battery.percent <= userOptions.asyncGet().battery.low,
      );
    });
  },
});