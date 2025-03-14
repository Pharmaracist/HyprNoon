import Widget from "resource:///com/github/Aylur/ags/widget.js";
import WallpaperImage from "./wallpaper.js";
import SystemWidget from "./onscreenwidgets/system.js";
import Normal from "./onscreenwidgets/simpleclock.js";
import Auva from "./onscreenwidgets/auva.js";
import ModuleNotificationList from "./onscreenwidgets/notificationlist.js";
// import { zaWiseCat } from "./onscreenwidgets/zaWizeCat.js";
let opts = await userOptions.asyncGet()

export default (monitor) =>
  Widget.Window({
    name: `desktopbackground${monitor}`,
    layer: "background",
    exclusivity: 'ignore',
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
            opts.desktopBackground.enableWisecat ? Widget.Box({ vertical: true, children: [zaWiseCat, Widget.Box({ vexpand: true })] }) : null
          ],
        }),
        Widget.Box({
          hpack: 'end',
          hexpand: true,
          children: [
            ModuleNotificationList({
              hexpand: true,
              hpack: 'end',
              vpack: 'center',
              css: `
              min-height:45rem;
              min-width:24rem;
              margin-right:3rem
              `
            })
          ]
        })
      ],
      setup: (self) => {
        self.set_overlay_pass_through(self.get_children()[1], true);
      },
    }),
  });
