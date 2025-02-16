#!/usr/bin/gjs
imports.gi.versions.Gtk = "4.0";
imports.gi.versions.Adw = "1";
imports.gi.versions.Gdk = "4.0";

const { Gtk, Adw, Gio, GLib, Gdk } = imports.gi;
const ByteArray = imports.byteArray;

const HOME = GLib.get_home_dir();
const CONFIG_PATH = `${HOME}/.ags/config.json`;

let config;
try {
  const contents = readFileSync(CONFIG_PATH);
  config = JSON.parse(contents);
} catch (error) {
  console.error("Error reading config:", error);
  config = {};
}

const CONTROL_HEIGHT = 32;
const CONTROL_WIDTH = {
  entry: 200,
  scale: 200,
  combo: 200,
  spin: 80,
};

function styleControl(control, width = CONTROL_WIDTH.entry) {
  control.height_request = CONTROL_HEIGHT;
  control.width_request = width;
  control.valign = Gtk.Align.CENTER;
  return control;
}

function createEntry(text = "") {
  return styleControl(new Gtk.Entry({ text: text }));
}

function createScale(value, min, max, digits = 0) {
  return styleControl(
    new Gtk.Scale({
      orientation: Gtk.Orientation.HORIZONTAL,
      draw_value: true,
      value_pos: Gtk.PositionType.RIGHT,
      digits: digits,
    }),
    CONTROL_WIDTH.scale,
  );
}

function createComboBox() {
  return styleControl(new Gtk.ComboBoxText(), CONTROL_WIDTH.combo);
}

function createSpinButton(value, min, max, step = 1) {
  return styleControl(
    new Gtk.SpinButton({
      adjustment: new Gtk.Adjustment({
        lower: min,
        upper: max,
        step_increment: step,
      }),
      value: value,
    }),
    CONTROL_WIDTH.spin,
  );
}

function readFileSync(path) {
  try {
    let file = Gio.File.new_for_path(path);
    const [success, contents] = file.load_contents(null);
    if (!success) return null;
    return ByteArray.toString(contents);
  } catch (error) {
    console.error("Error reading file:", error);
    return null;
  }
}

function writeFileSync(path, contents) {
  try {
    let file = Gio.File.new_for_path(path);
    file.replace_contents(
      contents,
      null,
      false,
      Gio.FileCreateFlags.NONE,
      null,
    );
  } catch (error) {
    console.error("Error writing file:", error);
  }
}

function getInstalledApps() {
  const apps = new Set();
  const dataDirs = [GLib.get_user_data_dir(), ...GLib.get_system_data_dirs()];

  dataDirs.forEach((dataDir) => {
    const appsDir = `${dataDir}/applications`;
    try {
      const dir = Gio.File.new_for_path(appsDir);
      const enumerator = dir.enumerate_children(
        "standard::*",
        Gio.FileQueryInfoFlags.NONE,
        null,
      );
      let fileInfo;

      while ((fileInfo = enumerator.next_file(null)) !== null) {
        const filename = fileInfo.get_name();
        if (filename.endsWith(".desktop")) {
          const appId = filename.slice(0, -8); // Remove .desktop
          apps.add(appId);
        }
      }
    } catch (error) {
      console.log(`Error reading ${appsDir}: ${error}`);
    }
  });

  return Array.from(apps).sort();
}

function getAppInfo(appId) {
  const dataDirs = [GLib.get_user_data_dir(), ...GLib.get_system_data_dirs()];

  for (const dataDir of dataDirs) {
    const path = `${dataDir}/applications/${appId}.desktop`;
    try {
      const file = Gio.File.new_for_path(path);
      if (file.query_exists(null)) {
        const info = Gio.DesktopAppInfo.new_from_filename(path);
        if (info) {
          return {
            name: info.get_display_name(),
            icon:
              info.get_icon()?.to_string() ||
              "application-x-executable-symbolic",
            description: info.get_description() || "",
          };
        }
      }
    } catch (error) {
      console.log(`Error reading ${path}: ${error}`);
    }
  }

  return {
    name: appId,
    icon: "application-x-executable-symbolic",
    description: "",
  };
}

