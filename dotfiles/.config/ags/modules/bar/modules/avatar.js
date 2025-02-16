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
// Create avatar widget only once
// const createUserImage = () => {
//   const hasAvatar = Utils.readFile(avatarPath);

  // const box = Box({
  //   // className: "avatar-box",
  //   tooltipText: `This is ${userName} • Don't click`,
  //   css: hasAvatar
  //     ? `
  //           background-image: url('${avatarPath}');
  //           background-size: cover;
  //           background-position: center;
  //           min-width: 35px;
  //           min-height: 35px;
  //           border-radius: 999px;
  //       `
  //     : `
  //           min-width: 35px;
  //           min-height: 3px;
  //           border-radius: 999px;
  //       `,
  // });

//   const box = Widget.Icon({
//     icon: avatarPath,
//     size: 28,
//   });

//   if (!hasAvatar) {
//     box.child = Label({
//       label: userInitials,
//       className: "txt-smaller sec-txt txt-semibold",
//       css: "padding: 4px;",
//     });
//   }

//   return box;
// };

// Cache the widget instance
// const userImage = createUserImage();

// Export a memoized widget factory
export default () =>
  EventBox({
    // className: "avatar-eventbox",
    onPrimaryClick: () =>
      Utils.execAsync(["bash", "-c", "gjs ~/.local/bin/ags-tweaks.js"]).catch(
        print,
      ),
    onSecondaryClick: () => App.toggleWindow("sideright"),
    onMiddleClick: () => App.openWindow("overview"),
    setup: setupCursorHover,
    child: Box({
      vpack: "center",
      // className: "spacing-h-5 avatar-widget",
      children: [ Widget.Icon({
        icon: avatarPath,
        size: 28,
      })],
    }),
  });
