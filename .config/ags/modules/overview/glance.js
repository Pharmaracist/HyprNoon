import Widget from "resource:///com/github/Aylur/ags/widget.js";
import PopupWindow from "../.widgethacks/popupwindow.js";
import OptionalOverview from "./overview_hyprland.js";
import clickCloseRegion from "../.commonwidgets/clickcloseregion.js";

export default (id = "") =>
  PopupWindow({
    name: `glance${id}`,
    keymode: "on-demand",
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
    setup: (self) => {
      self.hook(barPosition, () => {
        self.anchor = [horizontalAnchor(), "left", "right"];
        self.exclusivity = ["top", "bottom"].includes(barPosition.value)
          ? "normal"
          : "ignore";
      });
    },
  });