function createAppChooser(pinnedApps, onChange) {
  const outerBox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 12,
    vexpand: true,
  });

  const searchBox = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    spacing: 6,
    margin_start: 12,
    margin_end: 12,
    margin_top: 12,
  });

  const searchIcon = new Gtk.Image({
    icon_name: "system-search-symbolic",
    pixel_size: 16,
  });

  const searchEntry = new Gtk.SearchEntry({
    placeholder_text: "Search applications...",
    hexpand: true,
  });

  searchBox.append(searchIcon);
  searchBox.append(searchEntry);

  const scrolled = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.NEVER,
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    vexpand: true,
    hexpand: true,
    min_content_height: 300,
    max_content_height: 400,
    propagate_natural_height: true,
  });

  const contentBox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 6,
    margin_start: 12,
    margin_end: 12,
    margin_bottom: 12,
  });

  const listBox = new Gtk.ListBox({
    selection_mode: Gtk.SelectionMode.NONE,
    css_classes: ["boxed-list", "content-list"],
  });

  listBox.vexpand = true;

  const installedApps = getInstalledApps();
  const pinnedSet = new Set(pinnedApps);
  const rows = new Map();

  const headerRow = new Gtk.ListBoxRow({
    activatable: false,
    selectable: false,
  });
  const headerLabel = new Gtk.Label({
    label: "<b>Installed Applications</b>",
    use_markup: true,
    xalign: 0,
    margin_top: 6,
    margin_bottom: 6,
    margin_start: 6,
    margin_end: 6,
  });
  headerRow.set_child(headerLabel);
  listBox.append(headerRow);

  installedApps.forEach((appId) => {
    const appInfo = getAppInfo(appId);
    const row = new Gtk.ListBoxRow({
      css_classes: ["app-row"],
    });

    const hbox = new Gtk.Box({
      orientation: Gtk.Orientation.HORIZONTAL,
      spacing: 12,
      margin_top: 6,
      margin_bottom: 6,
      margin_start: 12,
      margin_end: 12,
    });

    const check = new Gtk.CheckButton({
      active: pinnedSet.has(appId),
      valign: Gtk.Align.CENTER,
    });

    const icon = new Gtk.Image({
      icon_name: appInfo.icon,
      pixel_size: 24,
      valign: Gtk.Align.CENTER,
    });

    const textBox = new Gtk.Box({
      orientation: Gtk.Orientation.VERTICAL,
      spacing: 2,
      hexpand: true,
      valign: Gtk.Align.CENTER,
    });

    const nameLabel = new Gtk.Label({
      label: `<b>${GLib.markup_escape_text(appInfo.name, -1)}</b>`,
      use_markup: true,
      xalign: 0,
    });

    const idLabel = new Gtk.Label({
      label: `<small>${GLib.markup_escape_text(appId, -1)}</small>`,
      use_markup: true,
      xalign: 0,
      css_classes: ["dim-label"],
    });

    textBox.append(nameLabel);
    textBox.append(idLabel);

    check.connect("toggled", () => {
      const newPinnedApps = Array.from(installedApps).filter((id) =>
        id === appId ? check.active : pinnedSet.has(id),
      );
      pinnedSet.clear();
      newPinnedApps.forEach((id) => pinnedSet.add(id));
      onChange(newPinnedApps);

      if (check.active) {
        row.add_css_class("selected-row");
      } else {
        row.remove_css_class("selected-row");
      }
    });

    if (check.active) {
      row.add_css_class("selected-row");
    }

    hbox.append(check);
    hbox.append(icon);
    hbox.append(textBox);
    row.set_child(hbox);
    listBox.append(row);
    rows.set(appId.toLowerCase(), row);
  });

  searchEntry.connect("search-changed", () => {
    const text = searchEntry.text.toLowerCase();
    rows.forEach((row, appId) => {
      const appInfo = getAppInfo(appId);
      const visible =
        appId.includes(text) ||
        appInfo.name.toLowerCase().includes(text) ||
        appInfo.description.toLowerCase().includes(text);
      row.visible = visible;
    });
  });

  contentBox.append(listBox);
  scrolled.set_child(contentBox);

  outerBox.append(searchBox);
  outerBox.append(scrolled);

  const css = new Gtk.CssProvider();
  css.load_from_data(
    `
        .app-row {
            border-radius: 6px;
            margin: 2px 6px;
        }
        .app-row:hover {
            background-color: alpha(currentColor, 0.1);
        }
        .selected-row {
            background-color: alpha(@accent_bg_color, 0.1);
        }
        .selected-row:hover {
            background-color: alpha(@accent_bg_color, 0.15);
        }
        scrolledwindow {
            background: none;
            border: none;
        }
    `,
    -1,
  );

  Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default(),
    css,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
  );

  return outerBox;
}

