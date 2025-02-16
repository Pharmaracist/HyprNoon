import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import { showMusicControls } from "../../../variables.js";
const { Box, Label, EventBox } = Widget;
const { GLib } = imports.gi;
import fetcher from "./fetcher.js";
const options = userOptions.asyncGet();
const timeFormat = "%a %b %d    %I:%M";

const time = Variable("", {
  poll: [
    options.time.interval,
    () => GLib.DateTime.new_now_local().format(timeFormat),
  ],
});

const MaClock = () =>
  Widget.Box({
    child: Widget.Box({
      vpack: "center",
      className: "spacing-h-4 bar-clock-box txt-norm",
      children: [
        Widget.Label({
          className: "bar-time",
          label: time.bind(),
        }),
      ],
    }),
  });

export default () =>
  Widget.EventBox({
    onPrimaryClick: () => App.toggleWindow("sideright"),
    onSecondaryClick: () => App.toggleWindow("wallselect"),
    onMiddleClick: () => {
      Utils.execAsync(["hyprpicker", "-a"]).catch(print);
    },
    child: Widget.Box({
      children: [MaClock(), ],
    }),
  });
