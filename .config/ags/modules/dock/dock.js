const { Gtk, GLib } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
const { Box, Revealer, EventBox } = Widget;
import { RoundedCorner } from "./../.commonwidgets/cairo_roundedcorner.js";
import Hyprland from "resource:///com/github/Aylur/ags/service/hyprland.js";
import Applications from "resource:///com/github/Aylur/ags/service/applications.js";
import { setupCursorHover } from "../.widgetutils/cursorhover.js";
// import { checkKeybind } from "../.widgetutils/keybind.js";
import { getAllFiles } from "./icons.js";
import { substitute } from "../.miscutils/icons.js";
import { getValidIcon } from "../.miscutils/icon_handling.js";
import { toggleDockMode } from "../../variables.js";
import { getDistroIcon } from "../.miscutils/system.js";
let opts = await userOptions.asyncGet();

// let anchor, className, c1, c2;
let dockSize = opts.dock.dockSize;
let appSpacing = dockSize / 30;

const icon_files = opts.icons.searchPaths.map((e) => getAllFiles(e)).flat(1);
let isPinned = false;
let cachePath = new Map();
let timers = [];

function clearTimes() {
  timers.forEach((e) => GLib.source_remove(e));
  timers = [];
}

function ExclusiveWindow(client) {
  const fn = [
    (client) => !(client !== null && client !== undefined),
    // Jetbrains
    (client) => client.title.includes("win"),
    // Vscode
    (client) => client.title === "" && client.class === "",
  ];

  for (const item of fn) {
    if (item(client)) {
      return true;
    }
  }
  return false;
}

const focus = ({ address }) =>
  Utils.execAsync(`hyprctl dispatch focuswindow address:${address}`).catch(
    print
  );

const getIconPath = (appClass, fromCache = true) => {
  return getValidIcon(appClass, icon_files, fromCache, cachePath);
};

const DockSeparator = () =>
  Box({
    setup: (self) => {
      self.hook(dockMode, () => {
        self.className = dockMode.value
          ? "spacing-v--10 dock-separator-vertical"
          : "dock-separator spacing-h-15 ";
      });
    },
  });

const PinButton = () =>
  Widget.EventBox({
    tooltipText: "Pin Dock",
    hpack: "center",
    child: Widget.Box({
      css: "margin:0.4rem 0.3rem",
      homogeneous: true,
      child: Widget.Icon({
        icon: getDistroIcon(),
        size: dockSize * 0.9,
      }),
    }),
    onSecondaryClick: () => {
      toggleDockMode();
    },
    onPrimaryClick: (self) => {
      isPinned = !isPinned;
      let win = App.getWindow("dock");
      if (win) {
        win.exclusivity = isPinned ? "exclusive" : "normal";
      }
      self.className = `${
        isPinned
          ? "pinned-dock-app-btn dock-app-btn-animate"
          : "unpinned-dock-app-btn dock-app-btn-animate"
      }`;
    },
    setup: setupCursorHover,
  });
const AppButton = ({ icon, ...rest }) =>
  Widget.Revealer({
    attribute: {
      workspace: 0,
    },
    revealChild: false,
    transition: "crossfade",
    transitionDuration: opts.animations.durationLarge,
    child: Widget.Button({
      ...rest,
      className: "dock-app-btn dock-app-btn-animate",
      hpack: "center",
      child: Widget.Box({
        spacing: appSpacing + 10,
        child: Widget.Overlay({
          child: Widget.Box({
            spacing: appSpacing + 10,
            homogeneous: true,
            className: "dock-app-icon",
            child: Widget.Icon({
              icon: icon,
              size: dockSize + 5,
            }),
          }),
          overlays: [
            Widget.Box({
              class_name: "indicator",
              vpack: "end",
              hpack: "center",
            }),
          ],
        }),
      }),
      setup: (self) => {
        self.hook(dockMode, () => {
          self.vertical = dockMode.value;
        });

        setupCursorHover(self);
      },
    }),
  });