function createControlFromType(key, value, onChange) {
  if (key === "pinnedApps" && Array.isArray(value)) {
    return createAppChooser(value, onChange);
  } else if (Array.isArray(value)) {
    const entry = createEntry(value.join(", "));
    entry.connect("changed", () => {
      onChange(
        entry
          .get_text()
          .split(",")
          .map((item) => item.trim())
          .filter((item) => item !== ""),
      );
    });
    return entry;
  } else if (typeof value === "boolean") {
    const toggle = new Gtk.Switch({
      active: value,
      valign: Gtk.Align.CENTER,
    });
    toggle.connect("notify::active", () => {
      onChange(toggle.active);
    });
    return toggle;
  } else if (typeof value === "number") {
    if (Number.isInteger(value)) {
      const spin = createSpinButton(value, 0, 1000);
      spin.connect("value-changed", () => {
        onChange(spin.get_value());
      });
      return spin;
    } else {
      const scale = createScale(value, 0, 1, 2);
      scale.connect("value-changed", () => {
        onChange(scale.get_value());
      });
      return scale;
    }
  } else if (typeof value === "string") {
    if (key.toLowerCase().includes("color")) {
      const colorCombo = createComboBox();
      const colors = [
        "blue",
        "green",
        "yellow",
        "orange",
        "red",
        "purple",
        "brown",
      ];
      colors.forEach((color) => {
        colorCombo.append(
          color,
          color.charAt(0).toUpperCase() + color.slice(1),
        );
      });
      colorCombo.set_active_id(value);
      colorCombo.connect("changed", () => {
        onChange(colorCombo.get_active_id());
      });
      return colorCombo;
    } else {
      const entry = createEntry(value);
      entry.connect("changed", () => {
        onChange(entry.get_text());
      });
      return entry;
    }
  }
  return null;
}

const SPECIAL_GROUPS = ["elements", "autoDarkMode"];

function createSettingsGroup(title, settings) {
  const group = new Adw.PreferencesGroup({ title });

  Object.entries(settings).forEach(([key, value]) => {
    if (key.startsWith("_")) return; // Skip private fields

    if (typeof value === "object" && value !== null) {
      if (Array.isArray(value)) {
        // Handle arrays
        const row = new Adw.ActionRow({
          title:
            key.charAt(0).toUpperCase() +
            key.slice(1).replace(/([A-Z])/g, " $1"),
          subtitle: `Enter ${key} (comma-separated)`,
        });

        const control = createControlFromType(key, value, (newValue) => {
          let target = config;
          const path = title.toLowerCase().split(" ");
          path.forEach((p) => {
            if (!target[p]) target[p] = {};
            target = target[p];
          });
          target[key] = newValue;
          writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        });

        if (control) {
          row.add_suffix(control);
          group.add(row);
        }
      } else if (SPECIAL_GROUPS.includes(key)) {
        // Handle special groups like 'elements'
        Object.entries(value).forEach(([elementKey, elementValue]) => {
          if (typeof elementValue === "boolean") {
            const row = new Adw.ActionRow({
              title:
                elementKey.charAt(0).toUpperCase() +
                elementKey.slice(1).replace(/([A-Z])/g, " $1"),
              subtitle: `Toggle ${elementKey}`,
            });

            const control = createControlFromType(
              elementKey,
              elementValue,
              (newValue) => {
                let target = config;
                const path = title.toLowerCase().split(" ");
                path.forEach((p) => {
                  if (!target[p]) target[p] = {};
                  target = target[p];
                });
                if (!target[key]) target[key] = {};
                target[key][elementKey] = newValue;
                writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
              },
            );

            if (control) {
              row.add_suffix(control);
              group.add(row);
            }
          }
        });
      } else {
        // Regular nested objects become new groups
        const nestedGroup = createSettingsGroup(
          key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
          value,
        );
        group.add(nestedGroup);
      }
    } else {
      const row = new Adw.ActionRow({
        title:
          key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1"),
        subtitle: `Configure ${key}`,
      });

      const control = createControlFromType(key, value, (newValue) => {
        let target = config;
        const path = title.toLowerCase().split(" ");
        path.forEach((p) => {
          if (!target[p]) target[p] = {};
          target = target[p];
        });
        target[key] = newValue;
        writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
      });

      if (control) {
        row.add_suffix(control);
        group.add(row);
      }
    }
  });

  return group;
}

