import Widget from "resource:///com/github/Aylur/ags/widget.js";
import PopupWindow from "../.widgethacks/popupwindow.js";
import OptionalOverview from "./overview_hyprland.js";

export default (id = "") =>
  PopupWindow({
    name: `glance${id}`,
    anchor: ["left", "right"],
    keymode: "on-demand",
    hexpand: true,
    child: OptionalOverview(),
  });
