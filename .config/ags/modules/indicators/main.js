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
    child: Widget.EventBox({
      onHover: () => {
        Indicator.popup(-1);
      },
      child: Widget.Box({
        vertical: true,
        children: [
          ColorschemeContent(monitor),
          IndicatorValues(monitor),
          NotificationPopups(),
        ],
      }),
    }),
    setup: (self) => {
      self.hook(barPosition, () => {
        if (horizontalAnchor() === "top") {
          self.exclusivity = "normal";
        } else {
          self.exclusivity = "ignore";
        }
      });
    },
  });