function createDynamicPage(section, settings) {
  const scrolled = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.NEVER,
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    vexpand: true,
  });

  const box = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 12,
    margin_start: 12,
    margin_end: 12,
    margin_top: 12,
    margin_bottom: 12,
  });

  const group = createSettingsGroup(section, settings);
  box.append(group);

  scrolled.set_child(box);
  return scrolled;
}

// GTK Settings Management
const SCHEMA_INTERFACE = "org.gnome.desktop.interface";
const SCHEMA_WM = "org.gnome.desktop.wm.preferences";
const SCHEMA_SOUND = "org.gnome.desktop.sound";

function createGtkSettings() {
  const interfaceSettings = new Gio.Settings({ schema: SCHEMA_INTERFACE });
  const wmSettings = new Gio.Settings({ schema: SCHEMA_WM });
  const soundSettings = new Gio.Settings({ schema: SCHEMA_SOUND });

  const page = new Adw.PreferencesPage({
    title: "Appearance",
    icon_name: "preferences-desktop-appearance-symbolic",
  });

  // Theme Settings
  const themeGroup = new Adw.PreferencesGroup({ title: "Themes" });

  const gtkThemeRow = new Adw.ActionRow({
    title: "GTK Theme",
    subtitle: "Changes the appearance of applications",
  });

  const gtkThemeBtn = new Gtk.Button({
    label: interfaceSettings.get_string("gtk-theme"),
    css_classes: ["flat"],
  });

  gtkThemeBtn.connect("clicked", () => {
    const themes = listThemes("/usr/share/themes");
    showThemeChooserDialog("Select GTK Theme", themes, (theme) => {
      interfaceSettings.set_string("gtk-theme", theme);
      gtkThemeBtn.label = theme;
    });
  });

  gtkThemeRow.add_suffix(gtkThemeBtn);
  themeGroup.add(gtkThemeRow);

  // Icon Theme
  const iconThemeRow = new Adw.ActionRow({
    title: "Icon Theme",
    subtitle: "Changes the look of icons",
  });

  const iconThemeBtn = new Gtk.Button({
    label: interfaceSettings.get_string("icon-theme"),
    css_classes: ["flat"],
  });

  iconThemeBtn.connect("clicked", () => {
    const themes = listThemes("/usr/share/icons");
    showThemeChooserDialog("Select Icon Theme", themes, (theme) => {
      interfaceSettings.set_string("icon-theme", theme);
      iconThemeBtn.label = theme;
    });
  });

  iconThemeRow.add_suffix(iconThemeBtn);
  themeGroup.add(iconThemeRow);

  // Cursor Theme
  const cursorThemeRow = new Adw.ActionRow({
    title: "Cursor Theme",
    subtitle: "Changes the appearance of the mouse cursor",
  });

  const cursorThemeBtn = new Gtk.Button({
    label: interfaceSettings.get_string("cursor-theme"),
    css_classes: ["flat"],
  });

  cursorThemeBtn.connect("clicked", () => {
    const themes = listThemes("/usr/share/icons");
    showThemeChooserDialog("Select Cursor Theme", themes, (theme) => {
      interfaceSettings.set_string("cursor-theme", theme);
      cursorThemeBtn.label = theme;
    });
  });

  cursorThemeRow.add_suffix(cursorThemeBtn);
  themeGroup.add(cursorThemeRow);

  // Font Settings
  const fontGroup = new Adw.PreferencesGroup({ title: "Fonts" });

  const fontRows = [
    {
      key: "font-name",
      title: "Interface Font",
      subtitle: "Used for application interface text",
    },
    {
      key: "document-font-name",
      title: "Document Font",
      subtitle: "Used for reading documents",
    },
    {
      key: "monospace-font-name",
      title: "Monospace Font",
      subtitle: "Used for code and terminals",
    },
  ];

  fontRows.forEach(({ key, title, subtitle }) => {
    const row = new Adw.ActionRow({
      title: title,
      subtitle: subtitle,
    });

    const fontBtn = new Gtk.Button({
      label: interfaceSettings.get_string(key),
      css_classes: ["flat"],
    });

    fontBtn.connect("clicked", () => {
      showFontChooserDialog(title, (font) => {
        interfaceSettings.set_string(key, font);
        fontBtn.label = font;
      });
    });

    row.add_suffix(fontBtn);
    fontGroup.add(row);
  });

  // Window Controls
  const windowGroup = new Adw.PreferencesGroup({ title: "Window Titlebar" });

  const buttonLayoutRow = new Adw.ActionRow({
    title: "Titlebar Buttons",
    subtitle: "Customize window control button layout",
  });

  const layoutOptions = [
    "close,minimize,maximize:",
    "close:",
    "minimize,maximize,close:",
  ];
  const buttonLayoutCombo = new Gtk.ComboBoxText();
  layoutOptions.forEach((opt) => buttonLayoutCombo.append(opt, opt));

  buttonLayoutCombo.active_id = wmSettings.get_string("button-layout");
  buttonLayoutCombo.connect("changed", () => {
    wmSettings.set_string("button-layout", buttonLayoutCombo.active_id);
  });

  buttonLayoutRow.add_suffix(buttonLayoutCombo);
  windowGroup.add(buttonLayoutRow);

  // Add all groups to the page
  page.add(themeGroup);
  page.add(fontGroup);
  page.add(windowGroup);

  return page;
}

