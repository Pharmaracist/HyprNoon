const { GLib } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import { AnimatedCircProg } from "../../.commonwidgets/cairo_circularprogress.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";

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

  // Create a Revealer to handle the sliding effect of the resource label
  const detailRevealer = Revealer({
    transitionDuration: 300, // Adjust this value for the speed of the slide
    transition: "slide_right", // Slide to the right on reveal
    revealChild: false,
    child: resourceLabel, // The resource label is the child of the revealer
  });

  // Make the entire box clickable
  const widget = Box({
    className: "clickable-resource-module", // Optional: Add a class for styling
    children: [
      Button({
        child: Box({
          className: `spacing-h-4 ${textClassName}`,
          children: [
            Box({
              homogeneous: true,
              children: [
                Overlay({
                  child: resourceCircProg,
                  overlays: [
                    Button({
                      child:Box({
                      vpack: "center",
                      hpack: "center",
                      className: `${iconClassName}`,
                      homogeneous: true,
                      children: [MaterialIcon(icon, "smallie")],
                    }),
                    onClicked: () => {
                      // Toggle the reveal state of the resource label to trigger the sliding animation
                      detailRevealer.revealChild = !detailRevealer.revealChild;
                    },
                  })
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
                  resourceCircProg.css = `font-size: ${value}px;`;
                  resourceLabel.label = `  ${value}%`;
                  widget.tooltipText = `${name}:    ${value}%`;
                })
                .catch((error) => {
                  console.error(`Error fetching ${name} data:`, error);
                  resourceLabel.label = `Error fetching data`;
                });
            }),
        }),
        
      }),
      detailRevealer, // Add the revealer that will slide the label
    ],
  });

  return widget; // Return the clickable widget with the revealer
};

const SystemResources = () =>
  BarGroup({
    child: Box({
      children: [
        BarResource(
          "RAM Usage",
          "memory",
          `LANG=C free | awk '/^Mem/ {printf("%.2f\\n", ($3/$2) * 100)}'`,
          "bar-ram-circprog",
          "bar-ram-txt",
          "bar-ram-icon",
        ),
        Box({
          className: "spacing-h-10 margin-left-10",
          children: [
            BarResource(
              "Swap Usage",
              "swap_horiz",
              `LANG=C free | awk '/^Swap/ {if ($2 > 0) printf("%.2f\\n", ($3/$2) * 100); else print "0";}'`,
              "bar-swap-circprog",
              "bar-swap-txt",
              "bar-swap-icon",
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
      ],
    }),
  });

export default () => SystemResources();
