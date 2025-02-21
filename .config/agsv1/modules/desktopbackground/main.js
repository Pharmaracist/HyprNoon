import Widget from "resource:///com/github/Aylur/ags/widget.js";
import WallpaperImage from "./wallpaper.js";
import TimeAndLaunchesWidget from "./timeandlaunches.js";
import SystemWidget from "./system.js";
// import zaWiseCat from "./zaWizeCat.js";

export default (monitor) =>
  Widget.Window({
    name: `desktopbackground${monitor}`,
    layer: "background",
    exclusivity: 'ignore',
    visible: userOptions.asyncGet().desktopBackground.visible ? true : false,
    keymode: "on-demand",
    child: Widget.Overlay({
      child: WallpaperImage(monitor),
      overlays: [
        Widget.Box({
          children: [
            TimeAndLaunchesWidget(),
            Widget.Box({ hexpand: true }),
            userOptions.asyncGet().desktopBackground.resources ? SystemWidget(): null,
            // Widget.Box({vertical:true,children:[zaWiseCat,Widget.Box({vexpand:true})]})
          ],
        }),
      ],
      setup: (self) => {
        self.set_overlay_pass_through(self.get_children()[1], true);
      },
    }),
  });
