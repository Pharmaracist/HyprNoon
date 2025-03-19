const { Gtk, GLib } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { Variable } from "resource:///com/github/Aylur/ags/variable.js";
const timeFormat = userOptions.asyncGet().time.format;
const dateFormat = userOptions.asyncGet().time.dateFormatLong;
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
    className: "txt-large bar-clock-box",
    children: [
      Widget.Label({
        className: "bar-time",
        label: time.bind(),
        tooltipText: date.bind(),
        xalign: 0, // Left align the time
        hpack: "start"
      }),
      Widget.Label({
        className: "bar-date ",
        css:`font-size:1rem `,
        label: date.bind(),
        xalign: 0, // Right align the date
        hpack: "end"
      }),
    ],
  });
export default () =>
  Widget.Box({
    children: [simpleClock()],
  });
