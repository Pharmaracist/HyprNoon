import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import App from "resource:///com/github/Aylur/ags/app.js";
import GLib from "gi://GLib";
import Gio from "gi://Gio";
import Gtk from "gi://Gtk";
import GdkPixbuf from "gi://GdkPixbuf";
import Gdk from "gi://Gdk";
import userOptions from "../.configuration/user_options.js";
const { Box, Label, EventBox, Scrollable, Button } = Widget;
const { wallselect: opts, etc } = await userOptions.asyncGet();
import PopupWindow from "../.widgethacks/popupwindow.js";
import {
  upperCorners,
  lowerCorners,
  rightCorners,
  leftCorners,
} from "../.commonwidgets/dynamiccorners.js";
function styling() {
  let anchors, hscroll, vscroll, value;

  if (opts.Vmode) {
    anchors = [antiVerticalAnchor(), "top", "bottom"];
    hscroll = "never";
    vscroll = "always";
    value = true;
  } else {
    anchors = [antiHorizontalAnchor(), "right", "left"];
    hscroll = "always";
    vscroll = "never";
    value = false;
  }
  return { anchors, hscroll, vscroll, value };
}

const WALLPAPER_DIR =
  GLib.get_home_dir() + (opts.wallpaperFolder || "/Pictures/Wallpapers");
const PREVIEW_WIDTH = opts.width || 200;
const PREVIEW_HEIGHT = opts.height || 120;
const PREVIEW_CORNER = opts.radius || 18;
const HIGH_QUALITY_PREVIEW = opts.highQualityPreview;

// Set up disk cache.
const DISK_CACHE_DIR = GLib.get_user_cache_dir() + "/ags/user/wallpapers";
GLib.mkdir_with_parents(DISK_CACHE_DIR, 0o755);

// Helper to extract the file extension and compute a cache file name.
const getCacheInfo = (path) => {
  const basename = GLib.path_get_basename(path);
  const dotIndex = basename.lastIndexOf(".");
  const ext =
    dotIndex !== -1 ? basename.substring(dotIndex + 1).toLowerCase() : "png";
  return { cachedFileName: basename, format: ext === "jpg" ? "jpeg" : ext };
};

