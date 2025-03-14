import Widget from "resource:///com/github/Aylur/ags/widget.js";
import WallpaperImage from "./wallpaper.js";
import SystemWidget from "./onscreenwidgets/system.js";
import Normal from "./onscreenwidgets/simpleclock.js";
import WeatherBlock from "./onscreenwidgets/weatherBlock.js";
import Auva from "./onscreenwidgets/auva.js";
import { zaWiseCat } from "./onscreenwidgets/zaWizeCat.js";
import ResourcesBlock from "./onscreenwidgets/resourcesBlock.js";
let opts = await userOptions.asyncGet()
import CalendarDay from './onscreenwidgets/calendarDay.js';
import phoneNotif from "./onscreenwidgets/phoneNotif.js";
export default (monitor) =>
  Widget.Window({
    name: `desktopbackground${monitor}`,
    layer: "background",
    // exclusivity: 'ignore',
    visible: opts.desktopBackground.visible ? true : false,
    keymode: "on-demand",
    child: Widget.Overlay({
      child: WallpaperImage(monitor),
      overlays: [
        Widget.Box({
          children: [
            Auva(),
            // Normal(),
            Widget.Box({ hexpand: true }),
            opts.desktopBackground.resources ? SystemWidget() : null,
            Widget.Box({
              vertical: true,
              children: [
                opts.desktopBackground.enableWisecat ? zaWiseCat : null,
                Widget.Box({
                  children: [
                    CalendarDay(),
                    WeatherBlock()
                  ]
                }),
                ResourcesBlock(),
                Widget.Box({ vexpand: true })
              ]
            })
          ],
        }),
        Widget.Box({
          hpack: 'end',
          hexpand: true,
          children: [
            phoneNotif()
          ]
        })
      ],
      setup: (self) => {
        self.set_overlay_pass_through(self.get_children()[1], true);
      },
    }),
  });
