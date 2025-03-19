import Widget from "resource:///com/github/Aylur/ags/widget.js";
import WindowTitle from "../normal/spaceleft.js";
import Music from "../normal/mixed.js";
import System from "../normal/system.js";
import Indicators from "../normal/spaceright.js";
import NormalOptionalWorkspaces from "../normal/workspaces_hyprland.js";
import { BarGroup } from "../../.commonwidgets/bargroup.js";

const opts = await userOptions.asyncGet();
export const NormalBar = Widget.CenterBox({
  className: "bar-bg shadow-window",
  css: `padding:0.2rem 1rem`,
  startWidget: opts.bar.elements.showWindowTitle ? await WindowTitle() : null,
  centerWidget: Widget.Box({
    spacing: 6,
    children: [
      Music(),
      opts.bar.elements.showWorkspaces ? BarGroup({ child: await NormalOptionalWorkspaces() }) : null,
      System()
    ],
  }),
  endWidget: Widget.Box({ child: opts.bar.elements.showIndicators ? Indicators() : null }),
});
