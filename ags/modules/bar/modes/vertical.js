import Widget from "resource:///com/github/Aylur/ags/widget.js";
import BarBattery from "../vertical_modules/battery.js";
import { StatusIcons } from "../vertical_modules/statusicons.js";
const { Box, CenterBox } = Widget;
import { VerticalCLock } from "../vertical_modules/vertical_clock.js";
import BarToggles from "../vertical_modules/bar_toggles.js";
import KbLayout from "../modules/kb_layout.js";
import VerticalOptionalWorkspace from "../vertical_modules/workspaces_hyprland.js";
import ScrolledModule from "../../.commonwidgets/scrolledmodule.js";
import { MediaControls } from "../vertical_modules/bar_toggles.js";
import { BrightnessControl } from "../vertical_modules/empty_area.js";
import { RoundedCorner } from "../../.commonwidgets/cairo_roundedcorner.js";

let float = 3;
let sideFloat = 0.25 * float;

export const VerticalBar = CenterBox({
  css: `margin: ${float}rem ${sideFloat}rem ${float}rem ${sideFloat}rem`,
  className: "bar-floating-outline",
  vertical: true,
  startWidget: Box({
    css: "margin-top: 1.5rem",
    hpack: "center",
    hexpand: true,
    vpack: "start",
    vertical: true,
    spacing: 5,
    children: [
      BarBattery(),
      ScrolledModule({
        children: [
          Box({
            vpack: "center",
            className: "vertical-group-pad vertical-group",
            child: MediaControls(),
          }),
          Box({
            vpack: "center",
            className: "vertical-group-pad vertical-group",
            child: BarToggles(),
          }),
        ],
      }),
      BrightnessControl(),
    ],
  }),
  centerWidget: Box({
    css: "margin-right:0.4rem",
    vpack: "center",
    vertical: true,
    children: [
      RoundedCorner("bottomleft", { className: "corner-bar-minimal" }),
      await VerticalOptionalWorkspace({ className: "minimal-notch-vertical" }),
      RoundedCorner("topleft", { className: "corner-bar-minimal" }),
    ],
  }),
  endWidget: Box({
    css: "margin-bottom: 1rem",
    vertical: true,
    vpack: "end",
    spacing: 10,
    children: [
      StatusIcons({ className: "onSurfaceVariant" }),
      KbLayout(),
      VerticalCLock(),
    ],
  }),
});
