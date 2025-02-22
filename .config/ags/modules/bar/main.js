import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { currentShellMode, barPosition } from "../../variables.js";
import { RoundedCorner } from "../.commonwidgets/cairo_roundedcorner.js";
import { enableClickthrough } from "../.widgetutils/clickthrough.js";
import { NormalBar } from "./modes/normal.js";
import { FocusBar } from "./modes/focus.js";
import { FloatingBar } from "./modes/floating.js";
import { MinimalBar } from "./modes/minimal.js";
import { AnoonBar } from "./modes/anoon.js";
import { WindowsTaskbar } from "./modes/windows.js";
import { VerticalBar } from "./modes/vertical.js";
import { VerticalBarPinned } from "./modes/verticalPinned.js";
import { IslandBar } from "./modes/macLike.js";
import { NotchBar } from "./modes/notch.js";
import { SaadiBar } from "./modes/saadi.js";
// Mode configuration:
const horizontalModes = new Map([
  // Normal bar with corners
  ["0", [NormalBar, true, "Normal"]],
  // Focus mode with corners
  ["1", [FocusBar, true, "Focus"]],
  // Floating bar without corners
  ["2", [FloatingBar, false, "Floating"]],
  // Minimal bar with corners
  ["3", [MinimalBar, true, "Minimal"]],
  // Anoon mode without corners
  ["4", [AnoonBar, false, "Anoon"]],
  // Windows Taskbar mode without corners
  ["5", [WindowsTaskbar, false, "Windows Taskbar"]],
  // Mac-like mode without corners
  ["6", [IslandBar, false, "Dynamic"]],
  // Notch mode without corners
  ["7", [NotchBar, false, "Notch"]],
  // Saadi mode with corners
  ["8", [SaadiBar, true, "Saadi"]],

]);

const verticalModes = new Map([
   // Floating Vertical bar
  ["9", [VerticalBar, false, "Vertical Bar"]],
   // Pinned Corners Vertical bar
  ["10", [VerticalBarPinned, true, "Vertical Bar Pinned"]],
]);

// Combined modes for easy lookup
const modes = new Map([...horizontalModes, ...verticalModes]);

const shouldShowCorners = (monitor) => {
  const mode = currentShellMode.value[monitor] || "1";
  const shouldShow = modes.get(mode)?.[1] ?? false;
  return shouldShow;
};

const getValidPosition = (mode, currentPos) => {
  const isVerticalMode = verticalModes.has(mode);
  
  if (isVerticalMode) {
    return (currentPos === 'left' || currentPos === 'right') ? currentPos : 'left';
  } else {
    return (currentPos === 'top' || currentPos === 'bottom') ? currentPos : 'top';
  }
};

const createCorner = (monitor, side) => {
  const getCornerStyle = (pos, isVert) => {
    if (isVert) {
      return pos === "left" 
        ? side === "left" ? "topleft" : "bottomleft"
        : side === "left" ? "topright" : "bottomright";
    }
    return pos === "top"
      ? side === "left" ? "topleft" : "topright"
      : side === "left" ? "bottomleft" : "bottomright";
  };

  const cornerWindow = Widget.Window({
    monitor,
    name: `barcorner${side[0]}${monitor}`,
    layer: "top",
    anchor: [
      getValidPosition(currentShellMode.value[monitor] || "1", barPosition.value),
      verticalModes.has(currentShellMode.value[monitor] || "1")
        ? side === "left" ? "top" : "bottom"
        : side
    ],
    exclusivity: "normal",
    visible: shouldShowCorners(monitor),
    child: RoundedCorner(
      getCornerStyle(
        getValidPosition(currentShellMode.value[monitor] || "1", barPosition.value),
        verticalModes.has(currentShellMode.value[monitor] || "1")
      ),
      { className: "corner" }
    ),
    setup: (self) => {
      enableClickthrough(self);
      
      const updateCorner = () => {
        const mode = currentShellMode.value[monitor] || "1";
        const pos = getValidPosition(mode, barPosition.value);
        const isVert = verticalModes.has(mode);
        const shouldShow = shouldShowCorners(monitor);

        // First update visibility
        if (shouldShow) {
          self.child = RoundedCorner(getCornerStyle(pos, isVert), { className: "corner" });
          self.anchor = [pos, isVert ? side === "left" ? "top" : "bottom" : side];
          self.show_all();
        }
        self.visible = shouldShow;
      };
      
      self.hook(currentShellMode, updateCorner);
      self.hook(barPosition, updateCorner);
    },
  });

  return cornerWindow;
};

const getAnchor = (monitor, mode) => {
  const currentPos = barPosition.value;
  const position = getValidPosition(mode, currentPos);
  
  if (position !== currentPos) {
    barPosition.value = position;
  }
  
  return verticalModes.has(mode) 
    ? [position, "top", "bottom"]
    : [position, "left", "right"];
};

export const BarCornerTopleft = (monitor = 0) => createCorner(monitor, "left");
export const BarCornerTopright = (monitor = 0) => createCorner(monitor, "right");

export const Bar = async (monitor = 0) => {
  const opts = userOptions.asyncGet();
  const mode = currentShellMode.value[monitor] || "1";

  const corners = ["left", "right"].map((side) => createCorner(monitor, side));

  const children = {};
  for (const [key, [component]] of modes) {
    try {
      children[key] = component;
    } catch (error) {
    }
  }

  const stack = Widget.Stack({
    homogeneous: false,
    transition: "slide_up_down",
    transitionDuration: opts.animations.durationSmall,
    children: children,
    setup: (self) => {
      self.hook(currentShellMode, () => {
        const newMode = currentShellMode.value[monitor] || "1";
        self.shown = newMode;
      });
      self.shown = mode;
    },
  });

  const bar = Widget.Window({
    monitor,
    name: `bar${monitor}`,
    anchor: getAnchor(monitor, mode),
    exclusivity: "exclusive",
    visible: true,
    child: stack,
    setup: (self) => {
      self.hook(currentShellMode, (w) => {
        const newMode = currentShellMode.value[monitor] || "1";
        w.anchor = getAnchor(monitor, newMode);
      });
      self.hook(barPosition, (w) => {
        const currentMode = currentShellMode.value[monitor] || "1";
        w.anchor = getAnchor(monitor, currentMode);
      });
    },
  });

  return [bar, ...corners];
};