function listThemes(directory) {
  const themes = [];
  try {
    const dir = Gio.File.new_for_path(directory);
    const enumerator = dir.enumerate_children(
      "standard::name",
      Gio.FileQueryInfoFlags.NONE,
      null,
    );

    let info;
    while ((info = enumerator.next_file(null))) {
      themes.push(info.get_name());
    }
  } catch (e) {
    console.error(`Error listing themes in ${directory}: ${e}`);
  }
  return themes.sort();
}

function showThemeChooserDialog(title, themes, callback) {
  const dialog = new Gtk.Dialog({
    title: title,
    modal: true,
    use_header_bar: 1,
  });

  const box = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 10,
    margin_top: 10,
    margin_bottom: 10,
    margin_start: 10,
    margin_end: 10,
  });

  const list = new Gtk.ListBox({
    selection_mode: Gtk.SelectionMode.SINGLE,
    css_classes: ["boxed-list"],
  });

  themes.forEach((theme) => {
    const row = new Gtk.ListBoxRow();
    const label = new Gtk.Label({
      label: theme,
      xalign: 0,
      margin_top: 6,
      margin_bottom: 6,
      margin_start: 6,
      margin_end: 6,
    });
    row.set_child(label);
    list.append(row);
  });

  const scrolled = new Gtk.ScrolledWindow({
    min_content_height: 300,
    max_content_height: 400,
  });
  scrolled.set_child(list);
  box.append(scrolled);

  dialog.get_content_area().append(box);
  dialog.add_button("Cancel", Gtk.ResponseType.CANCEL);
  dialog.add_button("Select", Gtk.ResponseType.ACCEPT);

  list.connect("row-activated", (_, row) => {
    const label = row.get_child();
    callback(label.label);
    dialog.destroy();
  });

  dialog.connect("response", (_, response) => {
    if (response === Gtk.ResponseType.ACCEPT) {
      const row = list.get_selected_row();
      if (row) {
        const label = row.get_child();
        callback(label.label);
      }
    }
    dialog.destroy();
  });

  dialog.show();
}

function showFontChooserDialog(title, callback) {
  const dialog = new Gtk.FontChooserDialog({
    title: title,
    modal: true,
  });

  dialog.connect("response", (_, response) => {
    if (response === Gtk.ResponseType.OK) {
      callback(dialog.get_font());
    }
    dialog.destroy();
  });

  dialog.show();
}

