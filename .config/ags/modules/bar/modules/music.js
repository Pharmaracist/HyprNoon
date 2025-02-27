import Mpris from "resource:///com/github/Aylur/ags/service/mpris.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import GLib from 'gi://GLib';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import App from 'resource:///com/github/Aylur/ags/app.js';
import GdkPixbuf from 'gi://GdkPixbuf';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Gdk from 'gi://Gdk';

const { Box, Label, EventBox, Button, Revealer } = Widget;

// Desired dimensions and rounded corner settings.
const COVER_WIDTH = 50;
const COVER_HEIGHT = 20;
const CORNER_RADIUS = 20;

const findPlayer = () => {
  const players = Mpris.players;
  const activePlayer = players.find(p => p.trackTitle);
  if (activePlayer) return activePlayer;
  return Mpris.getPlayer("");
};

let lastScrollTime = 0;
const SCROLL_DELAY = 900;

const createRoundedAlbumCoverWidget = () =>
  EventBox({
    setup: (self) => {
      // Create a Gtk.DrawingArea with fixed dimensions.
      const drawingArea = new Gtk.DrawingArea();
      drawingArea.set_size_request(COVER_WIDTH, COVER_HEIGHT);
      self.add(drawingArea);

      // Holds the original loaded pixbuf (without scaling).
      let currentPixbufOriginal = null;
      // Holds our fallback icon pixbuf.
      let fallbackPixbuf = null;

      // Load and update the cover image.
      const updateCover = () => {
        const mpris = findPlayer();
        if (!mpris || !mpris.coverPath) {
          currentPixbufOriginal = null;
          drawingArea.queue_draw();
          return;
        }
        const coverPath = mpris.coverPath;
        if (coverPath.startsWith('http')) {
          try {
            const file = Gio.File.new_for_uri(coverPath);
            file.read_async(GLib.PRIORITY_DEFAULT, null, (source, res) => {
              try {
                const stream = source.read_finish(res);
                GdkPixbuf.Pixbuf.new_from_stream_async(
                  stream,
                  null,
                  (pixSource, pixRes) => {
                    try {
                      const pixbuf = GdkPixbuf.Pixbuf.new_from_stream_finish(pixSource, pixRes);
                      currentPixbufOriginal = pixbuf;
                      drawingArea.queue_draw();
                    } catch (e) {
                      currentPixbufOriginal = null;
                      drawingArea.queue_draw();
                    }
                  }
                );
              } catch (e) {
                currentPixbufOriginal = null;
                drawingArea.queue_draw();
              }
            });
          } catch (e) {
            currentPixbufOriginal = null;
            drawingArea.queue_draw();
          }
        } else {
          // For local files, load synchronously in an idle callback.
          GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
            try {
              const pixbuf = GdkPixbuf.Pixbuf.new_from_file(coverPath);
              currentPixbufOriginal = pixbuf;
            } catch (e) {
              currentPixbufOriginal = null;
            }
            drawingArea.queue_draw();
            return GLib.SOURCE_REMOVE;
          });
        }
      };

      // Draw the pixbuf (or fallback icon) clipped with rounded corners.
      drawingArea.connect("draw", (widget, cr) => {
        const frameWidth = widget.get_allocated_width();
        const frameHeight = widget.get_allocated_height();

        // Create a rounded rectangle clipping path.
        cr.arc(CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS, Math.PI, 1.5 * Math.PI);
        cr.arc(frameWidth - CORNER_RADIUS, CORNER_RADIUS, CORNER_RADIUS, 1.5 * Math.PI, 2 * Math.PI);
        cr.arc(frameWidth - CORNER_RADIUS, frameHeight - CORNER_RADIUS, CORNER_RADIUS, 0, 0.5 * Math.PI);
        cr.arc(CORNER_RADIUS, frameHeight - CORNER_RADIUS, CORNER_RADIUS, 0.5 * Math.PI, Math.PI);
        cr.closePath();
        cr.clip();

        if (currentPixbufOriginal) {
          // Calculate scale factor to "cover" the widget while preserving aspect ratio.
          const origWidth = currentPixbufOriginal.get_width();
          const origHeight = currentPixbufOriginal.get_height();
          const scaleFactor = Math.max(frameWidth / origWidth, frameHeight / origHeight);
          const newWidth = Math.ceil(origWidth * scaleFactor);
          const newHeight = Math.ceil(origHeight * scaleFactor);
          const offsetX = (frameWidth - newWidth) / 2;
          const offsetY = (frameHeight - newHeight) / 2;
          const scaledPixbuf = currentPixbufOriginal.scale_simple(newWidth, newHeight, GdkPixbuf.InterpType.BILINEAR);
          Gdk.cairo_set_source_pixbuf(cr, scaledPixbuf, offsetX, offsetY);
          cr.paint();
        } else {
          // Load fallback icon (if not loaded already).
          if (!fallbackPixbuf) {
            try {
              fallbackPixbuf = Gtk.IconTheme.get_default().load_icon("audio-x-generic-symbolic", COVER_WIDTH / 1.7, 0);
            } catch (e) {
              fallbackPixbuf = null;
            }
          }
          if (fallbackPixbuf) {
            const fbWidth = fallbackPixbuf.get_width();
            const fbHeight = fallbackPixbuf.get_height();
            Gdk.cairo_set_source_pixbuf(cr, fallbackPixbuf,
              frameWidth / 2 - fbWidth / 2,
              frameHeight / 2 - fbHeight / 2
            );
            cr.paint();
          } else {
            // Fallback: fill with a solid color.
            cr.setSourceRGB(0.8, 0.8, 0.8);
            cr.rectangle(0, 0, frameWidth, frameHeight);
            cr.fill();
          }
        }
        return false;
      });

      // Update the cover when Mpris events occur.
      self.hook(Mpris, updateCover);
      self.hook(Mpris, updateCover, 'player-changed');
      updateCover();
    },
  });

