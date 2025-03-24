const { GLib, GdkPixbuf, Gdk } = imports.gi;
const { Box, Icon, Label, Button, Slider } = Widget;
import Audio from "resource:///com/github/Aylur/ags/service/audio.js";
import App from "resource:///com/github/Aylur/ags/app.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import PopupWindow from "../.widgethacks/popupwindow.js";
import { CornerBox } from "../.commonwidgets/cornerbox.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
import Mpris from "resource:///com/github/Aylur/ags/service/mpris.js";
import { AnimatedCircProg } from "../.commonwidgets/cairo_circularprogress.js";
import { hasPlasmaIntegration } from "../.miscutils/system.js";
import CavaService from "../../services/cava.js";
import { bluetoothPill } from "../.commonwidgets/statusicons.js";
import scrolledmodule from "../.commonwidgets/scrolledmodule.js";
let opts = userOptions.asyncGet();

export const getPlayer = (name = opts.music.preferredPlayer) =>
  Mpris.getPlayer(name) || Mpris.players[0] || null;

function lengthStr(length) {
  const min = Math.floor(length / 60);
  const sec = Math.floor(length % 60);
  const sec0 = sec < 10 ? "0" : "";
  return `${min}:${sec0}${sec}`;
}

function detectMediaSource(link) {
  if (link.startsWith("file://")) {
    if (link.includes("firefox-mpris")) return "󰈹  Firefox";
    return "󰎆   Lofi";
  }
  let url = link.replace(/(^\w+:|^)\/\//, "");
  let domainMatch = url.match(/(?:[a-z]+\.)?([a-z]+\.[a-z]+)/i);
  let domain = domainMatch ? domainMatch[1] : null;
  if (domain == "ytimg.com") return "󰗃   Youtube";
  if (domain == "discordapp.net") return "󰙯   Discord";
  if (domain == "scdn.co") return "   Spotify";
  if (domain == "sndcdn.com") return "󰓀   SoundCloud";
  return domain;
}

const DEFAULT_MUSIC_FONT = "Gabarito, sans-serif";
function getTrackfont(player) {
  const title = player.trackTitle;
  const artists = player.trackArtists.join(" ");
  if (
    artists.includes("TANO*C") ||
    artists.includes("USAO") ||
    artists.includes("Kobaryo")
  )
    return "Chakra Petch"; // Rigid square replacement
  if (title.includes("東方")) return "Crimson Text, serif"; // Serif for Touhou stuff
  return DEFAULT_MUSIC_FONT;
}

function trimTrackTitle(title) {
  if (!title) return "";
  const cleanPatterns = [
    /【[^】]*】/, // Remove certain bracketed text (e.g., Touhou/weeb stuff)
    " [FREE DOWNLOAD]",
  ];
  cleanPatterns.forEach((expr) => (title = title.replace(expr, "")));
  return title;
}

const TrackProgress = ({ player, ...rest }) => {
  const _updateProgress = (circprog) => {
    if (!player) {
      circprog.css = `font-size: 0px;`;
      return;
    }
    circprog.css = `font-size: ${Math.max(
      (player.position / player.length) * 100,
      0
    )}px;`;
  };
  return AnimatedCircProg({
    ...rest,
    className: "osd-music-circprog",
    vpack: "center",
    extraSetup: (self) =>
      self.hook(Mpris, _updateProgress).poll(3000, _updateProgress),
  });
};

const TrackTitle = ({ player, ...rest }) =>
  Label({
    ...rest,
    label: "Play Some Music",
    xalign: 0,
    truncate: "end",
    className: "osd-music-title txt-shadow",
    setup: (self) => {
      if (player) {
        self.hook(
          player,
          () => {
            self.label =
              player.trackTitle.length > 0
                ? trimTrackTitle(player.trackTitle)
                : "No media";
            const fontForThisTrack = getTrackfont(player);
            self.css = `font-family: ${fontForThisTrack}, ${DEFAULT_MUSIC_FONT};`;
          },
          "notify::track-title"
        );
      } else {
        self.label = "No music playing";
      }
    },
  });

const TrackArtists = ({ player, ...rest }) =>
  Label({
    ...rest,
    xalign: 0,
    label: "HyprNoon",
    className: "osd-music-artists txt-shadow",
    truncate: "end",
    setup: (self) => {
      if (player) {
        self.hook(
          player,
          () => {
            self.label =
              player.trackArtists.length > 0
                ? player.trackArtists.join(", ")
                : "";
          },
          "notify::track-artists"
        );
      } else {
        self.label = "";
      }
    },
  });

const CoverArt = ({ player, ...rest }) => {
  const DEFAULT_COVER_SIZE = 220;
  let currentCoverPath = null;
  const drawingArea = Widget.DrawingArea({
    className: "osd-music-cover-art shadow-window",
    vpack: "center",
    setup: (self) => {
      self.set_size_request(DEFAULT_COVER_SIZE, DEFAULT_COVER_SIZE);
      self.connect("draw", (widget, cr) => {
        if (!currentCoverPath) return;
        try {
          let pixbuf = GdkPixbuf.Pixbuf.new_from_file(currentCoverPath);
          const imgWidth = pixbuf.get_width();
          const imgHeight = pixbuf.get_height();
          const scale = Math.max(
            DEFAULT_COVER_SIZE / imgWidth,
            DEFAULT_COVER_SIZE / imgHeight
          );
          const newWidth = Math.round(imgWidth * scale);
          const newHeight = Math.round(imgHeight * scale);
          const offsetX = (DEFAULT_COVER_SIZE - newWidth) / 2;
          const offsetY = (DEFAULT_COVER_SIZE - newHeight) / 2;
          pixbuf = pixbuf.scale_simple(
            newWidth,
            newHeight,
            GdkPixbuf.InterpType.BILINEAR
          );
          const radius = 20;
          cr.arc(radius, radius, radius, Math.PI, 1.5 * Math.PI);
          cr.arc(
            DEFAULT_COVER_SIZE - radius,
            radius,
            radius,
            1.5 * Math.PI,
            2 * Math.PI
          );
          cr.arc(
            DEFAULT_COVER_SIZE - radius,
            DEFAULT_COVER_SIZE - radius,
            radius,
            0,
            0.5 * Math.PI
          );
          cr.arc(
            radius,
            DEFAULT_COVER_SIZE - radius,
            radius,
            0.5 * Math.PI,
            Math.PI
          );
          cr.closePath();
          cr.clip();
          Gdk.cairo_set_source_pixbuf(cr, pixbuf, offsetX, offsetY);
          cr.paint();
        } catch (e) {
          console.error("Error drawing cover art:", e);
        }
      });
    },
  });
  let fallbackIcon = Icon({
    className: "onSurfaceVariant",
    icon: "logo-symbolic",
    css: `min-width:235px;min-height:235px`,
    size: "164",
    visible: false,
  });
  return Widget.Box({
    ...rest,
    css: `margin-right:1.5rem;`,
    child: Widget.Overlay({
      child: fallbackIcon,
      overlays: [drawingArea],
    }),
    setup: (self) => {
      const updateCover = () => {
        if (!player || player.playBackStatus !== "Playing") {
          currentCoverPath = null;
          drawingArea.queue_draw();
          return;
        }
        if (!player.coverPath) {
          currentCoverPath = null;
          drawingArea.queue_draw();
          return;
        }
        const newPath = player.coverPath;
        if (newPath === currentCoverPath) return;
        currentCoverPath = newPath;
        if (newPath.startsWith("http")) {
          Utils.fetch(newPath)
            .then((filePath) => {
              currentCoverPath = filePath;
              drawingArea.queue_draw();
            })
            .catch(() => {
              currentCoverPath = null;
            });
        } else {
          drawingArea.queue_draw();
        }
      };
      if (player) {
        self.hook(player, updateCover, "notify::cover-path");
        self.hook(
          player,
          () => {
            if (!player.playBackStatus) updateCover();
          },
          "notify::play-back-status"
        );
      }
      updateCover();
    },
  });
};

const TrackControls = ({ player, ...rest }) =>
  Widget.Revealer({
    revealChild: true,
    transition: "slide_right",
    transitionDuration: opts.animations.durationLarge,
    child: Widget.Box({
      ...rest,
      vpack: "center",
      className: "osd-music-controls spacing-h-3",
      children: [
        Button({
          className: "osd-music-controlbtn",
          onClicked: () =>
            player && player.previous ? player.previous() : null,
          child: Label({
            className: "icon-material osd-music-controlbtn-txt",
            label: "skip_previous",
          }),
        }),
        Button({
          className: "osd-music-controlbtn",
          onClicked: () => (player && player.next ? player.next() : null),
          child: Label({
            className: "icon-material osd-music-controlbtn-txt",
            label: "skip_next",
          }),
        }),
        Button({
          className: "osd-music-controlbtn",
          onClicked: () =>
            Utils.execAsync(["bash", "-c", "killall vlc"]).catch(print),
          child: Label({
            className: "icon-material osd-music-controlbtn-txt",
            label: "close",
          }),
        }),
      ],
    }),
    setup: (self) => {
      self.revealChild = true;
    },
  });

// === New Volume Slider using Audio.speaker (as in the previous widget) ===
const VolumeSlider = () =>
  Box({
    children: [
      Box({
        hexpand: true,
        vpack: "center",
        vertical: true,
        className: "spacing-v-5",
        children: [
          Slider({
            drawValue: false,
            hpack: "fill",
            className: "sidebar-volmixer-stream-slider",
            value: Audio.speaker.volume,
            min: 0,
            max: 1,
            onChange: ({ value }) => {
              Audio.speaker.volume = value;
            },
            setup: (self) =>
              self.hook(Audio.speaker, () => {
                self.value = Audio.speaker.volume;
              }),
          }),
        ],
      }),
    ],
  });
const TrackSource = ({ player, ...rest }) => {
  const notchContent = Box({
    hpack: "center",
    hexpand: true,
    children: [
      Label({
        hpack: "start",
        opacity: 0.6,
        className: "txt-large onSurfaceVariant",
        setup: (self) => {
          if (player) {
            self.hook(
              player,
              () => {
                self.label = detectMediaSource(player.trackCoverUrl);
              },
              "notify::cover-path"
            );
          } else {
            self.label = "";
          }
        },
      }),
      bluetoothPill({
        hpack: "end",
        opacity: 0.6,
        className: "txt-large onSurfaceVariant",
      }),
    ],
  });
  let content = Widget.Box({
    ...rest,
    css: "margin-top: -1rem;margin-right:2.8rem",
    hpack: "end",
    vpack: "start",
    vexpand: true,
    hexpand: true,
    children: [
      CornerBox("topright", "start", { className: "corner-amberoled" }),
      Box({
        className: "osd-music-pill-container",
        css: "min-width:15rem;min-height:3rem",
        children: [
          scrolledmodule({
            spacing: 100,
            children: [VolumeSlider(), notchContent],
          }),
        ],
      }),
      CornerBox("topleft", "start", { className: "corner-amberoled" }),
    ],
  });
  return content;
};

const TrackTime = ({ player, ...rest }) =>
  Widget.Revealer({
    revealChild: true,
    transition: "slide_left",
    transitionDuration: opts.animations.durationLarge,
    child: Widget.Box({
      ...rest,
      vpack: "center",
      className: "osd-music-pill spacing-h-5",
      children: [
        Label({
          setup: (self) => {
            if (player) {
              self.poll(1000, () => {
                self.label = lengthStr(player.position);
              });
            } else {
              self.label = "0:00";
            }
          },
        }),
        Label({ label: "/" }),
        Label({
          setup: (self) => {
            if (player) {
              self.hook(
                player,
                () => {
                  self.label = lengthStr(player.length);
                },
                "notify::track-artists"
              );
            } else {
              self.label = "0:00";
            }
          },
        }),
      ],
    }),
  });

const PlayState = ({ player }) => {
  const trackCircProg = TrackProgress({ player: player });
  return Widget.Button({
    className: "osd-music-playstate",
    onClicked: () => {
      if (player && player.playPause) {
        player.playPause();
      }
    },
    child: Widget.Overlay({
      child: trackCircProg,
      overlays: [
        Widget.Button({
          className: "osd-music-playstate-btn",
          onClicked: () => {
            if (player && player.playPause) {
              player.playPause();
            }
          },
          child: Widget.Label({
            justification: "center",
            hpack: "fill",
            vpack: "center",
            setup: (self) => {
              if (player) {
                self.hook(
                  player,
                  () => {
                    self.label = `${
                      player.playBackStatus == "Playing"
                        ? "pause"
                        : "play_arrow"
                    }`;
                  },
                  "notify::play-back-status"
                );
              } else {
                self.label = "play_arrow";
              }
            },
          }),
        }),
      ],
      passThrough: true,
    }),
  });
};

const CavaVisualizer = () => {
  const bars = Array(40)
    .fill(0)
    .map(() =>
      Widget.Box({
        className: "cava-bar cava-bar-low",
        hpack: "center",
        vpack: "center",
        hexpand: true,
      })
    );

  let cavaHook = null;
  let visualizer = null;

  const startCava = () => {
    if (cavaHook || !visualizer) return;
    CavaService.start();

    const updateBars = () => {
      const output = CavaService.output;
      if (!output || typeof output !== "string") return;

      const values = output.split("");
      const step = Math.floor(values.length / bars.length);

      bars.forEach((bar, i) => {
        const value = values[i * step]?.charCodeAt(0) - 9601 || 0;
        const height = Math.max(1, value * 28);

        const intensity = value > 1.5 ? "high" : value > 0.5 ? "med" : "low";
        bar.className = `cava-bar cava-bar-${intensity}`;
        bar.css = `
                  min-height: ${height}px;
                  min-width: 10px;
                  border-radius: 4px;
              `;
      });
    };

    cavaHook = CavaService.connect("output-changed", updateBars);
  };

  const stopCava = () => {
    if (!cavaHook) return;

    try {
      CavaService.stop();
      if (cavaHook > 0) {
        CavaService.disconnect(cavaHook);
      }
    } catch (e) {}

    cavaHook = null;

    bars.forEach((bar) => {
      bar.className = "cava-bar cava-bar-low";
      bar.css = `
              min-height: 0px;
              min-width: 0px;
              border-radius: 4px;
          `;
    });
  };
  const checkAndUpdateCava = () => {
    const player = Mpris.getPlayer();
    // Only run the visualizer when the widget is visible and the track is playing.
    // Using visualizer.get_visible() ensures the widget is actually shown.
    const shouldRun =
      visualizer &&
      visualizer.get_visible() &&
      player?.playBackStatus === "Playing";

    if (shouldRun) {
      startCava();
    } else {
      stopCava();
    }
  };

  return Widget.Box({
    className: "cava-visualizer",
    spacing: 4,
    children: bars,
    setup: (self) => {
      visualizer = self;

      // self.hook(showMusicControls, checkAndUpdateCava);
      self.hook(Mpris, checkAndUpdateCava);

      Utils.timeout(1000, checkAndUpdateCava);

      self.connect("destroy", () => {
        stopCava();
        visualizer = null;
      });

      self.connect("unrealize", () => {
        stopCava();
        visualizer = null;
      });
    },
  });
};

const createContent = (player) =>
  Widget.Overlay({
    child: Box({
      className: "osd-music-mask cava-container",
      hexpand: true,
      vexpand: true,
      child: opts.etc.cava.enabled ? CavaVisualizer() : null,
    }),
    overlays: [
      Box({
        // className: "osd-music-mask",
        child: Box({
          spacing: 10,
          css: "margin-left:3rem",
          children: [
            CoverArt({ player }),
            Box({
              vertical: true,
              className: "spacing-v-5 osd-music-info",
              children: [
                Box({
                  children: [
                    Box({
                      vertical: true,
                      vpack: "center",
                      hpack: "start",
                      children: [
                        TrackTitle({ player }),
                        TrackArtists({ player }),
                      ],
                    }),
                    TrackSource({ player, vpack: "center" }),
                  ],
                }),
                Box({ vexpand: true }),
                Box({
                  className: "spacing-h-10",
                  children: [
                    TrackControls({ player }),
                    Widget.Box({ hexpand: true }),
                    ...(hasPlasmaIntegration ? [TrackTime({ player })] : []),
                    PlayState({ player }),
                  ],
                }),
                // Use the Audio.speaker-based VolumeSlider
              ],
            }),
          ],
        }),
      }),
    ],
  });

const musicWidget = () => {
  let currentPlayer = getPlayer();
  return Box({
    css: `min-height:260px;`,
    className: "osd-music",
    vexpand: true,
    setup: (self) => {
      const updateChildren = () => {
        currentPlayer = getPlayer();
        self.children = [createContent(currentPlayer)];
      };
      self.hook(Mpris, updateChildren, "notify::players");
      updateChildren();
      self.hook(
        useCorners,
        () =>
          (self.className = useCorners.value
            ? "osd-music"
            : "osd-music elevation")
      );
    },
  });
};

export default () =>
  PopupWindow({
    keymode: "on-demand",
    anchor: ["bottom", "right", "left"],
    layer: "top",
    name: "music",
    child: Box({
      vertical: true,
      children: [
        Box({
          children: [
            CornerBox("bottomleft", "start"),
            Box({ hexpand: true }),
            CornerBox("bottomright", "start"),
          ],
        }),
        musicWidget(),
      ],
    }),
  });
