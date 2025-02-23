import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import App from "resource:///com/github/Aylur/ags/app.js";
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import GdkPixbuf from 'gi://GdkPixbuf';
import Gdk from 'gi://Gdk';
import userOptions from '../.configuration/user_options.js';
import { RoundedCorner } from "../.commonwidgets/cairo_roundedcorner.js";
import ColorPicker from "../bar/modules/color_picker.js";


const { Box, Label, EventBox, Scrollable, Button, Revealer } = Widget;
const opts = await userOptions.asyncGet().wallselect;
const elevate = userOptions.asyncGet().etc.widgetCorners ? "wall-rounding" : "elevation";
const CLICK_ACTION_SCRIPT = "matugen image";
const WALLPAPER_DIR = GLib.get_home_dir() + opts.wallpaperFolder || '/Pictures/Wallpapers';
const PREVIEW_WIDTH = opts.width || 200;
const PREVIEW_HEIGHT = opts.height || 120;
const PREVIEW_CORNER = opts.radius || 18;
const HIGH_QUALITY_PREVIEW = opts.highQualityPreview;
const CACHING_MODE = opts.cachingMode || "disk";

// In-memory cache for scaled pixbufs.
const pixbufCache = {};
// --- Disk cache setup (only used if CACHING_MODE is "disk") ---
let DISK_CACHE_DIR = null;
if (CACHING_MODE === "disk") {
  DISK_CACHE_DIR = GLib.get_user_cache_dir() + '/ags/user/wallpapers';
  GLib.mkdir_with_parents(DISK_CACHE_DIR, 0o755);
}

// Helper function to extract the original file’s extension and generate a cache file name.
const getCacheInfo = (path) => {
  const basename = GLib.path_get_basename(path);
  const dotIndex = basename.lastIndexOf('.');
  let ext;
  if (dotIndex !== -1) {
    ext = basename.substring(dotIndex + 1).toLowerCase();
  } else {
    ext = "png";
  }
  // Map "jpg" to "jpeg" as required by GdkPixbuf.
  let format = ext === "jpg" ? "jpeg" : ext;
  return { cachedFileName: basename, format };
};

// --- Asynchronous preview loader ---
// Returns a promise that resolves with the scaled pixbuf.
const loadPreviewAsync = (path) => {
  return new Promise((resolve, reject) => {
    try {
      // If disk caching is enabled, try loading from the disk cache.
      if (CACHING_MODE === "disk") {
        const { cachedFileName, format } = getCacheInfo(path);
        const diskCachePath = DISK_CACHE_DIR + '/' + cachedFileName;
        const diskCacheFile = Gio.File.new_for_path(diskCachePath);
        if (diskCacheFile.query_exists(null)) {
          try {
            let pixbuf = GdkPixbuf.Pixbuf.new_from_file(diskCachePath);
            return resolve(pixbuf);
          } catch (e) {
            log(`Error loading disk cached image ${diskCachePath}: ${e}`);
          }
        }
        // Otherwise load the image from the original file.
        let pixbuf;
        if (HIGH_QUALITY_PREVIEW) {
          pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(
            path,
            PREVIEW_WIDTH,
            PREVIEW_HEIGHT,
            true
          );
        } else {
          const fullPixbuf = GdkPixbuf.Pixbuf.new_from_file(path);
          pixbuf = fullPixbuf.scale_simple(
            PREVIEW_WIDTH,
            PREVIEW_HEIGHT,
            GdkPixbuf.InterpType.NEAREST
          );
        }
        // Save the loaded pixbuf to disk for future use.
        try {
          pixbuf.savev(diskCachePath, format, [], []);
        } catch (e) {
          log(`Error saving disk cached image ${diskCachePath}: ${e}`);
        }
        return resolve(pixbuf);
      } else {
        // Memory caching mode: load and scale directly.
        let pixbuf;
        if (HIGH_QUALITY_PREVIEW) {
          pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(
            path,
            PREVIEW_WIDTH,
            PREVIEW_HEIGHT,
            true
          );
        } else {
          const fullPixbuf = GdkPixbuf.Pixbuf.new_from_file(path);
          pixbuf = fullPixbuf.scale_simple(
            PREVIEW_WIDTH,
            PREVIEW_HEIGHT,
            GdkPixbuf.InterpType.NEAREST
          );
        }
        return resolve(pixbuf);
      }
    } catch (e) {
      return reject(e);
    }
  });
};

// --- Caching wallpaper paths ---
let switchWall = `swww img -t outer --transition-duration 1 --transition-step 255 --transition-fps 60 -f Nearest`;
let wallpaperPathsCache = null;
let wallpaperPathsCacheTime = 0;
const CACHE_DURATION = 60 * 1e6; // 60 seconds in microseconds

