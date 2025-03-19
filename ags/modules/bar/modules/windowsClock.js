const { Gtk, GLib } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { Variable } from "resource:///com/github/Aylur/ags/variable.js";
const timeFormat = "%I:%M %P";
const dateFormat = "%d/%m/%Y";
const { EventBox } = Widget;
const time = new Variable("", {
  poll: [1000, () => GLib.DateTime.new_now_local().format(timeFormat)],
});

const date = new Variable("", {
  poll: [1000, () => GLib.DateTime.new_now_local().format(dateFormat)],
});

const simpleClock = () =>
  Widget.Box({
    vpack: "center",
    vertical: true,
    className: "onSurface",
    children: [
      Widget.Label({
        className: "onSurface",
        label: time.bind(),
        css:`font-size:13px`,
        tooltipText: date.bind(),
      }),
      Widget.Label({
        className: "onSurface",
        css:`font-size:13px`,
        label: date.bind(),
      }),
    ],
  });
export default () =>
  Widget.Box({
    children: [simpleClock()],
  });
