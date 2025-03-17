"use strict";

import Gdk from "gi://Gdk";
import GLib from 'gi://GLib';
import App from "resource:///com/github/Aylur/ags/app.js";
import Wallselect from "./modules/wallselect/main.js";
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import userOptions from "./modules/.configuration/user_options.js";
import {
  firstRunWelcome,
  startBatteryWarningService,
} from "./services/messages.js";
import { startAutoDarkModeService } from "./services/darkmode.js";
import { Bar } from "./modules/bar/main.js";
import Cheatsheet from "./modules/cheatsheet/main.js";
import DesktopBackground from "./modules/desktopbackground/main.js";
import Dock from "./modules/dock/main.js";
import Corner from "./modules/screencorners/main.js";
import Indicator from "./modules/indicators/main.js";
import Overview from "./modules/overview/main.js";
import Session from "./modules/session/main.js";
import SideLeft from "./modules/sideleft/main.js";
import SideRight from "./modules/sideright/main.js";
import Recorder from "./modules/indicators/recorder.js";
import MusicWindow from './modules/music/main.js';
import Glance from "./modules/overview/glance.js";

const COMPILED_STYLE_DIR = `${GLib.get_user_cache_dir()}/ags/user/generated`;

// Gather all the asynchronous operations to parallelize
const startAllServices = Promise.all([
  userOptions.asyncGet(),
  firstRunWelcome(),
  startBatteryWarningService(),
  startAutoDarkModeService(),
]);

// Once all services are started, execute further logic
startAllServices
  .then(([opts]) => {
    const range = (length, start = 1) =>
      Array.from({ length }, (_, i) => i + start);

    function forMonitors(widget) {
      const n = Gdk.Display.get_default()?.get_n_monitors() || 1;
      return range(n, 0).map(widget).flat(1);
    }

    globalThis['handleStyles'] = () => {
      Utils.exec(`mkdir -p "${GLib.get_user_state_dir()}/ags/scss"`);
      let lightdark = darkMode.value;
      Utils.writeFileSync(
        `@mixin symbolic-icon { -gtk-icon-theme: '${opts.icons.symbolicIconTheme[lightdark]}'}`,
        `${GLib.get_user_state_dir()}/ags/scss/_lib_mixins_overrides.scss`
      );

      async function applyStyle() {
        Utils.exec(`mkdir -p ${COMPILED_STYLE_DIR}`);
        Utils.exec(`
          sass -I "${GLib.get_user_state_dir()}/ags/scss" "${App.configDir}/scss/main.scss" "${COMPILED_STYLE_DIR}/style.css"
        `);
        App.resetCss();
        App.applyCss(`${COMPILED_STYLE_DIR}/style.css`);
      }

      applyStyle().catch(print);
    }

    handleStyles();

    let Modules = () => [
      opts.modules.overview ? Overview() : [],
      opts.modules.indicators ? forMonitors(Indicator) : [],
      opts.modules.session ? forMonitors(Session) : [],
      opts.modules.cheatsheet ? forMonitors(Cheatsheet) : [],
      opts.modules.desktopBackground ? forMonitors(DesktopBackground) : [],
      opts.modules.wallpaperSelector ? forMonitors(Wallselect) : [],
      opts.modules.dock ? forMonitors(Dock) : [],
      opts.modules.music ? forMonitors(MusicWindow) : [],
      opts.modules.recorder ? Recorder() : [],
      opts.modules.sideright ? SideRight() : [],
      opts.modules.glance ? Glance() : [],
      opts.modules.sideleft ? SideLeft() : [],
      ...(opts.modules.fakeScreenRounding ?
        [
          forMonitors((id) => Corner(id, "top left", true, opts.etc.screencorners.topleft)),
          forMonitors((id) => Corner(id, "top right", true, opts.etc.screencorners.topright)),
          forMonitors((id) => Corner(id, "bottom left", true, opts.etc.screencorners.bottomleft)),
          forMonitors((id) => Corner(id, "bottom right", true, opts.etc.screencorners.bottomright)),
        ] : []),
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
  .catch(e => console.error(e));