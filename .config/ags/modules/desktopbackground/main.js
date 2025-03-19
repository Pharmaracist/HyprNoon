import Widget from "resource:///com/github/Aylur/ags/widget.js";
import WallpaperImage from "./wallpaper.js";
import SystemWidget from "./onscreenwidgets/system.js";
import Normal from "./onscreenwidgets/simpleclock.js";
import ScrolledModule from "./../.commonwidgets/scrolledmodule.js";
import WeatherBlock from "./onscreenwidgets/weatherBlock.js";
import Auva from "./onscreenwidgets/auva.js";
import { zaWiseCat } from "./onscreenwidgets/zaWizeCat.js";
import ResourcesBlock from "./onscreenwidgets/resourcesBlock.js";
let opts = await userOptions.asyncGet();
import CalendarDay from "./onscreenwidgets/calendarDay.js";
import phoneNotif from "./onscreenwidgets/phoneNotif.js";
export default (monitor) =>
  Widget.Window({
    name: `desktopbackground${monitor}`,
    layer: "background",
    visible: opts.desktopBackground.visible ? true : false,
    keymode: "on-demand",
    child: Widget.Overlay({
      child: WallpaperImage(monitor),
      overlays: [
        Widget.Box({
          children: [
            ScrolledModule({
              children: [Auva(), Normal()],
            }),
            Widget.Box({ hexpand: true }),
            Widget.Box({
              vertical: true,
              children: [
                ScrolledModule({
                  hpack: "end",
                  hexpand: true,
                  children: [
                    Widget.Box({
                      vertical: true,
                      children: [
                        Widget.Box({
                          children: [CalendarDay(), WeatherBlock()],
                        }),
                        ResourcesBlock(),
                      ],
                    }),
                    zaWiseCat,
                  ],
                }),
                Widget.Box({ vexpand: true }),
              ],
            }),
          ],
        }),
        // Widget.Box({
        //   hpack: 'end',
        //   hexpand: true,
        //   children: [
        //     phoneNotif()
        //   ]
        // })
      ],
      setup: (self) => {
        self.set_overlay_pass_through(self.get_children()[1], true);
      },
    }),
  });