const Taskbar = (monitor) =>
  Widget.Box({
    className: "dock-apps",
    attribute: {
      monitor: monitor,
      map: new Map(),
      clientSortFunc: (a, b) => {
        return a.attribute.workspace > b.attribute.workspace;
      },
      update: (box, monitor) => {
        for (let i = 0; i < Hyprland.clients.length; i++) {
          const client = Hyprland.clients[i];
          if (client["pid"] == -1) return;
          const appClass = substitute(client.class);
          const path = getIconPath(appClass);
          const newButton = AppButton({
            icon: path,
            tooltipText: `${client.title} (${appClass})`,
            onClicked: () => focus(client),
          });
          newButton.attribute.workspace = client.workspace.id;
          newButton.revealChild = true;
          box.attribute.map.set(client.address, newButton);
        }
        box.children = Array.from(box.attribute.map.values());
      },
      add: (box, address, monitor) => {
        if (!address) {
          box.attribute.update(box);
          return;
        }
        const newClient = Hyprland.clients.find((client) => {
          return client.address == address;
        });
        if (ExclusiveWindow(newClient)) {
          return;
        }
        const appClass = newClient.class;
        const path = getIconPath(appClass);
        const newButton = AppButton({
          icon: path,
          tooltipText: `${newClient.title} (${appClass})`,
          onClicked: () => focus(newClient),
        });
        newButton.attribute.workspace = newClient.workspace.id;
        box.attribute.map.set(address, newButton);
        box.children = Array.from(box.attribute.map.values());
        newButton.revealChild = true;
      },
      remove: (box, address) => {
        if (!address) return;

        const removedButton = box.attribute.map.get(address);
        if (!removedButton) return;
        removedButton.revealChild = false;

        Utils.timeout(opts.animations.durationLarge, () => {
          removedButton.destroy();
          box.attribute.map.delete(address);
          box.children = Array.from(box.attribute.map.values());
        });
      },
    },
    setup: (self) => {
      self.hook(dockMode, () => {
        self.vertical = dockMode.value;
      });

      self
        .hook(
          Hyprland,
          (box, address) => box.attribute.add(box, address, self.monitor),
          "client-added"
        )
        .hook(
          Hyprland,
          (box, address) => box.attribute.remove(box, address, self.monitor),
          "client-removed"
        );
      Utils.timeout(100, () => self.attribute.update(self));
    },
  });

const PinnedApps = () =>
  Widget.Box({
    class_name: "dock-apps",
    homogeneous: true,
    children: opts.dock.pinnedApps
      .map((term) => ({ app: Applications.query(term)?.[0], term }))
      .filter(({ app }) => app)
      .map(({ app, term = true }) => {
        const icon = opts.dock.searchPinnedAppIcons
          ? getIconPath(app.name, false) // Don't use cache for pinned apps
          : app.icon_name || getIconPath(app.name, false);

        const newButton = AppButton({
          icon: icon,
          onClicked: () => {
            for (const client of Hyprland.clients) {
              if (client.class.toLowerCase().includes(term))
                return focus(client);
            }
            app.launch();
          },
          onMiddleClick: () => app.launch(),
          tooltipText: app.name,
          setup: (self) => {
            self.revealChild = true;
            self.hook(
              Hyprland,
              (button) => {
                const running =
                  Hyprland.clients.find((client) =>
                    client.class.toLowerCase().includes(term)
                  ) || false;

                button.toggleClassName("notrunning", !running);
                button.toggleClassName(
                  "focused",
                  Hyprland.active.client.address == running?.address
                );
                button.set_tooltip_text(running ? running.title : app.name);
              },
              "notify::clients"
            );
          },
        });
        newButton.revealChild = true;
        return newButton;
      }),
    setup: (self) => {
      self.hook(dockMode, () => {
        self.vertical = dockMode.value;
      });
    },
  });
const topCorner = RoundedCorner("bottomright", {
  hpack: "end",
  vpack: "end",
  className: "corner-amberoled corner",
});
const bottomCorner = RoundedCorner("topright", {
  className: "corner-amberoled corner",
  hpack: "end",
  vpack: "end",
});
const bottomLeftCorner = RoundedCorner("bottomleft", {
  className: "corner-amberoled corner",
  vpack: "end",
});

