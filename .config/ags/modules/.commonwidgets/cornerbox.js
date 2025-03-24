import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { RoundedCorner } from "./cairo_roundedcorner.js";
import { useCorners } from "../../variables.js";
export const CornerBox = (corner, vpack, props = {}) =>
  Widget.Box({
    child: RoundedCorner(corner, {
      vpack,
      className: "corner-dock corner",
    }),
    ...props,
    setup: (self) =>
      self.hook(useCorners, () => {
        self.visible = useCorners.value ? true : false;
      }),
  });
