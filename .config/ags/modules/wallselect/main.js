import PopupWindow from "../.widgethacks/popupwindow.js";
import WallSelect from "./wallpaper_selector.js";
export default () =>
  PopupWindow({
    keymode: "on-demand",
    name: "wallselect",
    child: WallSelect(),
    setup: (self) => {
      self.hook(barPosition, () => {
        self.anchor = [horizontalAnchor(), "left", "right"];
        self.exclusivity = ["top", "bottom"].includes(barPosition.value)
          ? "normal"
          : "ignore";
      });
    },
  });
