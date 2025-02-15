import Widget from "resource:///com/github/Aylur/ags/widget.js";
import WallpaperImage from "./wallpaper.js";
import TimeAndLaunchesWidget from "./timeandlaunches.js";
import SystemWidget from "./system.js";
import QuoteWidget from ".././bar/modules/quote.js";
import { currentShellMode } from "../../variables.js";

const wiseCat = Widget.Box({
  vpack:"start",
  children: [
    Widget.Box({child:QuoteWidget(),vpack:"center"}),  
    Widget.Button({
      vpack:"center",
      child:Widget.Icon({icon:'9',size: 120,}),
      onClicked: () =>App.toggleWindow(`sideright`)
    })
  ]
})
export default (monitor) =>
  Widget.Window({
    name: `desktopbackground${monitor}`,
    layer: "background",
    // exclusivity: 'ignore',
    visible: true,
    keymode: "on-demand",
    child: Widget.Overlay({
      child: WallpaperImage(monitor),
      overlays: [
        Widget.Box({
          css: `margin:${(() => {
            const opts = userOptions.asyncGet();
            const mode = currentShellMode.value[0] || "0";
            // Vertical mode
            if (mode === "6") {
              return opts.bar.verticalBar?.position === "left"
                ? "0 2rem"
                : "0 0 0 3rem";
            }
            // Horizontal mode
            return `0 2rem ${opts.bar.position === "bottom" ? 2.5 : 0}rem 1.5rem`;
          })()}`,
          children: [
            TimeAndLaunchesWidget(),
            Widget.Box({ hexpand: true }),
            Widget.Box({vertical:true,children:[wiseCat,Widget.Box({vexpand:true})]})
          ],
        }),
      ],
      setup: (self) => {
        self.set_overlay_pass_through(self.get_children()[1], true);
      },
    }),
  });