const getWallpaperPaths = () => {
  const now = GLib.get_monotonic_time();
  if (wallpaperPathsCache && (now - wallpaperPathsCacheTime < CACHE_DURATION)) {
    return Promise.resolve(wallpaperPathsCache);
  }
  return Utils.execAsync(
    `find ${GLib.shell_quote(WALLPAPER_DIR)} -type f \\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.webp" -o -iname "*.tga" -o -iname "*.tiff" -o -iname "*.bmp" -o -iname "*.ico" \\)`
  ).then(files => {
    wallpaperPathsCache = files.split("\n").filter(Boolean);
    wallpaperPathsCacheTime = now;
    return wallpaperPathsCache;
  });
};

// Global reference to the container holding the wallpaper content.
let wallpaperContentContainer = null;

// --- Wallpaper Preview Widget with Lazy & Async Loading ---
const WallpaperPreview = (path) =>
  Widget.Button({
    child: EventBox({
      setup: (self) => {
        const drawingArea = new Gtk.DrawingArea();
        drawingArea.set_size_request(PREVIEW_WIDTH, PREVIEW_HEIGHT);
        self.add(drawingArea);
        let pixbuf = null;
        let idleSourceId = null;
  
        // Defer image loading until idle.
        const loadImage = () => {
          try {
            // Only proceed if the drawingArea is mapped (visible on-screen).
            if (!drawingArea.get_mapped()) {
              return GLib.SOURCE_CONTINUE;
            }
            // Check in-memory cache first.
            if (pixbufCache[path]) {
              pixbuf = pixbufCache[path];
              drawingArea.queue_draw();
              idleSourceId = null;
              return GLib.SOURCE_REMOVE;
            }
  
            // Use async preview loader.
            loadPreviewAsync(path)
              .then((loadedPixbuf) => {
                pixbuf = loadedPixbuf;
                pixbufCache[path] = pixbuf;
                drawingArea.queue_draw();
              })
              .catch((e) => {
                log(`Async preview error for ${path}: ${e}`);
                drawingArea.queue_draw();
              });
          } catch (e) {
            idleSourceId = null;
            return GLib.SOURCE_REMOVE;
          }
          idleSourceId = null;
          return GLib.SOURCE_REMOVE;
        };
  
        // Schedule the idle callback and store its ID.
        idleSourceId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, loadImage);
  
        // Cancel the idle callback if the drawing area is destroyed.
        drawingArea.connect("destroy", () => {
          if (idleSourceId !== null) {
            try {
              GLib.source_remove(idleSourceId);
            } catch (e) {
              log(`Failed to remove idle source: ${e}`);
            }
            idleSourceId = null;
          }
        });
  
        drawingArea.connect("draw", (widget, cr) => {
          const width = widget.get_allocated_width();
          const height = widget.get_allocated_height();
  
          // Create a rounded clipping path.
          cr.arc(PREVIEW_CORNER, PREVIEW_CORNER, PREVIEW_CORNER, Math.PI, 1.5 * Math.PI);
          cr.arc(width - PREVIEW_CORNER, PREVIEW_CORNER, PREVIEW_CORNER, 1.5 * Math.PI, 2 * Math.PI);
          cr.arc(width - PREVIEW_CORNER, height - PREVIEW_CORNER, PREVIEW_CORNER, 0, 0.5 * Math.PI);
          cr.arc(PREVIEW_CORNER, height - PREVIEW_CORNER, PREVIEW_CORNER, 0.5 * Math.PI, Math.PI);
          cr.closePath();
          cr.clip();
  
          if (pixbuf) {
            const imgW = pixbuf.get_width();
            const imgH = pixbuf.get_height();
            Gdk.cairo_set_source_pixbuf(cr, pixbuf, width / 2 - imgW / 2, height / 2 - imgH / 2);
            cr.paint();
          }
          return false;
        });
      }
    }),
    onClicked: () => {
        Utils.execAsync(['bash', '-c', `${switchWall} ${path}`]).catch(print);
        App.closeWindow("wallselect");
    },
  });
  
// --- Placeholder content when no wallpapers are found ---
const createPlaceholder = () => Box({
  className: 'wallpaper-placeholder',
  vertical: true,
  vexpand: true,
  hexpand: true,
  spacing: 10,
  children: [
    Box({
      vertical: true,
      vpack: 'center',
      hpack: 'center',
      vexpand: true,
      children: [
        Label({ label: 'No wallpapers found.', className: 'txt-norm onSurfaceVariant' }),
        Label({ label: 'Add wallpapers to get started.', opacity: 0.8, className: 'txt-small onSurfaceVariant' }),
      ],
    }),
  ],
});
  
