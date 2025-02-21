import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import { AnimatedCircProg } from "../../.commonwidgets/cairo_circularprogress.js";

const { Box, Button, Overlay, Label, Revealer } = Widget;

const BarGroup = ({ child }) =>
  Box({
    className: "bar-group-margin bar-sides",
    children: [
      Box({
        className: "bar-group bar-group-standalone bar-group-pad-system",
        children: [child],
      }),
    ],
  });

const BarResource = (name, icon, command, classNames, isTemperature = false) => {
  const [circprogClass, textClass, iconClass] = classNames;
  const resourceCircProg = AnimatedCircProg({ className: circprogClass, vpack: "center", hpack: "center" });
  const resourceLabel = Label({ className: `txt-smallie ${textClass}` });
  const detailRevealer = Revealer({
    transitionDuration: userOptions.asyncGet().animations.durationSmall | 300,
    transition: "slide_up",
    revealChild: true,
    hpack: "center",
    vpack: "center",
    child: resourceLabel,
  });

  return Box({
    className: "clickable-resource-module",
    vertical: true,
    spacing: 5,
    children: [
      Button({
        child: Box({
          vertical: true,
          className: `spacing-h-4 ${textClass}`,
          children: [
            Box({
              homogeneous: true,
              children: [
                Overlay({
                  child: Box({ vpack: "center", className: iconClass, homogeneous: true, children: [resourceCircProg] }),
                  overlays: [
                    Button({
                      child: Label({ label: icon, className: "txt-small icon-material" }),
                      onClicked: () => (detailRevealer.revealChild = !detailRevealer.revealChild),
                    }),
                  ],
                }),
              ],
            }),
          ],
          setup: (self) =>
            self.poll(5000, () => {
              Utils.execAsync(["bash", "-c", command])
                .then((output) => {
                  const value = Math.round(Number(output));
                  const unit = isTemperature ? "°" : "%";
                  resourceCircProg.css = `font-size: ${value}px;`;
                  resourceLabel.label = `${value}${unit}`;
                  self.tooltipText = `${name}: ${value}${unit}`;
                })
                .catch((error) => {
                  console.error(`Error fetching ${name} data:`, error);
                  resourceLabel.label = `Error`;
                });
            }),
        }),
      }),
      detailRevealer,
    ],
  });
};

const SystemResources = () =>
  BarGroup({
    child: Box({
      vertical: true,
      vpack: "center",
      spacing: 15,
      children: [
        BarResource("CPU Usage", "settings_motion_mode", `LANG=C top -bn1 | grep Cpu | sed 's/\\,/\\./g' | awk '{print $2}'`, ["bar-cpu-circprog", "bar-cpu-txt", "bar-cpu-icon"]),
        BarResource(
          "CPU Temprature",
          "thermostat",
          `sensors | grep -E 'Core [0-9]+:' | awk '{print $3}' | sed 's/°C//' | sed 's/\+//' | cut -d'.' -f1 | grep -oE '^[0-9]+$' | awk '{sum+=$1; count++} END {if (count > 0) print int(sum/count); else print 0}'`,
          ["bar-cpu-circprog", "bar-cpu-txt", "bar-cpu-icon"],
          true
        ),
        BarResource("RAM Usage", "memory", `LANG=C free | awk '/^Mem/ {printf("%.2f\\n", ($3/$2) * 100)}'`, ["bar-ram-circprog", "bar-ram-txt", "bar-ram-icon"]),
      ],
    }),
  });

export default () => SystemResources();
