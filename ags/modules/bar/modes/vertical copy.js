const { Gtk } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import BarBattery from "../vertical_modules/battery.js";
import { StatusIcons } from "../vertical_modules/statusicons.js";
import VerticalClock  from "../vertical_modules/vertical_clock.js"
import VerticalPinnedApps from "../vertical_modules/vertical_pinned_apps.js";
import BarToggles from "../vertical_modules/bar_toggles.js"
import KbLayout from "../modules/kb_layout.js";
import VerticalOptionalWorkspace from "../vertical_modules/workspaces_hyprland.js"
import ScrolledModule from "../../.commonwidgets/scrolledmodule.js";
import Shortcuts from "./../vertical_modules/utils.js";
import { MediaControls } from "../vertical_modules/bar_toggles.js";
export const VerticalBar = Widget.CenterBox({
  className: "bar-floating",
  css:`min-width:3rem`,
  vertical:true,
  startWidget: Widget.Box({
    css: "margin-top: 1.5rem",
    hpack: 'center',
    vpack:'start',
    vertical:true,
    spacing:15,
    children: [
      BarBattery(),
      ScrolledModule({
        children:[
          Widget.Box({vpack:"center",className:"bar-group-pad-vertical bar-group",child:BarToggles()}),
          Widget.Box({vpack:"center",className:"bar-group-pad-vertical bar-group",child:MediaControls()}),
        ]
      })
    ],
  }),
  centerWidget: 
  ScrolledModule({
    children:[
      Widget.Box({className:"bar-group-pad-vertical bar-group",child:VerticalOptionalWorkspace()}),
      Widget.Box({className:"bar-group-pad-vertical bar-group",child:VerticalPinnedApps()}),
      Widget.Box({className:"bar-group-pad-vertical bar-group",child:Shortcuts()}),
    ]
  }),
  endWidget:
  Widget.Box({
    hpack:"center",
    css: "margin-bottom: 1.5rem",
    hexpand:true,
    vpack:"end",
    vertical:true,
    spacing: 15,
    children:[
        StatusIcons(),
        VerticalClock(),
    ]
  })
});