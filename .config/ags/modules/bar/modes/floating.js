import Widget from "resource:///com/github/Aylur/ags/widget.js";
import Indicators from "../normal/spaceright.js";
import Clock from "../modules/clock.js";
import NormalOptionalWorkspaces from "../normal/workspaces_hyprland.js";
import Battery from "../modules/battery.js";
let opts = await userOptions.asyncGet()

export const FloatingBar = Widget.CenterBox({
  className: "bar-floating",
  css: `
   margin: ${opts.bar.floatingElevation}rem ${opts.bar.floatingWidth}rem;
   min-height:2rem;
   padding:0.2rem 1.8rem
   `,
  startWidget: Widget.Box({
    spacing: 10,
    children: [
      Battery(),
      opts.bar.elements.showWorkspaces ? await NormalOptionalWorkspaces() : null
    ]
  }),
  centerWidget: Clock(),
  endWidget: opts.bar.elements.showIndicators ? Indicators() : null,

});
