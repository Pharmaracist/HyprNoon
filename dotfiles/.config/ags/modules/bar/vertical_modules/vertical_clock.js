import Widget from "resource:///com/github/Aylur/ags/widget.js";
const { GLib } = imports.gi;
const options = userOptions.asyncGet();
const hourFormat = options.time.verticalCLock.hours;
const minuteFormat = options.time.verticalCLock.minutes;
const secondFormat = options.time.verticalCLock.seconds;
const dayTimeFormat = options.time.verticalCLock.dayTime;
const dateFormat = options.time.dateFormatLong;
const hours = Variable("", {
  poll: [
    options.time.interval,
    () => GLib.DateTime.new_now_local().format(hourFormat),
  ],
});

const minutes = Variable("", {
  poll: [
    options.time.interval,
    () => GLib.DateTime.new_now_local().format(minuteFormat),
  ],
});

const seconds = Variable("", {
  poll: [
    options.time.interval,
    () => GLib.DateTime.new_now_local().format(secondFormat),
  ],
});

const dayTime = Variable("", {
  poll: [
    options.time.interval,
    () => GLib.DateTime.new_now_local().format(dayTimeFormat),
  ],
});
const date = Variable("", {
  poll: [
    options.time.dateInterval,
    () => GLib.DateTime.new_now_local().format(dateFormat),
  ],
});

const VerticalClock = () =>
  Widget.EventBox({
    onPrimaryClick: () => {
      App.toggleWindow("sideright");
    },
    child: Widget.Box({
      vpack: "end",
      vertical: true,
      hpack:"center",
      hexpand:true,
      className:"bar-group-pad-vertical bar-group txt-large",
      css:`padding:15px 5px`,
      tooltipText:date.bind(),
      children: [
        Widget.Label({
          className: "bar-time",
          label: hours.bind(),
          xalign:0.5
        }),
        Widget.Label({
          className: "bar-time",
          label: minutes.bind(),
          xalign:0.5
        }),
        // Widget.Label({
        //   className: "bar-time",
        //   label: seconds.bind(),
        //   xalign:0
        // }),
        // Widget.Label({
        //   className: "bar-time",
        //   label: dayTime.bind(),
        //   xalign:0
        // })
      ],
    }),
  });
export default () => VerticalClock();
