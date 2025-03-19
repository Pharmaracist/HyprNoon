const { Gdk, Gtk } = imports.gi;
import App from "resource:///com/github/Aylur/ags/app.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import GLib from "gi://GLib";
import Applications from "resource:///com/github/Aylur/ags/service/applications.js";
const { exec } = Utils;
import {
  expandTilde,
  hasUnterminatedBackslash,
  couldBeMath,
  ls,
} from "./miscfunctions.js";
import {
  CalculationResultButton,
  CustomCommandButton,
  DirectoryButton,
  DesktopEntryButton,
  ExecuteCommandButton,
  SearchButton,
  AiButton,
  NoResultButton,
} from "./searchbuttons.js";
import { checkKeybind } from "../.widgetutils/keybind.js";
import { writable, waitLastAction } from "../.miscutils/store.js";
import { RoundedCorner } from "../.commonwidgets/cairo_roundedcorner.js";

let opts = userOptions.asyncGet();
const MAX_RESULTS = opts.overview.maxResults;

const OptionalOverview = async () => {
  try {
    return (await import("./overview_hyprland.js")).default();
  } catch {
    return Widget.Box({});
  }
};

const overviewContent = await OptionalOverview();
const entryTheme = opts.overview.spotlightTheme
  ? "overview-search-box-spotlight"
  : "overview-search-box";

let monitors = [];
let waitToRereadDesktop = null;

const watchersOption = writable([]);
watchersOption.subscribe((paths) => {
  for (const monitor of monitors) {
    monitor.cancel();
  }
  monitors = [];
  for (const path of paths) {
    const monitor = Utils.monitorFile(expandTilde(path), () => {
      waitToRereadDesktop = waitLastAction(waitToRereadDesktop, 500, () => {
        Applications.reload();
        waitToRereadDesktop = null;
      });
    });
    if (monitor !== null) {
      monitors.push(monitor);
    }
  }
});
userOptions.subscribe((n) => {
  watchersOption.set(n.search.watchers ?? []);
});

