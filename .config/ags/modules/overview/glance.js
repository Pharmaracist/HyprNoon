import Widget from "resource:///com/github/Aylur/ags/widget.js";
import PopupWindow from "../.widgethacks/popupwindow.js";
import OptionalOverview from "./overview_hyprland.js";
import clickCloseRegion from "../.commonwidgets/clickcloseregion.js";

export default (id = "") =>
  PopupWindow({
    name: `glance${id}`,
    keymode: "on-demand",
    exclusivity: "ignore",
    anchor: ["top", "left", "right"],
    child: Widget.Box({
      vertical: true,
      vexpand: true,
      children: [
        OptionalOverview(),
        userOptions.asyncGet().etc.clickCloseRegion
          ? clickCloseRegion({
              name: "glance",
              multimonitor: false,
              fillMonitor: "horizontal",
            })
          : null,
      ],
    }),
  });
