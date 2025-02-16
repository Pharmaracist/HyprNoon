const { Gtk } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import Indicators from "../normal/spaceright.js";
import BarBattery from "../modules/battery.js";
import ScrolledModule from "../../.commonwidgets/scrolledmodule.js";
import NormalOptionalWorkspaces  from "../normal/workspaces_simple.js";
import FocusOptionalWorkspaces  from "../normal/workspaces_hyprland.js";
import Utils from "../modules/utils.js";
import media from "../modules/media.js";
import { getDistroIcon } from "../../.miscutils/system.js";
import MaClock from "../modules/maclock.js";
const { Box , EventBox } = Widget;
const macBar = async () => {
  const opts = userOptions.asyncGet();
  const workspaces = opts.bar.elements.showWorkspaces;
  const indicators = opts.bar.elements.showIndicators;
  return Widget.CenterBox({
    className: "bar-bg",
    startWidget: Widget.Box({
      css: "margin-left:1.8rem;",
      children: [
        ScrolledModule({
          children: [
            EventBox({
              child: Widget.Icon({
                icon: getDistroIcon(),
                className: 'txt txt-larger',
            }),
              onPrimaryClick: () => {
                App.toggleWindow("sideleft");
              },
            }),
           
           BarBattery()
          ],
        }),
        NormalOptionalWorkspaces()
      ],
    }),
    centerWidget: Widget.Box(),
    endWidget: Widget.Box({
      children: [
        Indicators(),
        MaClock()
    ],
    }),
  });
};

export const MacBar = await macBar();