// --- Create the content of the wallselect window ---
const createContent = async () => {
  try {
    const wallpaperPaths = await getWallpaperPaths();
    if (wallpaperPaths.length === 0) {
      return createPlaceholder();
    }
    return EventBox({
      onPrimaryClick: () => App.closeWindow("wallselect"),
      onSecondaryClick: () => App.closeWindow("wallselect"),
      onMiddleClick: () => App.closeWindow("wallselect"),
      child: Scrollable({
        hexpand: true,
        vexpand: false,
        hscroll: "always",
        vscroll: "never",
        child: Box({
          className: "wallpaper-list",
          children: wallpaperPaths.map(WallpaperPreview),
        }),
      }),
    });
  } catch (error) {
    return Box({
      className: "wallpaper-error",
      vexpand: true,
      hexpand: true,
      children: [
        Label({ label: "Error loading wallpapers.", className: "txt-large txt-error" }),
      ],
    });
  }
};
  
// --- Toggle wallselect window visibility ---
const toggleWindow = () => {
  const win = App.getWindow('wallselect');
  if (!win) return;
  win.visible = !win.visible;
};
  
// --- Monitor the wallpaper directory for changes (patching) ---
const setupWallpaperMonitor = () => {
  const file = Gio.File.new_for_path(WALLPAPER_DIR);
  const monitor = file.monitor_directory(Gio.FileMonitorFlags.NONE, null);
  monitor.connect("changed", (monitor, file, otherFile, eventType) => {
    const changedPath = file.get_path();
    if (
      eventType === Gio.FileMonitorEvent.CHANGED ||
      eventType === Gio.FileMonitorEvent.ATTRIBUTE_CHANGED ||
      eventType === Gio.FileMonitorEvent.CREATED ||
      eventType === Gio.FileMonitorEvent.DELETED ||
      eventType === Gio.FileMonitorEvent.CHANGES_DONE_HINT
    ) {
      if (pixbufCache[changedPath]) {
        delete pixbufCache[changedPath];
      }
      if (wallpaperContentContainer) {
        createContent().then(content => {
          wallpaperContentContainer.children = [content];
        });
      }
    }
  });
};
  
// --- Main window definition ---
export default () => Widget.Window({
  name: "wallselect",
  anchor: ['top', 'bottom', 'right', 'left'],
  layer: 'overlay',
  visible: false,
  child: Widget.Overlay({
    child: EventBox({
      onPrimaryClick: () => App.closeWindow("wallselect"),
      onSecondaryClick: () => App.closeWindow("wallselect"),
      onMiddleClick: () => App.closeWindow("wallselect"),
      child: Box({ hexpand: true, vexpand: true, css: 'min-height: 1000px;' }),
    }),
    overlays: [
      Box({
        vertical: true,
        children: [
          Box({
            vertical: true,
            className: `wallselect-bg ${elevate}`,
            css:`margin-bottom:0`,
            children: [
              Box({
                className: "wallselect-header",
                children: [
                  // Insert header widgets (e.g. ColorPickerBox) here.
                  Box({ hexpand: true }),
                ],
              }),
              Box({
                vertical: true,
                vpack: "center",
                className: "wallselect-content",
                setup: (self) => {
                  wallpaperContentContainer = self;
                  self.hook(
                    App,
                    async (_, name, visible) => {
                      if (name === "wallselect" && visible) {
                        const content = await createContent();
                        self.children = [content];
                      }
                    },
                    "window-toggled"
                  );
                },
              }),
            ],
          }),
          Box({
            vpack: 'end',
            children: [
              userOptions.asyncGet().etc.widgetCorners ? RoundedCorner('topleft', { className: 'corner corner-colorscheme' }) : null,
              
              Box({ 
                hexpand:true,
                hpack: 'center',
                 children:[
                   RoundedCorner('topright', { className: 'corner corner-colorscheme' }) ,
                   Box({className: `colorpicker`,css:`border-radius:0 0 1.4rem 1.4rem `,children:[ColorPicker()]}),
                   RoundedCorner('topleft', { className: 'corner corner-colorscheme' }) ,
                
                ] 
              }),
              userOptions.asyncGet().etc.widgetCorners ? RoundedCorner('topright', { className: 'corner corner-colorscheme' }) : null,
            ]
          })
        ],
      }),
    ],
  }),
});
  
// Initialize the wallpaper directory monitor.
setupWallpaperMonitor();
export { toggleWindow };
