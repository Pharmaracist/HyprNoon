"use strict";
import Gdk from "gi://Gdk";
import App from "resource:///com/github/Aylur/ags/app.js";
import Wallselect from "./modules/wallselect/main.js";
import userOptions from "./modules/.configuration/user_options.js";
import {
  firstRunWelcome,
  startBatteryWarningService,
} from "./services/messages.js";
import { startAutoDarkModeService } from "./services/darkmode.js";
import {Bar} from "./modules/bar/main.js";
import Cheatsheet from "./modules/cheatsheet/main.js";
import DesktopBackground from "./modules/desktopbackground/main.js";
import Dock from "./modules/dock/main.js";
import Corner from "./modules/screencorners/main.js";
import Indicator from "./modules/indicators/main.js";
import Overview from "./modules/overview/main.js";
import Session from "./modules/session/main.js";
import SideLeft from "./modules/sideleft/main.js";
import SideRight from "./modules/sideright/main.js";
import { COMPILED_STYLE_DIR } from "./init.js";

const range = (length, start = 1) =>
  Array.from({ length }, (_, i) => i + start);
function forMonitors(widget) {
  const n = Gdk.Display.get_default()?.get_n_monitors() || 1;
  return range(n, 0).map(widget).flat(1);
}

// Start stuff
handleStyles(true);
startAutoDarkModeService().catch(print);
firstRunWelcome().catch(print);
startBatteryWarningService().catch(print);

// Create bars and corners
const monitors = Gdk.Display.get_default()?.get_n_monitors() || 1;
for (let i = 0; i < monitors; i++) {
  Bar(i)
    .then(([mainBar, leftCorner, rightCorner]) => {
      App.addWindow(mainBar);
      App.addWindow(leftCorner);
      App.addWindow(rightCorner);
    })
    .catch(print);
}

const Windows = () => [
  SideLeft(),
  SideRight(),
  ...(userOptions.asyncGet().indicators.enabled !== false
    ? [forMonitors(Indicator)]
    : []),
  ...(userOptions.asyncGet().session.enabled !== false
    ? [forMonitors(Session)]
    : []),
  ...(userOptions.asyncGet().overview.enabled !== false ? [Overview()] : []),
  ...(userOptions.asyncGet().cheatsheet.enabled !== false
    ? [forMonitors(Cheatsheet)]
    : []),
  ...(userOptions.asyncGet().desktopBackground.enabled !== false
    ? [forMonitors(DesktopBackground)]
    : []),
  ...(userOptions.asyncGet().wallselect.enabled !== false
    ? [Wallselect()]
    : []),
  ...(userOptions.asyncGet().dock.enabled ? [forMonitors(Dock)] : []),
  ...(userOptions.asyncGet().appearance.fakeScreenRounding !== 0
    ? [
        forMonitors((id) => Corner(id, "top left", true)),
        forMonitors((id) => Corner(id, "top right", true)),
        forMonitors((id) => Corner(id, "bottom left", true)),
        forMonitors((id) => Corner(id, "bottom right", true)),
      ]
    : []),
];


App.config({
  css: `${COMPILED_STYLE_DIR}/style.css`,
  stackTraceOnError: true,
  windows: Windows().flat(1),
});
