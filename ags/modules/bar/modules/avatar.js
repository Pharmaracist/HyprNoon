import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
const { Box, EventBox, Label } = Widget;
import { setupCursorHover } from "../../.widgetutils/cursorhover.js";
import GLib from "gi://GLib";
import App from "resource:///com/github/Aylur/ags/app.js";
import { selectedImage } from "../../sideright/sideright.js";
// Cache values to avoid repeated calls
const userName = GLib.get_real_name() || GLib.get_user_name();
const userInitials = userName.substring(0, 2).toUpperCase();

const avatarPath = selectedImage;
export default () =>
  EventBox({
    onPrimaryClick: () =>
      Utils.execAsync(["bash", "-c", "gjs ~/.local/bin/ags-tweaks.js"]).catch(
        print,
      ),
    onSecondaryClick: () => App.toggleWindow("sideright"),
    onMiddleClick: () => App.openWindow("overview"),
    setup: setupCursorHover,
    child: Box({
      vpack: "center",
      children: [
      Widget.Icon({
        icon: avatarPath,
        size: 28,
      })],
    }),
  });
