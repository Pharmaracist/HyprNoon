import Mpris from "resource:///com/github/Aylur/ags/service/mpris.js";
import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { showMusicControls } from "../../../variables.js";
import GLib from 'gi://GLib';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import App from 'resource:///com/github/Aylur/ags/app.js';

const { Box, Label, EventBox, Button, Revealer } = Widget;

const findPlayer = () => {
  const players = Mpris.players;
  
  // Find any active player
  const activePlayer = players.find(p => p.trackTitle);
  if (activePlayer) return activePlayer;

  return Mpris.getPlayer("");
};

let lastScrollTime = 0;
const SCROLL_DELAY = 900; // 500ms delay between scroll actions

// Volume indicator timeout
let volumeTimeout = null;
const VOLUME_HIDE_DELAY = 1500; // 1.5 seconds

const showVolumeIndicator = (volume) => {
    // Convert volume to percentage
    const percentage = Math.round(volume * 100);
    
    // Show volume indicator
    Utils.execAsync(['notify-send', 
        '-t', '1500', 
        '-h', 'string:x-canonical-private-synchronous:volume', 
        '-h', `int:value:${percentage}`, 
        'Volume', 
        `${percentage}%`
    ]);
};

// Music Widget
export default () =>
  EventBox({
    className: "onSurface",
    onPrimaryClick: () => {
      App.toggleWindow('ipod');
    },
    setup: (self) => self.hook(Mpris, () => {
      const player = findPlayer();
      self.visible = true; // Always show the widget
    }),
    child: EventBox({
      onHover: (self) => {
        const player = findPlayer();
        if (player?.trackTitle) {
          self.child.children[2].revealChild = true;
        }
      },
      onHoverLost: (self) => {
        self.child.children[2].revealChild = false;
      },
      child: Box({
        hexpand: true,
        className: 'spacing-h-15',
        children: [
          EventBox({
            onScrollUp: (self, event) => {
              const currentTime = GLib.get_monotonic_time() / 1000;
              if (currentTime - lastScrollTime < SCROLL_DELAY) return true;
              
              const player = findPlayer();
              if (player) player.next();
              lastScrollTime = currentTime;
              return true; // Stop event propagation
            },
            onScrollDown: (self, event) => {
              const currentTime = GLib.get_monotonic_time() / 1000;
              if (currentTime - lastScrollTime < SCROLL_DELAY) return true;
              
              const player = findPlayer();
              if (player) player.previous();
              lastScrollTime = currentTime;
              return true; // Stop event propagation
            },
            child: Box({
              // className: 'bar-music-art',
              setup: (self) => {
                let lastCoverPath = '';
                
                const update = () => {
                  const mpris = findPlayer();
                  if (!mpris) {
                    self.css = `
                      margin:0  0.9rem 0 0.7rem;
                      min-width: 2.8rem;
                      background-image: -gtk-icontheme('audio-x-generic-symbolic');
                      background-size: 1.8rem;
                      background-position: center;
                      background-repeat: no-repeat;
                      border-radius: 16px;
                      opacity: 0.7;
                    `;
                    self.className = "onSurfaceVariant";
                    return;
                  }
                  const coverPath = mpris?.coverPath;
                  lastCoverPath = coverPath;
                  const defaultCSS = `
                       margin:0  0.9rem 0 0.7rem;
                      min-width: 2.8rem;
                      background-image: -gtk-icontheme('audio-x-generic-symbolic');
                      background-size: 1.8rem;
                      background-position: center;
                      background-repeat: no-repeat;
                      border-radius: 16px;
                      opacity: 0.7;
                  `;

                  if (coverPath) {
                    if (coverPath.startsWith('http')) {
                      Utils.fetch(coverPath)
                        .then(arr => {
                          const tmpPath = `/tmp/ags-music-cover-${Date.now()}.png`;
                          Utils.writeFile(arr, tmpPath);
                          self.css = `
                          min-width: 3.4rem;
                          background-image: url("file://${coverPath}");
                          background-size: 1rem;
                          background-position: center;
                          background-repeat: no-repeat;
                          background-size: cover;
                          border-radius: 16px;
                          margin:0.3rem 0.6rem 0.3rem 0.3rem;
                          box-shadow: 0 1px 2px rgba(0,0,0,0.1), 
                                      0 1.5px 2.5px rgba(0,0,0,0.1), 
                                      0 2px 4px rgba(0,0,0,0.1);
                      `;
                          // Cleanup old cover files
                          Utils.execAsync(['sh', '-c', 'rm -f /tmp/ags-music-cover-*.png']);
                        })
                        .catch(() => {
                          self.css = defaultCSS;
                        });
                    } else {
                      self.css = `
                      min-width: 3.4rem;
                      background-image: url("file://${coverPath}");
                      background-size: 1rem;
                      background-position: center;
                      background-repeat: no-repeat;
                      background-size: cover;
                      border-radius: 19px;
                      margin:0.3rem 0.6rem 0.3rem 0.3rem;
                      box-shadow: 0 1px 2px rgba(0,0,0,0.1), 
                                  0 1.5px 2.5px rgba(0,0,0,0.1), 
                                  0 2px 4px rgba(0,0,0,0.1);
                  `;
                }
                  } else {
                    self.css = defaultCSS;
                  }
                };

                // Update on player changes
                self.hook(Mpris, update);
                self.hook(Mpris, update, 'player-changed');
                
                // Force initial update
                update();

                self.connect('destroy', () => {
                  lastCoverPath = '';
                  // Cleanup all cover files on destroy
                  Utils.execAsync(['sh', '-c', 'rm -f /tmp/ags-music-cover-*.png']);
                });
              },
            }),
          }),
          Box({
            vertical: true,
            setup: (self) => {
            },
            vpack: "center",
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
                      // Walk up the widget tree to find the knocks container
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
                css:`opacity:0.6`,
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
          Revealer({
            revealChild: false,
            transition: 'slide_right',
            transitionDuration: 500,
            child: Box({
              className: 'bar-music-controls-overlay spacing-h-15',
              css: `
              margin-right:1.1rem
              `,
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
                  className: 'txt-larger  onSurfaceVariant',
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
                  className: 'txt-larger onSurfaceVariant ',
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