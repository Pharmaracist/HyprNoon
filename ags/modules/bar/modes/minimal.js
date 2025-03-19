const { Box, CenterBox } = Widget;
import { RoundedCorner } from "../../.commonwidgets/cairo_roundedcorner.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import Indicators from "../normal/spaceright.js";
import BarBattery from "../modules/battery.js";
import ScrolledModule from "../../.commonwidgets/scrolledmodule.js";
import NormalOptionalWorkspaces from "../normal/workspaces_hyprland.js";
import media from "../modules/media.js";
import Clock from "../modules/clock.js";

const createMinimalBar = async () => {
  return CenterBox({
    className: "bar-bg",
    css: "padding-left: 1.8rem;",
    startWidget: Box({
      spacing: 20,
      children: [
        await BarBattery(),
        await NormalOptionalWorkspaces(),
      ],
    }),
    centerWidget: Box({
      children: [
        RoundedCorner('topright', { className: 'corner-bar-minimal' }),
        ScrolledModule({
          hpack: 'center',
          className: 'minimal-notch',
          children: [
            media(),
            Clock({ hexpand: true, css: 'padding:0 4rem', hpack: 'fill' }),
          ]
        }),
        RoundedCorner('topleft', { className: 'corner-bar-minimal' }),
      ]
    }),
    endWidget: Indicators(),
  });
};
export const MinimalBar = await createMinimalBar();