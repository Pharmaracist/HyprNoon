import Widget from "resource:///com/github/Aylur/ags/widget.js";
import Indicators from "../normal/spaceright.js";
import Clock from "../modules/inline_clock.js";
import NormalOptionalWorkspaces from "../normal/workspaces_hyprland.js";
import Battery from "../modules/battery.js";
import WindowsTitle from "../modules/window_title.js";
import { RoundedCorner } from "../../.commonwidgets/cairo_roundedcorner.js";
let opts = await userOptions.asyncGet();
const { Box } = Widget;
export const FloatingBar = Widget.CenterBox({
  className: "bar-floating",
  css: `
   margin: ${opts.bar.floatingElevation}rem ${opts.bar.floatingWidth}rem;
   padding:0.12rem 1rem
   `,
  startWidget: Widget.Box({
    spacing: 10,
    children: [Battery(), await WindowsTitle()],
  }),
  centerWidget: Box({
    vpack: "fill",
    css: "margin: -0.12rem 0 0.12rem 0",
    children: [
      RoundedCorner("topright", { className: "corner-bar-minimal" }),
      Box({
        className: "layer3-notch",
        child: await NormalOptionalWorkspaces(),
      }),
      RoundedCorner("topleft", { className: "corner-bar-minimal" }),
    ],
  }),
  endWidget: opts.bar.elements.showIndicators
    ? Box({
        children: [
          Indicators({ className: "onSurfaceVariant" }),
          Clock({
            className: "layer3-group txt-smallie onSurfaceVariant bar-time",
          }),
        ],
      })
    : null,
});
