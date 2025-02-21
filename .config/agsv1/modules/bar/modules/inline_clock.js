import Widget from "resource:///com/github/Aylur/ags/widget.js";
const { GLib } = imports.gi;
const options = userOptions.asyncGet();
const timeFormat = "%I:%M %P";
const dateFormat = options.time.dateFormatLong;

const time = Variable("", {
  poll: [
    options.time.interval,
    () => GLib.DateTime.new_now_local().format(timeFormat),
  ],
});

const date = Variable("", {
  poll: [
    options.time.dateInterval,
    () => GLib.DateTime.new_now_local().format(dateFormat),
  ],
});

const InLineClock = () =>
  Widget.EventBox({
    onPrimaryClick: () => {
      App.toggleWindow("sideright");
    },
    child: Widget.Box({
      vpack: "center",
      className: "onSurfaceVariant txt-bold techfont",
      tooltipText: date.bind(),
      children: [
        Widget.Label({
          css:`font-size:16.5px;`,
          className: "onSurfaceVariant txt-bold txt-monospace",
          label: time.bind(),
        }),
      ],
    }),
  });
export default () => InLineClock();
