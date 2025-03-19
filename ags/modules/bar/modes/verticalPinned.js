import Widget from "resource:///com/github/Aylur/ags/widget.js";
import BarBattery from "../vertical_modules/battery.js";
import { StatusIcons } from "../vertical_modules/statusicons.js";
import { VerticalCLock } from "../vertical_modules/vertical_clock.js"
import BarToggles from "../vertical_modules/bar_toggles.js"
import KbLayout from "../modules/kb_layout.js";
import { RoundedCorner } from "../../.commonwidgets/cairo_roundedcorner.js";
import VerticalOptionalWorkspace from "../vertical_modules/workspaces_hyprland.js"
import ScrolledModule from "../../.commonwidgets/scrolledmodule.js";
import { MediaControls } from "../vertical_modules/bar_toggles.js";
const { Box } = Widget;
export const VerticalBarPinned = Widget.CenterBox({
  className: "bar-bg",
  vertical: true,
  startWidget: Box({
    css: "margin-top: 1.5rem",
    hpack: 'center',
    vpack: 'start',
    vertical: true,
    spacing: 15,
    children: [
      BarBattery(),
      ScrolledModule({
        hpack: "center",
        children: [
          Box({ vpack: "center", className: "vertical-group-pad vertical-group", child: MediaControls() }),
          Box({ vpack: "center", className: "vertical-group-pad vertical-group", child: BarToggles() }),
        ]
      })
    ],
  }),
  centerWidget: Box({
    css: 'margin-right:0.4rem',
    vpack: 'center',
    vertical: true,
    children: [
      RoundedCorner('bottomleft', { className: 'corner-bar-minimal' }),
      await VerticalOptionalWorkspace({ className: 'minimal-notch-vertical' }),
      RoundedCorner('topleft', { className: 'corner-bar-minimal' }),
    ]
  }),

  endWidget:
    Box({
      hpack: "center",
      css: "margin-bottom: 1.5rem",
      hexpand: true,
      vpack: "end",
      vertical: true,
      vexpand: true,
      spacing: 15,
      children: [
        StatusIcons(),
        KbLayout(),
        VerticalCLock(),

      ]
    })
});
