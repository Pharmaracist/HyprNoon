import App from "resource:///com/github/Aylur/ags/app.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { monitors } from "../.commondata/hyprlanddata.js";
const { Box, EventBox } = Widget;

// Кэшируем часто используемые значения
const getMonitorDimensions = (monitor, fillMonitor) => ({
  width: fillMonitor.includes("h") ? monitors[monitor].width : 0,
  height: fillMonitor.includes("v") ? monitors[monitor].height : 0,
});

export const clickCloseRegion = ({
  name,
  multimonitor = true,
  monitor = 0,
  expand = true,
  fillMonitor = "",
}) => {
  const { width, height } = getMonitorDimensions(monitor, fillMonitor);

  return EventBox({
    child: Box({
      expand,
      css: `min-width: ${width}px; min-height: ${height}px;`,
    }),
    setup: (self) =>
      self.on("button-press-event", () =>
        multimonitor ? closeWindowOnAllMonitors(name) : App.closeWindow(name)
      ),
  });
};

export default clickCloseRegion;
