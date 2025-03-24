const { Gtk, GLib } = imports.gi;
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import Hyprland from "resource:///com/github/Aylur/ags/service/hyprland.js";
import Variable from "resource:///com/github/Aylur/ags/variable.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js"; // using MaterialIcon for category icons
import PopupWindow from "../../.widgethacks/popupwindow.js";
import { CornerBox } from "../../.commonwidgets/cornerbox.js";
// Read emoji data from the config directory (adjust path as needed)
const jsonData = Utils.readFile(
  `${GLib.get_home_dir()}/.config/ags/assets/emoji.json`
);
let current_window;
const current_page = Variable("recent");

const RECENT_EMOJI_FILE = GLib.build_filenamev([
  GLib.get_home_dir(),
  ".cache",
  "recent_emoji.json",
]);

// Return {} if the file is empty or invalid JSON
function readRecentEmoji() {
  try {
    const data = Utils.readFile(RECENT_EMOJI_FILE);
    if (!data || data.trim() === "") {
      return {};
    }
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

function writeRecentEmoji(recentValue) {
  const data = JSON.stringify(recentValue, null, 2);
  Utils.writeFile(data, RECENT_EMOJI_FILE);
}

function addRecentEmoji(name, emoji) {
  recent.value[name] = emoji;
  recent.setValue(moveItemsToFront(name, recent.value));
  writeRecentEmoji(recent.value);
}

const recent = Variable(readRecentEmoji());

const emojiData = JSON.parse(jsonData);

function extractEmojis(data) {
  const emojis = {};
  Object.values(data).forEach((subgroup) => {
    Object.values(subgroup).forEach((emojiGroup) => {
      Object.entries(emojiGroup).forEach(([key, value]) => {
        emojis[key] = value;
      });
    });
  });
  return emojis;
}

function moveItemsToFront(item, arr) {
  let newArr = {};
  newArr[item] = arr[item];
  for (let key in arr) {
    if (key !== item) newArr[key] = arr[key];
  }
  return newArr;
}

// Using the same category icon names
const CATEGORY_ICONS = {
  "smileys-emotion": "mood",
  "people-body": "emoji_people",
  "animals-nature": "pets",
  "food-drink": "emoji_food_beverage",
  "travel-places": "emoji_transportation",
  activities: "sports_soccer",
  objects: "emoji_objects",
  symbols: "emoji_symbols",
  flags: "flag",
};

export async function OpenEmojiPicker() {
  current_page.setValue("recent");
  if (current_window) {
    const currentWorkspace = Hyprland.active.workspace.id;
    const _client = Hyprland.clients.find((client) => {
      return (
        client.class === "com.github.Aylur.ags" &&
        client.title === "Emoji Picker"
      );
    });
    if (_client && currentWorkspace !== _client.workspace.id) {
      current_window.hide();
      current_window.show();
    } else {
      current_window.show();
    }
  } else {
    EmojisWindow();
  }
}

globalThis.OpenEmojiPicker = OpenEmojiPicker;

function searchString(str, keywords) {
  const searchTerms = keywords.split(" ");
  for (let term of searchTerms) {
    if (!str.toLowerCase().includes(term.toLowerCase())) {
      return false;
    }
  }
  return true;
}

function RecentPage() {
  const emojiList = extractEmojis(emojiData);
  const box = Widget.Box({
    vertical: true,
    vexpand: true,
    vpack: "start",
  });
  box.hook(recent, (self) => {
    Utils.idle(() => {
      const flow = Widget.FlowBox({ homogeneous: true });
      flow.set_min_children_per_line(5);
      flow.set_max_children_per_line(25);
      for (const emojiKey in recent.value) {
        let emoji = emojiList[emojiKey];
        flow.add(
          Widget.Button({
            class_name: "standard_icon_button emoji",
            label: emoji,
            attribute: { emoji },
            on_clicked: (btn) => {
              addRecentEmoji(emojiKey, emoji);
              Utils.execAsync(`wl-copy ${btn.attribute.emoji}`).catch(print);
              current_window.hide();
            },
            tooltipText: emojiKey
              .replace(/^e\d+-\d+/, "")
              .replaceAll("-", " ")
              .trim(),
          })
        );
      }
      box.child = flow;
    });
  });
  return Widget.Scrollable({
    child: box,
    hscroll: "never",
    vexpand: true,
  });
}

function SearchPage(search) {
  const emojiList = extractEmojis(emojiData);
  const box = Widget.Box({
    vertical: true,
    vexpand: true,
    vpack: "start",
  });
  box.hook(search, (self) => {
    Utils.idle(() => {
      if (search.value.length === 0) return;
      const flow = Widget.FlowBox({ homogeneous: true });
      flow.set_min_children_per_line(5);
      flow.set_max_children_per_line(25);
      for (const emojiKey in emojiList) {
        let emoji = emojiList[emojiKey];
        if (searchString(emojiKey, search.value)) {
          flow.add(
            Widget.Button({
              class_name: "standard_icon_button emoji",
              label: emoji,
              attribute: { emoji },
              on_clicked: (btn) => {
                addRecentEmoji(emojiKey, emoji);
                Utils.execAsync(`wl-copy ${btn.attribute.emoji}`).catch(print);
                current_window.hide();
              },
              tooltipText: emojiKey
                .replace(/^e\d+-\d+/, "")
                .replaceAll("-", " ")
                .trim(),
            })
          );
        }
      }
      box.child = flow;
    });
  });
  return Widget.Scrollable({
    child: box,
    hscroll: "never",
    vexpand: true,
  });
}

function Page(category) {
  const box = Widget.Box({
    vertical: true,
    vexpand: true,
    vpack: "start",
  });
  for (let subcategoryKey in category) {
    box.pack_start(
      Widget.Label({
        label:
          subcategoryKey.charAt(0).toUpperCase() +
          subcategoryKey.replaceAll("-", " ").slice(1) +
          ":",
        class_name: "title",
        vpack: "start",
        hpack: "start",
      }),
      false,
      false,
      0
    );
    const flow = Widget.FlowBox({ homogeneous: true });
    flow.set_min_children_per_line(5);
    flow.set_max_children_per_line(25);
    let emojis = category[subcategoryKey];
    for (let emojiKey in emojis) {
      let emoji = emojis[emojiKey];
      flow.add(
        Widget.Button({
          class_name: "standard_icon_button emoji",
          label: emoji,
          attribute: { emoji },
          on_clicked: (btn) => {
            addRecentEmoji(emojiKey, emoji);
            Utils.execAsync(`wl-copy ${btn.attribute.emoji}`).catch(print);
            current_window.hide();
          },
          tooltipText: emojiKey
            .replace(/^e\d+-\d+/, "")
            .replaceAll("-", " ")
            .trim(),
        })
      );
    }
    box.pack_start(flow, false, false, 0);
  }
  return Widget.Scrollable({
    child: box,
    hscroll: "never",
    vexpand: true,
  });
}

function EmojiList() {
  const search = Variable("");
  const entry = Widget.Entry({
    placeholder_text: "Search",
    class_name: "search",
    editable: true, // Make sure the entry is editable
    can_focus: true, // Ensure it can receive focus
    on_change: (self) => {
      search.setValue(self.text);
    },
  });

  // Category buttons now use MaterialIcon for icons.
  const CategoryButton = (icon, name) =>
    Widget.Button({
      class_name: "emoji_category standard_icon_button",
      child: MaterialIcon(icon),
      setup: (self) => {
        self.hook(current_page, () => {
          self.toggleClassName("active", current_page.value === name);
        });
      },
      on_clicked: () => {
        current_page.setValue(name);
      },
    });

  let categories_pages = {
    search: SearchPage(search),
    recent: RecentPage(),
  };
  let categories_buttons = [CategoryButton("schedule", "recent")];
  for (const name in emojiData) {
    categories_buttons = [
      ...categories_buttons,
      CategoryButton(CATEGORY_ICONS[name] || "emoji", name),
    ];
    categories_pages[name] = Page(emojiData[name]);
  }

  const stack = Widget.Stack({
    children: categories_pages,
    setup: (self) => {
      self.hook(current_page, () => {
        if (self.shown === "search") {
          entry.text = "";
        }
        self.shown = current_page.value;
      });
      self.hook(search, () => {
        if (self.shown !== "search" && search.value.length > 0) {
          self.shown = "search";
        } else if (search.value.length === 0) {
          self.shown = current_page.value;
        }
      });
    },
    transition: "crossfade",
  });

  return Widget.Box({
    class_name: "emoji_list",
    vertical: true,
    children: [
      Widget.Scrollable({
        vscroll: "never",
        hscroll: "always",
        className: "emojie-scrollable",
        child: Widget.Box({
          class_name: "top_bar",
          children: [entry, ...categories_buttons],
        }),
      }),
      stack,
    ],
  });
}

export const EmojisWindow = () => {
  let window = PopupWindow({
    name: "emoji_picker",
    child: Widget.Box({
      children: [EmojiList()],
    }),
    visible: false,
    setup(win) {
      current_window = win;
      win.hook(barPosition, () => {
        win.anchor = ["bottom", antiVerticalAnchor()];
      });
    },
  });
  return window;
};
