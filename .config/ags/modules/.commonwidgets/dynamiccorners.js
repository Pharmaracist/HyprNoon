import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { CornerBox } from "./cornerbox.js";
const { Box } = Widget;

export const rightCorners = Box({
  visible: false,
  vertical: true,
  children: [
    CornerBox("topleft", "start"),
    Box({ vexpand: true }),
    CornerBox("bottomleft", "end"),
  ],
});

export const leftCorners = Box({
  visible: false,
  vertical: true,
  children: [
    CornerBox("topright", "start"),
    Box({ vexpand: true }),
    CornerBox("bottomright", "end"),
  ],
});
export const upperCorners = Box({
  visible: false,
  children: [
    CornerBox("bottomleft", "end"),
    Box({ hexpand: true }),
    CornerBox("bottomright", "end"),
  ],
});

export const lowerCorners = Box({
  visible: false,
  children: [
    CornerBox("topleft", "end"),
    Box({ hexpand: true }),
    CornerBox("topright", "end"),
  ],
});
