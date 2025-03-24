"use strict";

import Gdk from "gi://Gdk";
import GLib from "gi://GLib";
import App from "resource:///com/github/Aylur/ags/app.js";
import Wallselect from "./modules/wallselect/wallpaper_selector.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import userOptions from "./modules/.configuration/user_options.js";
import {
  firstRunWelcome,
  startBatteryWarningService,
} from "./services/messages.js";
import { startAutoDarkModeService } from "./services/darkmode.js";
import { Bar } from "./modules/bar/main.js";
import Cheatsheet from "./modules/cheatsheet/main.js";
import DesktopBackground from "./modules/desktopbackground/main.js";
import Dock from "./modules/dock/dock.js";
import Corner from "./modules/screencorners/main.js";
import Indicator from "./modules/indicators/main.js";
import Overview from "./modules/overview/main.js";
import Session from "./modules/session/main.js";
import SideLeft from "./modules/sideleft/main.js";
import SideRight from "./modules/sideright/main.js";
import Recorder from "./modules/indicators/recorder.js";
import MusicWindow from "./modules/music/main.js";
import Glance from "./modules/overview/glance.js";
// import { EmojisWindow } from "./modules/desktopbackground/onscreenwidgets/emojie.js";
// Gather all the asynchronous operations to parallelize
const startAllServices = Promise.all([
  userOptions.asyncGet(),
  firstRunWelcome(),
  startBatteryWarningService(),
  startAutoDarkModeService(),
]);
const COMPILED_STYLE_DIR = `${GLib.get_user_cache_dir()}/ags/user/generated`;

// Once all services are started, execute further logic
startAllServices
  .then(([opts]) => {
    const range = (length, start = 1) =>
      Array.from({ length }, (_, i) => i + start);

    function forMonitors(widget) {
      const n = Gdk.Display.get_default()?.get_n_monitors() || 1;
      return range(n, 0).map(widget).flat(1);
    }

    let Modules = () => [
      // EmojisWindow(),
      opts.modules.overview ? Overview() : [],
      opts.modules.indicators ? forMonitors(Indicator) : [],
      opts.modules.session ? forMonitors(Session) : [],
      opts.modules.cheatsheet ? forMonitors(Cheatsheet) : [],
      opts.modules.desktopBackground ? forMonitors(DesktopBackground) : [],
      opts.modules.dock ? forMonitors(Dock) : [],
      opts.modules.music ? forMonitors(MusicWindow) : [],
      opts.modules.recorder ? Recorder() : [],
      opts.modules.sideright ? SideRight() : [],
      opts.modules.glance ? Glance() : [],
      opts.modules.wallpaperSelector ? forMonitors(Wallselect) : [],
      opts.modules.sideleft ? SideLeft() : [],
      ...(opts.modules.fakeScreenRounding
        ? [
            forMonitors((id) =>
              Corner(id, "top left", true, opts.etc.screencorners.topleft)
            ),
            forMonitors((id) =>
              Corner(id, "top right", true, opts.etc.screencorners.topright)
            ),
            forMonitors((id) =>
              Corner(id, "bottom left", true, opts.etc.screencorners.bottomleft)
            ),
            forMonitors((id) =>
              Corner(
                id,
                "bottom right",
                true,
                opts.etc.screencorners.bottomright
              )
            ),
          ]
        : []),
    ];

    const monitors = Gdk.Display.get_default()?.get_n_monitors() || 1;
    for (let i = 0; i < monitors; i++) {
      Bar(i)
        .then(([mainBar, leftCorner, rightCorner]) => {
          App.addWindow(mainBar);
          App.addWindow(leftCorner);
          App.addWindow(rightCorner);
        })
        .catch();
    }

    App.config({
      css: `${COMPILED_STYLE_DIR}/style.css`,
      stackTraceOnError: true,
      windows: Modules().flat(1),
    });
  })
  .catch((e) => console.error(e));
