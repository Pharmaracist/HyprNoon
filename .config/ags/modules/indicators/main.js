import Widget from "resource:///com/github/Aylur/ags/widget.js";
import Indicator from "../../services/indicator.js";
import IndicatorValues from "./indicatorvalues.js";
import NotificationPopups from "./notificationpopups.js";
import ColorschemeContent from "./colorscheme.js";

export default (monitor = 0) =>
  Widget.Window({
    name: `indicator${monitor}`,
    monitor,
    anchor: ["top"],
    className: "indicator",
    layer: "overlay",
    child: Widget.EventBox({
      onHover: () => {
        Indicator.popup(-1);
      },
      child: Widget.Box({
        vertical: true,
        className: "osd-window",
        children: [
          ColorschemeContent(),
          IndicatorValues(monitor),
          NotificationPopups(),
        ],
      }),
    }),
    // setup: (self) => {
    //   self.hook(barPosition, () => {
    //     // self.anchor = [horizontalAnchor(), "left", "right"];
    //     self.exclusivity = exclusive();
    //   });
    // },
  });
