import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { StatusIcons } from "./../../.commonwidgets/statusicons.js";
import Clock from "../modules/maclock.js";
import Complex from "../modules/weather.js";
import Battery from "../modules/battery.js";
import { RoundedCorner } from "../../.commonwidgets/cairo_roundedcorner.js";
import { changeWallpaperButton } from "../modules/utils.js";
import { setupCursorHover } from "../../.widgetutils/cursorhover.js";
import scrolledmodule from "../../.commonwidgets/scrolledmodule.js";
import FocusOptionalWorkspaces from "../focus/workspaces_hyprland.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
const { Button, Label, Box } = Widget;

const CricBtn = (icon, clicked, props = {}) =>
  Button({
    child: MaterialIcon(icon, "large", {
      className: "bar-icon txt-large icon-material onSurfaceVariant",
    }),
    vpack: "center",
    onClicked: () => clicked,
    ...props,
  });
const ChatGPT = () =>
  Widget.Button({
    vpack: "center",
    hpack: "center",
    css: `padding:7px ;margin: 5px;`,
    className: "txt-large bar-util-btn2 icon-material onSurfaceVariant",
    child: Widget.Icon({ icon: "deepseek-symbolic", size: 22 }),
    onClicked: () => {
      Utils.execAsync([`xdg-open`, `https://chat.deepseek.com/`]).catch(print);
    },
    setup: setupCursorHover,
  });

const GH = () =>
  Widget.Button({
    vpack: "center",
    hpack: "center",
    css: `padding:6px ;margin: 5px;`,
    className: "txt-large bar-util-btn2 icon-material onSurfaceVariant",
    child: Widget.Icon({
      icon: "github-symbolic",
      size: 26,
    }),
    onClicked: () => {
      Utils.execAsync([`xdg-open`, `https://www.github.com/`]).catch(print);
    },
    setup: setupCursorHover,
  });

export const NotchBar = Widget.CenterBox({
  css: "padding:0 1.8rem ; margin-bottom: 1rem",
  startWidget: Widget.Box({
    vpack: "center",
    spacing: 15,
    children: [
      Battery(),
      Widget.Box({
        child: await FocusOptionalWorkspaces(),
        className: "notch-padding-h bar-util-btn2 ",
      }),
    ],
  }),
  centerWidget: Widget.Box({
    children: [
      scrolledmodule({
        children: [ChatGPT(), GH()],
      }),
      Widget.Box({
        children: [
          RoundedCorner("topright", { className: "corner" }),
          Widget.Box({
            className: "bar-notch shadow-window-light",
            hexpand: true,
            hpack: "center",
            children: [Complex()],
          }),
          RoundedCorner("topleft", { className: "corner" }),
        ],
      }),
      scrolledmodule({
        vpack: "center",
        children: [
          CricBtn("image", Utils.execAsync([`nvim`, `.ags/config.json`])),
        ],
      }),
    ],
  }),
  endWidget: Widget.Box({
    hpack: "end",
    vpack: "center",
    spacing: 10,
    children: [
      Widget.Box({
        child: Clock(),
        className: "notch-padding-h bar-util-btn2 ",
      }),
      Widget.Box({
        child: StatusIcons(),
        className: "notch-padding-h bar-util-btn2 ",
      }),
      CricBtn("power_settings_new"),
    ],
  }),
});