// Asynchronously load and scale a preview image with disk caching.
const loadPreviewAsync = async (path) => {
  const { cachedFileName } = getCacheInfo(path);
  const diskCachePath = DISK_CACHE_DIR + "/" + cachedFileName;
  const diskCacheFile = Gio.File.new_for_path(diskCachePath);
  if (diskCacheFile.query_exists(null)) {
    // Compare modification times: use cache only if the original file is older.
    const originalFile = Gio.File.new_for_path(path);
    try {
      const diskInfo = diskCacheFile.query_info(
        "time::modified",
        Gio.FileQueryInfoFlags.NONE,
        null
      );
      const originalInfo = originalFile.query_info(
        "time::modified",
        Gio.FileQueryInfoFlags.NONE,
        null
      );
      if (
        originalInfo.get_attribute_uint64("time::modified") <=
        diskInfo.get_attribute_uint64("time::modified")
      ) {
        try {
          return GdkPixbuf.Pixbuf.new_from_file(diskCachePath);
        } catch (e) {
          log(`Error loading disk cached image ${diskCachePath}: ${e}`);
        }
      }
    } catch (e) {
      log(`Error comparing modification times for caching: ${e}`);
    }
  }

  // Load and scale the image if not cached or if cache is outdated.
  let pixbuf;
  if (path.toLowerCase().endsWith(".gif")) {
    const animation = GdkPixbuf.PixbufAnimation.new_from_file(path);
    pixbuf = animation
      .get_static_image()
      .scale_simple(
        PREVIEW_WIDTH,
        PREVIEW_HEIGHT,
        GdkPixbuf.InterpType.BILINEAR
      );
  } else if (HIGH_QUALITY_PREVIEW) {
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

  // Save the newly generated image to disk.
  const { format } = getCacheInfo(path);
  try {
    pixbuf.savev(diskCachePath, format, [], []);
  } catch (e) {
    log(`Error saving disk cached image ${diskCachePath}: ${e}`);
  }
  return pixbuf;
};

// Cache for wallpaper paths (cached for 60 seconds).
let wallpaperPathsCache = null;
let wallpaperPathsCacheTime = 0;
const CACHE_DURATION = 60 * 1e6; // 60 seconds in microseconds

const getWallpaperPaths = async () => {
  const now = GLib.get_monotonic_time();
  if (wallpaperPathsCache && now - wallpaperPathsCacheTime < CACHE_DURATION) {
    return wallpaperPathsCache;
  }
  const files = await Utils.execAsync(
    `find ${GLib.shell_quote(
      WALLPAPER_DIR
    )} -type f \\( -iname "*.jpg" -o -iname "*.jpeg" -o -iname "*.png" -o -iname "*.gif" -o -iname "*.webp" -o -iname "*.tga" -o -iname "*.tiff" -o -iname "*.bmp" -o -iname "*.ico" \\)`
  );
  wallpaperPathsCache = files.split("\n").filter(Boolean);
  wallpaperPathsCacheTime = now;
  return wallpaperPathsCache;
};

const WallpaperPreview = (path) =>
  Button({
    child: EventBox({
      setup: (self) => {
        const drawingArea = new Gtk.DrawingArea();
        drawingArea.set_size_request(PREVIEW_WIDTH, PREVIEW_HEIGHT);
        self.add(drawingArea);
        let pixbuf = null;
        let drawingAreaDestroyed = false;

        // Mark when the drawing area is unrealized.
        drawingArea.connect("unrealize", () => {
          drawingAreaDestroyed = true;
        });

        // Function to load the image.
        const loadImage = () => {
          loadPreviewAsync(path)
            .then((p) => {
              pixbuf = p;
              // Use GLib.idle_add to ensure the draw is scheduled on the main loop.
              GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                if (!drawingAreaDestroyed && drawingArea.get_window()) {
                  drawingArea.queue_draw();
                }
                return GLib.SOURCE_REMOVE;
              });
            })
            .catch((e) => {
              log(`Error loading image ${path}: ${e}`);
              GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
                if (!drawingAreaDestroyed && drawingArea.get_window()) {
                  drawingArea.queue_draw();
                }
                return GLib.SOURCE_REMOVE;
              });
            });
        };

        // Load image on widget mapping.
        if (drawingArea.get_realized()) {
          loadImage();
        } else {
          drawingArea.connect("realize", loadImage);
        }

        drawingArea.connect("draw", (widget, cr) => {
          // Make sure the drawing surface is still valid.
          if (!widget.get_window()) return false;
          try {
            if (pixbuf) {
              const areaWidth = widget.get_allocated_width();
              const areaHeight = widget.get_allocated_height();
              cr.save();
              // Create a rounded clipping path.
              cr.newPath();
              cr.arc(
                PREVIEW_CORNER,
                PREVIEW_CORNER,
                PREVIEW_CORNER,
                Math.PI,
                1.5 * Math.PI
              );
              cr.arc(
                areaWidth - PREVIEW_CORNER,
                PREVIEW_CORNER,
                PREVIEW_CORNER,
                1.5 * Math.PI,
                2 * Math.PI
              );
              cr.arc(
                areaWidth - PREVIEW_CORNER,
                areaHeight - PREVIEW_CORNER,
                PREVIEW_CORNER,
                0,
                0.5 * Math.PI
              );
              cr.arc(
                PREVIEW_CORNER,
                areaHeight - PREVIEW_CORNER,
                PREVIEW_CORNER,
                0.5 * Math.PI,
                Math.PI
              );
              cr.closePath();
              cr.clip();

              // Compute independent scale factors for width and height.
              const scaleX = areaWidth / pixbuf.get_width();
              const scaleY = areaHeight / pixbuf.get_height();
              cr.scale(scaleX, scaleY);

              // Draw the image so that it fills the entire area.
              Gdk.cairo_set_source_pixbuf(cr, pixbuf, 0, 0);
              cr.paint();
              cr.restore();
            }
          } catch (err) {
            log(`Drawing error: ${err}`);
          }
          return false;
        });
      },
    }),
    onClicked: async () => {
      try {
        await Utils.execAsync([
          `bash`,
          `-c`,
          `${App.configDir}/scripts/color_generation/colorgen.sh ${path}`,
        ]);
        App.closeWindow("wallselect");
      } catch (error) {
        console.error("Error during color generation:", error);
      }
    },
  });