function createSidebar() {
  const sidebar = new Gtk.ScrolledWindow({
    hscrollbar_policy: Gtk.PolicyType.NEVER,
    vscrollbar_policy: Gtk.PolicyType.AUTOMATIC,
    vexpand: true,
    hexpand: false,
    min_content_height: 300,
    max_content_height: 400,
    propagate_natural_height: true,
    css_classes: ["sidebar"],
  });
  const list = new Gtk.ListBox({
    selection_mode: Gtk.SelectionMode.SINGLE,
    css_classes: ["navigation-sidebar"],
  });

  const sectionToIcon = {
    wallselect: "preferences-desktop-wallpaper-symbolic",
    desktopBackground: "preferences-desktop-wallpaper-symbolic",
    ai: "preferences-system-symbolic",
    animations: "view-reveal-symbolic",
    appearance: "preferences-desktop-appearance-symbolic",
    apps: "application-x-executable-symbolic",
    icons: "emblem-photos-symbolic",
    bar: "view-grid-symbolic",
    bluetooth: "bluetooth-symbolic",
    clock: "preferences-system-time-symbolic",
    dock: "view-paged-symbolic",
    media: "multimedia-player-symbolic",
    network: "network-wireless-symbolic",
    notifications: "preferences-system-notifications-symbolic",
    overview: "view-app-grid-symbolic",
    power: "battery-symbolic",
    system: "emblem-system-symbolic",
    theme: "preferences-desktop-theme-symbolic",
    volume: "audio-volume-high-symbolic",
    weather: "weather-few-clouds-symbolic",
    workspaces: "workspace-switcher-symbolic",
    gtk: "applications-graphics-symbolic",
  };

  // Add static sections first
  const staticSections = [
    {
      id: "gtk",
      title: "GTK Settings",
      icon: "applications-graphics-symbolic",
    },
  ];

  staticSections.forEach((section) => {
    const row = createSidebarRow(section.title, section.icon);
    row._section_id = section.id;
    list.append(row);
  });

  // Add dynamic sections from config
  const dynamicSections = Object.entries(config)
    .filter(([key]) => !key.startsWith("_"))
    .map(([section]) => ({
      id: section,
      title: section.charAt(0).toUpperCase() + section.slice(1),
      icon:
        sectionToIcon[section.toLowerCase()] || "preferences-other-symbolic",
    }));

  dynamicSections.forEach((section) => {
    const row = createSidebarRow(section.title, section.icon);
    row._section_id = section.id;
    list.append(row);
  });

  list.connect("row-selected", (_, row) => {
    if (row) {
      contentStack.set_visible_child_name(row._section_id);
    }
  });

  sidebar.set_child(list);
  return sidebar;
}

function createSidebarRow(title, iconName) {
  const row = new Gtk.ListBoxRow({
    css_classes: ["navigation-sidebar-item"],
  });

  const box = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    spacing: 12,
    margin_top: 6,
    margin_bottom: 6,
    margin_start: 12,
    margin_end: 12,
  });

  const icon = new Gtk.Image({
    icon_name: iconName,
    pixel_size: 16,
  });

  const label = new Gtk.Label({
    label: title,
    xalign: 0,
    hexpand: true,
  });

  box.append(icon);
  box.append(label);
  row.set_child(box);
  return row;
}

function createMainView(window) {
  const outerBox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    spacing: 0,
  });

  const headerBar = new Adw.HeaderBar({
    title_widget: new Gtk.Label({ label: "Settings" }),
    css_classes: ["flat"],
  });

  const contentBox = new Gtk.Box({
    orientation: Gtk.Orientation.HORIZONTAL,
    spacing: 0,
    vexpand: true,
  });

  const sidebarContainer = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    width_request: 200,
    css_classes: ["sidebar"],
  });

  const sidebar = createSidebar();
  sidebarContainer.append(sidebar);

  const rightBox = new Gtk.Box({
    orientation: Gtk.Orientation.VERTICAL,
    hexpand: true,
  });

  contentStack = new Gtk.Stack({
    transition_type: Gtk.StackTransitionType.CROSSFADE,
    vexpand: true,
    css_classes: ["content-stack"],
  });

  // Add GTK settings page
  contentStack.add_named(createGtkSettings(), "gtk");

  // Add dynamic pages from config
  Object.entries(config)
    .filter(([key]) => !key.startsWith("_"))
    .forEach(([section, settings]) => {
      contentStack.add_named(createDynamicPage(section, settings), section);
    });

  rightBox.append(contentStack);

  outerBox.append(headerBar);
  contentBox.append(sidebarContainer);
  contentBox.append(rightBox);
  outerBox.append(contentBox);

  // Add some CSS for better styling
  const css = new Gtk.CssProvider();
  css.load_from_data(
    `
        .navigation-sidebar {
        }
        .navigation-sidebar-item:hover {
            background-color: alpha(currentColor, 0.07);
        }
        .navigation-sidebar-item:selected {
            background-color: alpha(@accent_bg_color, 0.15);
        }
        .content-stack {
            background: none;
            padding: 12px;
        }
    `,
    -1,
  );

  Gtk.StyleContext.add_provider_for_display(
    Gdk.Display.get_default(),
    css,
    Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION,
  );

  return outerBox;
}

Adw.init();

const app = new Gtk.Application({
  application_id: "org.gnome.AGSTweaks",
  flags: Gio.ApplicationFlags.FLAGS_NONE,
});

app.connect("activate", () => {
  const win = new Gtk.Window({
    application: app,
    title: "AGS Settings",
    default_width: 1000,
    default_height: 680,
    icon_name: "preferences-system-symbolic",
  });

  win.connect("close-request", () => {
    app.quit();
    return true;
  });

  const mainView = createMainView(win);
  win.set_child(mainView);
  win.present();
});

app.run([]);
