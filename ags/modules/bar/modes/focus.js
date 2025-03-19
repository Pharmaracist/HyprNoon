import Widget from "resource:///com/github/Aylur/ags/widget.js";
import Battery from "resource:///com/github/Aylur/ags/service/battery.js";
import FocusOptionalWorkspaces from "../focus/workspaces_hyprland.js";

export const FocusBar = Widget.CenterBox({
  className: "bar-bg-focus",
  centerWidget: await FocusOptionalWorkspaces(),

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