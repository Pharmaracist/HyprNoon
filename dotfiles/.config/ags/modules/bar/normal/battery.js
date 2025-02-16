import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import Battery from "resource:///com/github/Aylur/ags/service/battery.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
import { AnimatedCircProg } from "../../.commonwidgets/cairo_circularprogress.js";
const { Box, Label, Button, Overlay, Revealer, Scrollable, Stack, EventBox } =
  Widget;
const { exec, execAsync } = Utils;
const { GLib } = imports.gi;

const options = userOptions.asyncGet();
const WEATHER_CACHE_FOLDER = `${GLib.get_user_cache_dir()}/ags/weather`;
const WEATHER_CACHE_PATH = WEATHER_CACHE_FOLDER + "/wttr.in.txt";
Utils.exec(`mkdir -p ${WEATHER_CACHE_FOLDER}`);

const BRIGHTNESS_STEP = 0.05;

const batteryProgressCache = new Map();
const BarBatteryProgress = () => {
  const _updateProgress = (circprog) => {
    const percent = Battery.percent;
    const key = `${percent}-${Battery.charged}`;

    if (!batteryProgressCache.has(key)) {
      const css = `font-size: ${Math.abs(percent)}px;`;
      batteryProgressCache.set(key, css);
    }

    circprog.css = batteryProgressCache.get(key);
    circprog.toggleClassName(
      "bar-batt-circprog-low",
      percent <= options.battery.low,
    );
    circprog.toggleClassName("bar-batt-circprog-full", Battery.charged);
    circprog.toggleClassName("bar-batt-charging", Battery.charging); // Add charging state class
  };

  return AnimatedCircProg({
    className: "bar-batt-circprog",
    vpack: "center",
    hpack: "center",
    extraSetup: (self) => self.hook(Battery, _updateProgress),
  });
};

const BarBattery = () => {
  let isRevealed = false;

  // Create Revealer only once
  const percentageRevealer = Revealer({
    transitionDuration: options.animations.durationLarge,
    transition: "slide_right",
    revealChild: false, // Initially hidden
    child: Label({
      className: "bar-batt-percent",
      css: "margin-left: 8px;",
      setup: (self) => self.hook(Battery, () => {
        const chargingText = Battery.charging ? "" : " ";
        self.label = `${Battery.percent}% ${chargingText} `;
      }),
    }),
  });

  const handleScroll = (direction) => {
    execAsync(`brightnessctl set ${direction > 0 ? "10%+" : "10%-"}`);
  };

  return Box({
    className: "spacing-h-10 bar-batt-txt",
    children: [
      EventBox({
        onScrollUp: () => handleScroll(1), // Increase brightness
        onScrollDown: () => handleScroll(-1), // Decrease brightness
        onPrimaryClick: () => {
          isRevealed = !isRevealed;
          percentageRevealer.revealChild = isRevealed;
        },
        child: Box({
          className: "bar-batt-container",
          children: [
            Overlay({
              child: Box({
                vpack: "center",
                className: "bar-batt",
                homogeneous: true,
                children: [MaterialIcon("", "large")],
                setup: (self) =>
                  self.hook(Battery, (box) => {
                    box.toggleClassName(
                      "bar-batt-low",
                      Battery.percent <= userOptions.asyncGet().battery.low,
                    );
                    box.toggleClassName("bar-batt-full", Battery.charged);
                    box.toggleClassName("bar-batt-charging", Battery.charging); // Add charging state class
                  }),
              }),
              overlays: [BarBatteryProgress()],
            }),
          ],
        }),
      }),
      percentageRevealer, // Revealer added only once
    ],
  });
};

const BatteryModule = () =>
  Box({
    className: "spacing-h-4",
    children: [
      Stack({
        transition: "slide_up_down",
        transitionDuration: userOptions.asyncGet().animations.durationLarge,
        children: {
          laptop: BarBattery(),
          hidden: Widget.Box({}),
        },
        setup: (stack) => {
          stack.hook(globalThis.devMode, () => {
            if (globalThis.devMode.value) {
              stack.shown = "laptop";
            } else {
              if (!Battery.available) stack.shown = "hidden";
              else stack.shown = "laptop";
            }
          });
        },
      }),
    ],
  });

export default () =>
  Widget.EventBox({
    onScrollUp: () => handleScroll(1),
    onScrollDown: () => handleScroll(-1),
    child: Widget.Box({
      children: [BatteryModule()],
    }),
  });