export const SearchAndWindows = () => {
  let _appSearchResults = [];
  const options = opts;

  const resultsBox = Widget.Box({
    className: "overview-search-results shadow-window",
    css: `margin-top:0.3rem`,
    vertical: true,
    vexpand: true,
  });

  const resultsRevealer = Widget.Revealer({
    transitionDuration: options.animations.durationHuge,
    revealChild: false,
    transition: "slide_down",
    hpack: "center",
    vexpand: true,
    child: resultsBox,
  });

  const entryPromptRevealer = Widget.Revealer({
    transition: "crossfade",
    transitionDuration: options.animations.durationHuge,
    revealChild: true,
    hexpand: true,
    hpack: "start",
    vpack: "start",
    child: Widget.Label({
      className: "overview-search-prompt txt-small",
      css: `margin-top:1rem`,
      label: options.overview.useNameInPrompt
        ? getString(`hi ${GLib.get_real_name()} ! Wanna Dive!`)
        : getString(`Start The Journey`) || null,
    }),
  });

  const entryIconRevealer = Widget.Revealer({
    transition: "crossfade",
    transitionDuration: options.animations.durationHuge,
    revealChild: false,
    hpack: "end",
    child: Widget.Label({
      className: "txt txt-large icon-material overview-search-icon",
      label: "search",
    }),
  });
  const entryIcon = Widget.Box({
    className: "overview-search-prompt-box",
    setup: (box) => box.pack_start(entryIconRevealer, true, true, 0),
  });
  const entry = Widget.Entry({
    className: `shadow-window txt-small txt ${entryTheme}`,
    hpack: "center",
    onAccept: () => {
      resultsBox.children[0]?.onClicked();
    },
    onChange: (entry) => {
      const text = entry.text;
      const isAction = text[0] === ">";
      const isDir = ["/", "~"].includes(text[0]);

      resultsBox.get_children().forEach((ch) => ch.destroy());

      if (!text) {
        resultsRevealer.revealChild = false;
        overviewContent.revealChild = true;
        entryPromptRevealer.revealChild = true;
        entryIconRevealer.revealChild = false;
        entry.toggleClassName("overview-search-box-extended", false);
        return;
      }

      resultsRevealer.revealChild = true;
      overviewContent.revealChild = false;
      entryPromptRevealer.revealChild = false;
      entryIconRevealer.revealChild = true;
      entry.toggleClassName("overview-search-box-extended", true);

      _appSearchResults = Applications.query(text);

      if (options.search.enableFeatures.mathResults && couldBeMath(text)) {
        try {
          resultsBox.add(
            CalculationResultButton({
              result: eval(text.replace(/\^/g, "**")),
              text,
            })
          );
        } catch {}
      }

      if (options.search.enableFeatures.directorySearch && isDir) {
        ls({ path: text, silent: true }).forEach((item) =>
          resultsBox.add(DirectoryButton(item))
        );
      }

      if (options.search.enableFeatures.actions && isAction) {
        resultsBox.add(CustomCommandButton({ text }));
      }

      _appSearchResults
        .slice(0, MAX_RESULTS)
        .forEach((app) => resultsBox.add(DesktopEntryButton(app)));

      if (
        options.search.enableFeatures.commands &&
        !isAction &&
        !hasUnterminatedBackslash(text) &&
        exec(`bash -c "command -v ${text.split(" ")[0]}"`) !== ""
      ) {
        resultsBox.add(
          ExecuteCommandButton({
            command: text,
            terminal: text.startsWith("sudo"),
          })
        );
      }
      if (options.search.enableFeatures.aiSearch)
        resultsBox.add(AiButton({ text }));
      if (options.search.enableFeatures.webSearch)
        resultsBox.add(SearchButton({ text }));
      if (resultsBox.children.length === 0) resultsBox.add(NoResultButton());
      resultsBox.show_all();
    },
  });

  const SpotlightEntry = () =>
    Widget.Box({
      vertical: true,
      css: `margin-top:250px`,
      hpack: "center",
      vpack: "center",
      children: [
        Widget.Box({
          hpack: "center",
          children: [
            entry,
            entryIcon,
            Widget.Box({
              hpack: "start",
              className: "overview-search-icon-box",
              setup: (box) =>
                box.pack_start(entryPromptRevealer, true, true, 0),
            }),
          ],
        }),
      ],
    });

  const EntryBarContent = () =>
    Widget.Box({
      vertical: true,
      hpack: "fill",
      children: [
        Widget.Box({
          hpack: "fill",
          children: [
            RoundedCorner("topright", {
              vpack: "start",
              className: "corner corner-colorscheme",
            }),
            entry,
            entryIcon,
            Widget.Box({
              hexpand: true,
              className: "overview-search-icon-box",
              setup: (box) =>
                box.pack_start(entryPromptRevealer, true, true, 0),
            }),
            RoundedCorner("topleft", {
              vpack: "start",
              className: "corner corner-colorscheme",
            }),
          ],
        }),
      ],
    });

  return Widget.Box({
    vertical: true,
    hpack: "center",
    children: [
      Widget.Box({
        hpack: "center",
        hexpand: true,
        vertical: true,
        children: [
          opts.overview.spotlightTheme ? SpotlightEntry() : EntryBarContent(),
          resultsRevealer,
        ],
      }),
    ],
    setup: (self) =>
      self
        .hook(App, (_b, name, visible) => {
          if (name === "overview" && !visible) {
            resultsBox.children = [];
            entry.set_text("");
          }
        })
        .on("key-press-event", (widget, event) => {
          const keyval = event.get_keyval()[1];
          const modstate = event.get_state()[1];

          if (checkKeybind(event, options.keybinds.overview.altMoveLeft))
            entry.set_position(Math.max(entry.get_position() - 1, 0));
          else if (checkKeybind(event, options.keybinds.overview.altMoveRight))
            entry.set_position(
              Math.min(entry.get_position() + 1, entry.get_text().length)
            );
          else if (checkKeybind(event, options.keybinds.overview.deleteToEnd)) {
            const pos = entry.get_position();
            entry.set_text(entry.get_text().slice(0, pos));
            entry.set_position(pos);
          } else if (
            !(modstate & Gdk.ModifierType.CONTROL_MASK) &&
            keyval >= 32 &&
            keyval <= 126 &&
            widget !== entry
          ) {
            Utils.timeout(1, () => {
              entry.grab_focus();
              entry.set_text(entry.text + String.fromCharCode(keyval));
              entry.set_position(-1);
            });
          }
        }),
  });
};
