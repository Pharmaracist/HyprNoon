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

const InLineClock = (props = {}) =>
  Widget.Label({
    label: time.bind(),
    tooltipText: date.bind(),
    className: 'bar-time',
    ...props,
  });
export default () => InLineClock();
