const { GLib } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import { AnimatedCircProg } from "../../.commonwidgets/cairo_circularprogress.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
import { RevealerState } from "./revealercontrol.js";

const { Box, Button, Overlay, Label, Revealer, ProgressBar } = Widget;

const BarGroup = ({ child }) =>
  Box({
    // className: "bar-group-margin bar-sides",
    children: [
      Box({
        // className: "bar-group bar-group-standalone bar-group-pad-system",
        children: [child],
      }),
    ],
  });

const resourceProgress = ProgressBar({
      className: 'resource-progress',
      vpack: 'center',
  });
const LinearResource = (name, icon, command) => {

    const resourceIcon = MaterialIcon(icon, 'norm', {
        className: 'resource-icon'
    });

    return Box({
        className: 'resource-bar',
        children: [
            resourceIcon,
            resourceProgress,
        ],
    });
};

const BarResource = (
  name,
  icon,
  command,
  circprogClassName,
  textClassName,
  iconClassName,
) => {
  const resourceCircProg = AnimatedCircProg({
    className: `${circprogClassName}`,
    vpack: "center",
    hpack: "center",
  });

  const resourceLabel = Label({
    className: `txt-smallie ${textClassName}`,
  });

  const detailRevealer = RevealerState.register(Revealer({
    revealChild: false,
    transition: "slide_right",
    transitionDuration: 150,
    child: resourceLabel,
  }));

  // Make the circular progress clickable
  const circProgButton = Button({
    className: "circular-progress-button",
    child: resourceCircProg,
    onClicked: () => {
      detailRevealer.revealChild = !detailRevealer.revealChild;
    },
  });

  const widget = Box({
    className: `spacing-h-5 ${textClassName}`,
    children: [
      Box({
        homogeneous: true,
        children: [
          Overlay({
            child: resourceProgress,
            overlays:[
              Box({
                vpack: "center",
                className: `${iconClassName}`,
                homogeneous: true,
                children: [MaterialIcon(icon, "small")],
              }),
            ] 
          }),
        ],
      }),
      detailRevealer,
    ],
    setup: (self) =>
      self.poll(2000, () => {
        Utils.execAsync(["bash", "-c", command])
          .then((output) => {
            const value = Math.round(Number(output));
            resourceCircProg.css = `font-size: ${value}px;`;
            resourceLabel.label = `${value}%`;
            self.tooltipText = `${name}: ${value}%`;
          })
          .catch((error) => {
            console.error(`Error fetching ${name} data:`, error);
            resourceLabel.label = `Error`;
          });
      }),
  });

  return widget;
};

const SystemResources = () =>
  BarGroup({
    child: Box({
      className: "spacing-h-10 margin-rl-5",
      children: [
        LinearResource(
          "RAM Usage",
          "memory",
          `LANG=C free | awk '/^Mem/ {printf("%.2f\\n", ($3/$2) * 100)}'`,
        ),
        BarResource(
          "CPU Usage",
          "settings_motion_mode",
          `LANG=C top -bn1 | grep Cpu | sed 's/\\,/\\./g' | awk '{print $2}'`,
          "bar-cpu-circprog",
          "bar-cpu-txt",
          "bar-cpu-icon",
        ),
      ],
    }),
  });

export default () => SystemResources();