export default () =>
  EventBox({
    className: "onSurface",
    onPrimaryClick: () => {
      App.toggleWindow('music');
    },
    setup: (self) => {
      self.hook(Mpris, () => { self.visible = true; });
    },
    child: EventBox({
      onHover: (self) => {
        const player = findPlayer();
        if (player?.trackTitle) {
          self.child.children[2].revealChild = true;
        }
      },
      onHoverLost: (self) => { self.child.children[2].revealChild = false; },
      child: Box({
        hexpand: true,
        className: 'spacing-h-15',
        children: [
          // Album cover widget with scroll actions.
          EventBox({
            onScrollUp: (self, event) => {
              const currentTime = GLib.get_monotonic_time() / 1000;
              if (currentTime - lastScrollTime < SCROLL_DELAY) return true;
              const player = findPlayer();
              if (player) player.next();
              lastScrollTime = currentTime;
              return true;
            },
            onScrollDown: (self, event) => {
              const currentTime = GLib.get_monotonic_time() / 1000;
              if (currentTime - lastScrollTime < SCROLL_DELAY) return true;
              const player = findPlayer();
              if (player) player.previous();
              lastScrollTime = currentTime;
              return true;
            },
            child: createRoundedAlbumCoverWidget(),
          }),
          // Song title and artist info.
          Box({
            vertical: true,
            vpack: "center",
            css: `margin-left:0.7rem`,
            vexpand: true,
            children: [
              Label({
                className: "onSurfaceVariant txt-large",
                truncate: "end",
                xalign: 0,
                maxWidthChars: 12,
                justification: "left",
                hexpand: true,
                setup: (self) => {
                  let lastTitle = '';
                  const update = () => {
                    const mpris = findPlayer();
                    if (!mpris?.trackTitle) {
                      self.label = "No media playing";
                      self.className = "onSurfaceVariant txt-norm";
                      return;
                    }
                    self.className = "onSurfaceVariant txt-large";
                    const newTitle = mpris.trackTitle;
                    if (newTitle !== lastTitle) {
                      self.label = newTitle;
                      let current = self;
                      while (current && !current.className?.includes('bar-knocks')) {
                        current = current.get_parent();
                      }
                      if (current) {
                        current.toggleClassName('song-changing', true);
                        Utils.timeout(3000, () => {
                          current.toggleClassName('song-changing', false);
                        });
                      }
                      lastTitle = newTitle;
                    }
                  };
                  self.hook(Mpris, update);
                },
              }),
              Label({
                className: "bar-music-txt txt-smallie",
                truncate: "end",
                css: `opacity:0.6`,
                xalign: 0,
                justification: "left",
                maxWidthChars: 8,
                setup: (self) => {
                  let lastArtist = '';
                  const update = () => {
                    const mpris = findPlayer();
                    if (!mpris?.trackArtists) {
                      self.label = "Not playing";
                      self.className = "bar-music-txt txt-smallie onSurfaceVariant";
                      return;
                    }
                    const newArtist = mpris.trackArtists.join(', ') || "Unknown artist";
                    if (newArtist !== lastArtist) {
                      self.label = newArtist;
                      lastArtist = newArtist;
                    }
                  };
                  self.hook(Mpris, update);
                },
              }),
            ],
          }),
          // Control buttons.
          Revealer({
            revealChild: false,
            transition: 'slide_right',
            transitionDuration: 500,
            child: Box({
              className: 'bar-music-controls-overlay spacing-h-15',
              css: `margin-right:1.1rem`,
              hpack: "end",
              children: [
                Button({
                  className: 'txt-larger onSurfaceVariant',
                  label: '󰒮',
                  onClicked: () => {
                    const player = findPlayer();
                    if (player) player.previous();
                  },
                }),
                Button({
                  className: 'txt-larger onSurfaceVariant',
                  setup: (self) => {
                    const update = () => {
                      const player = findPlayer();
                      self.label = player?.playBackStatus === 'Playing' ? '󰏤' : '󰐊';
                    };
                    self.hook(Mpris, update, 'player-changed');
                    update();
                  },
                  onClicked: () => {
                    const player = findPlayer();
                    if (player) player.playPause();
                  },
                }),
                Button({
                  className: 'txt-larger onSurfaceVariant',
                  label: '󰒭',
                  onClicked: () => {
                    const player = findPlayer();
                    if (player) player.next();
                  },
                }),
              ],
            }),
          }),
        ],
      }),
    }),
  });