// A placeholder widget when no wallpapers are found.
const createPlaceholder = () =>
  Box({
    className: "wallpaper-placeholder",
    vexpand: true,
    hexpand: true,
    spacing: 10,
    children: [
      Box({
        vertical: true,
        vpack: "center",
        hpack: "center",
        vexpand: true,
        children: [
          Label({
            label: "No wallpapers found.",
            className: "txt-norm onSurfaceVariant",
          }),
          Label({
            label: "Add wallpapers to get started.",
            opacity: 0.8,
            className: "txt-small onSurfaceVariant",
          }),
        ],
      }),
    ],
  });

const createContent = async () => {
  try {
    const wallpaperPaths = await getWallpaperPaths();
    if (!wallpaperPaths.length) return createPlaceholder();
    return EventBox({
      onPrimaryClick: () => App.closeWindow("wallselect"),
      onSecondaryClick: () => App.closeWindow("wallselect"),
      onMiddleClick: () => App.closeWindow("wallselect"),
      child: Scrollable({
        hexpand: true,
        vexpand: true,
        child: Box({
          className: "wallpaper-list",
          children: wallpaperPaths.map(WallpaperPreview),
          setup: (self) => {
            self.hook(barPosition, () => {
              const newStyle = styling();
              self.vertical = newStyle.value;
            });
          },
        }),
        setup: (self) => {
          self.hook(barPosition, () => {
            const newStyle = styling();
            self.hscroll = newStyle.hscroll;
            self.vscroll = newStyle.vscroll;
          });
        },
      }),
    });
  } catch (error) {
    return Box({
      className: "wallpaper-error",
      vexpand: true,
      hexpand: true,
      children: [
        Label({
          label: "Error loading wallpapers.",
          className: "txt-large txt-error",
        }),
      ],
    });
  }
};

export default () => {
  const contentContainer = Box({
    child: Box({
      vertical: true,
      className: "wallselect-content",
      child: createPlaceholder(),
      setup: async (self) => {
        self.child = await createContent();
      },
    }),
    setup: async (self) => {
      self.hook(useCorners, async () => {
        self.className = useCorners.value
          ? "wallselect-bg"
          : "wallselect-bg elevation";
      });
    },
  });
  const windowWidget = PopupWindow({
    keymode: "on-demand",
    name: "wallselect",
    child: Box({
      vertical: true,
      children: [
        upperCorners,
        Box({
          children: [leftCorners, contentContainer, rightCorners],
        }),
        lowerCorners,
      ],
    }),
    setup: (self) => {
      self.hook(barPosition, async () => {
        self.anchor = styling().anchors;
        if (opts.Vmode) {
          upperCorners.visible = false;
          lowerCorners.visible = false;
          if (antiVerticalAnchor() === "left") {
            rightCorners.visible = true;
            leftCorners.visible = false;
            upperCorners.visible = false;
            lowerCorners.visible = false;
          }
          if (antiVerticalAnchor() === "right") {
            rightCorners.visible = false;
            leftCorners.visible = true;
            upperCorners.visible = false;
            lowerCorners.visible = false;
          }
        } else {
          if (antiHorizontalAnchor() === "top") {
            leftCorners.visible = false;
            rightCorners.visible = false;
            upperCorners.visible = false;
            lowerCorners.visible = true;
          }
          if (antiHorizontalAnchor() === "bottom") {
            leftCorners.visible = false;
            rightCorners.visible = false;
            upperCorners.visible = true;
            lowerCorners.visible = false;
          }
        }
      });
    },
  });
  return windowWidget;
};