const Dock = (monitor = 0) => {
  const dockContent = Box({
    vpack: "center",
    children: [
      topCorner,
      Box({
        hpack: "center",
        children: [PinButton(), PinnedApps(), DockSeparator(), Taskbar()],
        setup: (self) => {
          self.hook(dockMode, () => {
            if (dockMode.value) {
              // If dockMode is true
              self.hook(useCorners, () => {
                if (useCorners.value) {
                  self.className = "dock-bg dock-round-vertical";
                } else {
                  self.className = "dock-bg elevation sidebar-round";
                }
              });
              self.vertical = true;
            } else {
              // If dockMode is not true
              self.hook(useCorners, () => {
                if (useCorners.value) {
                  self.className = "dock-bg dock-round-top";
                } else {
                  self.className = "dock-bg elevation sidebar-round";
                }
              });
              self.vertical = false;
            }
          });
        },
      }),
      bottomCorner,
      bottomLeftCorner,
    ],
    setup: (self) => {
      self.hook(dockMode, () => {
        if (dockMode.value) {
          self.vertical = true;
          bottomCorner.visible = true;
          bottomLeftCorner.visible = false;
        } else {
          self.vertical = false;
          bottomCorner.visible = false;
          bottomLeftCorner.visible = true;
        }
        self.hook(useCorners, () => {
          if (dockMode.value) {
            topCorner.visible = useCorners.value;
            bottomCorner.visible = useCorners.value;
            bottomLeftCorner.visible = false;
          } else {
            topCorner.visible = useCorners.value;
            bottomCorner.visible = false;
            bottomLeftCorner.visible = useCorners.value;
          }
        });
      });
    },
  });
  const dockRevealer = Revealer({
    attribute: {
      updateShow: (self) => {
        // I only use mouse to resize. I don't care about keyboard resize if that's a thing
        if (opts.dock.monitorExclusivity)
          self.revealChild = Hyprland.active.monitor.id === monitor;
        else self.revealChild = true;

        return self.revealChild;
      },
    },
    revealChild: false,
    transition: "crossfade",
    transitionDuration: opts.animations.durationSmall,
    child: dockContent,
    setup: (self) => {
      const callback = (self, trigger) => {
        if (!opts.dock.trigger.includes(trigger)) return;
        const flag = self.attribute.updateShow(self);

        if (flag) clearTimes();

        const hidden = opts.dock.autoHide.find((e) => e["trigger"] === trigger);

        if (hidden) {
          let id = Utils.timeout(hidden.interval, () => {
            if (!isPinned) {
              self.revealChild = false;
            }
            timers = timers.filter((e) => e !== id);
          });
          timers.push(id);
        }
      };

      self
        // .hook(Hyprland, (self) => self.attribute.updateShow(self))
        .hook(Hyprland.active.workspace, (self) =>
          callback(self, "workspace-active")
        )
        .hook(Hyprland.active.client, (self) => callback(self, "client-active"))
        .hook(
          Hyprland,
          (self) => callback(self, "client-added"),
          "client-added"
        )
        .hook(
          Hyprland,
          (self) => callback(self, "client-removed"),
          "client-removed"
        );
    },
  });
  return EventBox({
    onHover: () => {
      dockRevealer.revealChild = true;
      clearTimes();
    },
    child: Box({
      homogeneous: true,
      css: `min-height: ${opts.dock.hiddenThickness}px;`,
      children: [dockRevealer],
    }),
    setup: (self) =>
      self.on("leave-notify-event", () => {
        if (!isPinned) dockRevealer.revealChild = false;
        clearTimes();
      }),
  });
};

export default (monitor = 0) =>
  Widget.Window({
    monitor,
    name: `dock`,
    child: Dock(monitor),
    layer: "overlay",
    anchor: ["bottom"],
    setup: (self) => {
      self.hook(dockMode, () => {
        if (dockMode.value) {
          self.hook(barPosition, () => {
            self.anchor = ["right"]; // [antiVerticalAnchor()]; Todo
          });
        } else {
          self.hook(barPosition, () => {
            self.anchor = ["bottom"];
          });
        }
      });
    },
  });
