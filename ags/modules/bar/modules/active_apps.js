const { Gtk } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
const { Box, Button } = Widget;
import Hyprland from "resource:///com/github/Aylur/ags/service/hyprland.js";
import { setupCursorHover } from "../../.widgetutils/cursorhover.js";

const AppButton = ({ client }) => {
  // Gracefully handle invalid icon names
  const iconName = client.class
    ? `${client.class.toLowerCase()}`
    : "application-default";
  const isValidIcon = Gtk.IconTheme.get_default().has_icon(iconName);

  return Button({
    className: `bar-active-app ${client.class === Hyprland.active.client.class ? "focused" : ""}`,
    onClicked: () => {
      Utils.execAsync([
        "hyprctl",
        "dispatch",
        "focuswindow",
        `address:${client.address}`,
      ]).catch(print);
    },
    child: 
    Box({
      vertical:true,
      tooltipText: client.title || client.class || "Unknown",
      setup: setupCursorHover,
      spacing:5,
      vpack:"end",
      children:[
        Box({
          vpack:"center",
          spacing:5,
          className: "spacing-h-5 txt-norm",
          children: [
            Widget.Icon({
              icon: isValidIcon ? iconName : "windows-exe-symbolic", // Changed fallback icon
              size: 22,
            }),
            Widget.Label({
              truncate:"end",
              maxWidthChars: 10,
              className: "txt-small onSurfaceVariant",
              label: client.title || client.class || "Unknown",
            }),
          ],
        }),
        Box({vpack:"end",css:`min-width:10rem`,className:"active-window-tb"})
      ]
    })
  });
};

export default () => {
  const box = Box({
    className: "bar-active-apps spacing-h-5",
  });

  const updateApps = () => {
    const clients = Hyprland.clients;
    box.children = clients
      .filter((client) => !client.class?.includes("unset"))
      .map((client) => AppButton({ client }));
  };

  // Update the list of apps every second
  Utils.interval(1000, updateApps);

  // Initial update
  updateApps();

  return box;
};
