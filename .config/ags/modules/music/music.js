const { GLib, Gtk, GdkPixbuf, Gdk } = imports.gi;
import PopupWindow from '../.widgethacks/popupwindow.js';
import App from 'resource:///com/github/Aylur/ags/app.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import Mpris from 'resource:///com/github/Aylur/ags/service/mpris.js';
const { exec, execAsync } = Utils;
const { Box, EventBox, Icon, Scrollable, Label, Button, Revealer } = Widget;
import { RoundedCorner } from '../.commonwidgets/cairo_roundedcorner.js';
import { fileExists } from '../.miscutils/files.js';
import { bluetoothPill } from '../.commonwidgets/statusicons.js';
import { AnimatedCircProg } from "../.commonwidgets/cairo_circularprogress.js";
import { darkMode, hasPlasmaIntegration } from '../.miscutils/system.js';
import CavaService from '../../services/cava.js';
import clickCloseRegion from '../.commonwidgets/clickcloseregion.js';
const COMPILED_STYLE_DIR = `${GLib.get_user_cache_dir()}/ags/user/generated`
const LIGHTDARK_FILE_LOCATION = `${GLib.get_user_state_dir()}/ags/user/colormode.txt`;
const colorMode = Utils.exec(`bash -c "sed -n '1p' '${LIGHTDARK_FILE_LOCATION}'"`);
const lightDark = (colorMode == "light") ? '-l' : '';
const COVER_COLORSCHEME_SUFFIX = '_colorscheme.css';
const elevate = userOptions.asyncGet().etc.widgetCorners ? "osd-round osd-music " : "elevation elevate-music osd-music" ;
const mode = userOptions.asyncGet().etc.enableAmberol ? "amberoled " : "normal-music" ;

var lastCoverPath = '';


export const getPlayer = (name = userOptions.asyncGet().music.preferredPlayer) =>
    Mpris.getPlayer(name) || Mpris.players[0] || null;

function lengthStr(length) {
    const min = Math.floor(length / 60);
    const sec = Math.floor(length % 60);
    const sec0 = sec < 10 ? '0' : '';
    return `${min}:${sec0}${sec}`;
}

function detectMediaSource(link) {
    if (link.startsWith("file://")) {
        if (link.includes('firefox-mpris'))
            return '󰈹  Firefox'
        return "󰎆   Lofi";
    }
    let url = link.replace(/(^\w+:|^)\/\//, '');
    let domain = url.match(/(?:[a-z]+\.)?([a-z]+\.[a-z]+)/i)[1];
    if (domain == 'ytimg.com') return '󰗃   Youtube';
    if (domain == 'discordapp.net') return '󰙯   Discord';
    if (domain == 'scdn.co') return '   Spotify';
    if (domain == 'sndcdn.com') return '󰓀   SoundCloud';
    return domain;
}

const DEFAULT_MUSIC_FONT = 'Gabarito, sans-serif';
function getTrackfont(player) {
    const title = player.trackTitle;
    const artists = player.trackArtists.join(' ');
    if (artists.includes('TANO*C') || artists.includes('USAO') || artists.includes('Kobaryo'))
        return 'Chakra Petch'; // Rigid square replacement
    if (title.includes('東方'))
        return 'Crimson Text, serif'; // Serif for Touhou stuff
    return DEFAULT_MUSIC_FONT;
}

function trimTrackTitle(title) {
    if (!title) return '';
    const cleanPatterns = [
        /【[^】]*】/,         // Remove certain bracketed text (e.g., Touhou/weeb stuff)
        " [FREE DOWNLOAD]",  // Remove literal text such as F-777's suffix
    ];
    cleanPatterns.forEach((expr) => title = title.replace(expr, ''));
    return title;
}

const TrackProgress = ({ player, ...rest }) => {
    const _updateProgress = (circprog) => {
        if (!player) {
            circprog.css = `font-size: 0px;`;
            return;
        }
        // Update circular progress; the font size scales with playback progress.
        circprog.css = `font-size: ${Math.max(player.position / player.length * 100, 0)}px;`
    }
    return AnimatedCircProg({
        ...rest,
        className: 'osd-music-circprog',
        vpack: 'center',
        extraSetup: (self) => self
            .hook(Mpris, _updateProgress)
            .poll(3000, _updateProgress)
    })
}

const TrackTitle = ({ player, ...rest }) => Label({
    ...rest,
    label: 'Play Some Music',
    xalign: 0,
    truncate: 'end',
    className: 'osd-music-title txt-shadow',
    setup: (self) => {
        if (player) {
            self.hook(player, (self) => {
                self.label = player.trackTitle.length > 0 ? trimTrackTitle(player.trackTitle) : 'No media';
                const fontForThisTrack = getTrackfont(player);
                self.css = `font-family: ${fontForThisTrack}, ${DEFAULT_MUSIC_FONT};`;
            }, 'notify::track-title');
        } else {
            self.label = 'No music playing';
        }
    },
});

const TrackArtists = ({ player, ...rest }) => Label({
    ...rest,
    xalign: 0,
    label: 'HyprNoon',
    className: 'osd-music-artists txt-shadow',
    truncate: 'end',
    setup: (self) => {
        if (player) {
            self.hook(player, (self) => {
                self.label = player.trackArtists.length > 0 ? player.trackArtists.join(', ') : '';
            }, 'notify::track-artists');
        } else {
            self.label = '';
        }
    },
})

const CoverArt = ({ player, ...rest }) => {
    const DEFAULT_COVER_SIZE = 235;
    let currentCoverPath = null;
    const drawingArea = Widget.DrawingArea({
        className: 'osd-music-cover-art shadow-window',
        vpack:"center",
        setup: (self) => {
            self.set_size_request(DEFAULT_COVER_SIZE, DEFAULT_COVER_SIZE);
            self.connect("draw", (widget, cr) => {
                if (!currentCoverPath) return;
                try {
                    // Load the full image
                    let pixbuf = GdkPixbuf.Pixbuf.new_from_file(currentCoverPath);
                    const imgWidth = pixbuf.get_width();
                    const imgHeight = pixbuf.get_height();
                    // Calculate scale factor to cover the area
                    const scale = Math.max(DEFAULT_COVER_SIZE / imgWidth, DEFAULT_COVER_SIZE / imgHeight);
                    const newWidth = Math.round(imgWidth * scale);
                    const newHeight = Math.round(imgHeight * scale);
                    // Center the image: calculate offsets so the image is centered in the square
                    const offsetX = (DEFAULT_COVER_SIZE - newWidth) / 2;
                    const offsetY = (DEFAULT_COVER_SIZE - newHeight) / 2;
                    // Scale the image to the new dimensions
                    pixbuf = pixbuf.scale_simple(newWidth, newHeight, GdkPixbuf.InterpType.BILINEAR);
            
                    // Create rounded corners clip region
                    const radius = 20;
                    cr.arc(radius, radius, radius, Math.PI, 1.5 * Math.PI);
                    cr.arc(DEFAULT_COVER_SIZE - radius, radius, radius, 1.5 * Math.PI, 2 * Math.PI);
                    cr.arc(DEFAULT_COVER_SIZE - radius, DEFAULT_COVER_SIZE - radius, radius, 0, 0.5 * Math.PI);
                    cr.arc(radius, DEFAULT_COVER_SIZE - radius, radius, 0.5 * Math.PI, Math.PI);
                    cr.closePath();
                    cr.clip();
            
                    // Paint the scaled image, centered within the area
                    Gdk.cairo_set_source_pixbuf(cr, pixbuf, offsetX, offsetY);
                    cr.paint();
                } catch (e) {
                    console.error('Error drawing cover art:', e);
                }
            });
            
        }
    });
    let fallbackIcon = Icon({
        className: 'sec-txt',
        icon: 'hyprlunaris-symbolic',
        css:`min-width:235px;min-height:235px`,
        size:"164",
        visible:false
    });
    return Widget.Box({
        ...rest,
        css:`margin-right:1.5rem;`,
        child: Widget.Overlay({
            child:fallbackIcon ,
            overlays: [drawingArea]
        }),
        setup: (self) => {
            const updateCover = () => {
                // If there's no player or the player isn't actively playing, hide the fallback icon.
                if (!player || player.playBackStatus !== 'Playing') {
                    currentCoverPath = null;
                    drawingArea.queue_draw();
                    return;
                }
                
                // If the player exists and is playing but has no coverPath, show the fallback icon.
                if (!player.coverPath) {
                    currentCoverPath = null;
                    drawingArea.queue_draw();
                    return;
                }
                
                // If the cover path has changed, update it.
                const newPath = player.coverPath;
                if (newPath === currentCoverPath) return;
                
                currentCoverPath = newPath;
                
                if (newPath.startsWith('http')) {
                    Utils.fetch(newPath)
                        .then(filePath => {
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
                self.hook(player, updateCover, 'notify::cover-path');
                self.hook(player, () => {
                    if (!player.playBackStatus) updateCover();
                }, 'notify::play-back-status');
            }
            
            // Initial update
            updateCover();
        }
    });
};


const TrackControls = ({ player, ...rest }) => Widget.Revealer({
    // Always reveal controls regardless of whether a player is available.
    revealChild: true,
    transition: 'slide_right',
    transitionDuration: userOptions.asyncGet().animations.durationLarge,
    child: Widget.Box({
        ...rest,
        vpack: 'center',
        className: 'osd-music-controls spacing-h-3',
        children: [
            Button({
                className: 'osd-music-controlbtn',
                onClicked: () => (player && player.previous ? player.previous() : null),
                child: Label({
                    className: 'icon-material osd-music-controlbtn-txt',
                    label: 'skip_previous',
                })
            }),
            // Button({
            //     className: 'osd-music-controlbtn',
            //     child: Widget.Label({
            //         className: 'icon-material osd-music-controlbtn-txt',
            //         label: 'shuffle',
            //     }),
            //     setup: function(self) {
            //         self.hook(Mpris, () => {
            //             const player = getPlayer();
            //             if (!player) return;
            
            //             // Update button state based on shuffle status
            //             self.toggleClassName('active', player.shuffleStatus);
            //         });
            //     },
            //     onClicked: function() {
            //         const player = getPlayer();
            //         if (!player) return;
            
            //         // Toggle shuffle state using playerctl
            //         const newState = !player.shuffleStatus;
            //         Utils.execAsync(['playerctl', 'shuffle', newState ? 'On' : 'Off'])
            //             .catch(err => console.error('Failed to set shuffle:', err));
            
            //         // Update button appearance immediately
            //         this.toggleClassName('active', newState);
            //     },
            // }),
            // Button({
            //     className: 'osd-music-controlbtn',
            //     child: Widget.Label({
            //         className: 'icon-material osd-music-controlbtn-txt',
            //         label: 'repeat',
            //     }),
            //     setup: function(self) {
            //         self.hook(Mpris, () => {
            //             const player = getPlayer();
            //             if (!player) return;
            
            //             // Update button state based on loop status
            //             const status = player.loopStatus || 'None';
            //             self.child.label = status === 'None' ? 'repeat' : 
            //                               status === 'Track' ? 'repeat_one' : 'repeat';
            //             self.toggleClassName('active', status !== 'None');
            //         });
            //     },
            //     onClicked: function() {
            //         const player = getPlayer();
            //         if (!player) return;
            
            //         // Cycle through loop states using playerctl
            //         const currentStatus = player.loopStatus || 'None';
            //         let newStatus;
            //         switch (currentStatus) {
            //             case 'None':
            //                 newStatus = 'Track';
            //                 break;
            //             case 'Track':
            //                 newStatus = 'Playlist';
            //                 break;
            //             default:
            //                 newStatus = 'None';
            //         }
            
            //         Utils.execAsync(['playerctl', 'loop', newStatus])
            //             .catch(err => console.error('Failed to set loop status:', err));
            
            //         // Update button appearance immediately
            //         this.child.label = newStatus === 'None' ? 'repeat' : 
            //                           newStatus === 'Track' ? 'repeat_one' : 'repeat';
            //         this.toggleClassName('active', newStatus !== 'None');
            //     },
            // }),

            Button({
                className: 'osd-music-controlbtn',
                onClicked: () => (player && player.next ? player.next() : null),
                child: Label({
                    className: 'icon-material osd-music-controlbtn-txt',
                    label: 'skip_next',
                })
            }),
            Button({
                className: 'osd-music-controlbtn',
                onClicked: () => Utils.execAsync(['bash', '-c', 'killall vlc']).catch(print),
                child: Label({
                    className: 'icon-material osd-music-controlbtn-txt',
                    label: 'close',
                })
            }),
        ],
    }),
    setup: (self) => {
        // No need to hide controls when no player exists.
        self.revealChild = true;
    },
});

const TrackSource = ({ player, ...rest }) => Widget.Revealer({
    revealChild: true, // Always reveal
    transition: 'slide_left',
    transitionDuration: userOptions.asyncGet().animations.durationLarge,
    child: Widget.Box({
        ...rest,
        homogeneous: true,
        children: [
            Label({
                hpack: 'start',
                opacity: 0.6,
                css:`margin-top:0.75rem`,
                className: 'txt-large onSurfaceVariant',
                setup: (self) => {
                    if (player) {
                        self.hook(player, (self) => {
                            self.label = detectMediaSource(player.trackCoverUrl);
                        }, 'notify::cover-path');
                    } else {
                        self.label = '';
                    }
                },
            }),
        ],
    }),
});

const TrackTime = ({ player, ...rest }) => {
    return Widget.Revealer({
        revealChild: true,
        transition: 'slide_left',
        transitionDuration: userOptions.asyncGet().animations.durationLarge,
        child: Widget.Box({
            ...rest,
            vpack: 'center',
            className: 'osd-music-pill spacing-h-5',
            children: [
                Label({
                    setup: (self) => {
                        if (player) {
                            self.poll(1000, (self) => {
                                self.label = lengthStr(player.position);
                            });
                        } else {
                            self.label = '0:00';
                        }
                    },
                }),
                Label({ label: '/' }),
                Label({
                    setup: (self) => {
                        if (player) {
                            self.hook(player, (self) => {
                                self.label = lengthStr(player.length);
                            }, 'notify::track-artists');
                        } else {
                            self.label = '0:00';
                        }
                    },
                }),
            ],
        }),
    })
}

const PlayState = ({ player }) => {
    const trackCircProg = TrackProgress({ player: player });
    return Widget.Button({
        className: 'osd-music-playstate',
        onClicked: () => {
            if (player && player.playPause) {
                player.playPause();
            }
        },
        child: Widget.Overlay({
            child: trackCircProg,
            overlays: [
                Widget.Button({
                    className: 'osd-music-playstate-btn',
                    onClicked: () => {
                        if (player && player.playPause) {
                            player.playPause();
                        }
                    },
                    child: Widget.Label({
                        justification: 'center',
                        hpack: 'fill',
                        vpack: 'center',
                        setup: (self) => {
                            if (player) {
                                self.hook(player, (label) => {
                                    label.label = `${player.playBackStatus == 'Playing' ? 'pause' : 'play_arrow'}`;
                                }, 'notify::play-back-status');
                            } else {
                                self.label = 'play_arrow';
                            }
                        },
                    }),
                }),
            ],
            passThrough: true,
        })
    });
}
const CavaVisualizer = () => {
    const bars = Array(60).fill(0).map(() => Widget.Box({
        className: 'cava-bar cava-bar-low',
        hpack: 'center',
        vpack:"center",
        hexpand: true,
    }));

    let cavaHook = null;
    let isActive = false;
    let updateTimeout = null;
    let isDestroyed = false;

    const updateBars = () => {
        if (!isActive || isDestroyed) return;
        
        try {
            const output = CavaService.output;
            if (!output || typeof output !== 'string') return;

            const values = output.split('').map(c => {
                const code = c.charCodeAt(0);
                return code >= 0x2581 && code <= 0x2588 ? code - 0x2580 : 0;
            });

            const step = Math.floor(values.length / bars.length);
            bars.forEach((bar, i) => {
                if (isDestroyed) return;
                
                const start = i * step;
                const end = start + step;
                const avg = values.slice(start, end).reduce((a, b) => a + b, 0) / step || 0;
                
                const height = Math.max(1, avg * 15);
                const intensity = avg > 5 ? 'high' : avg > 1.5 ? 'med' : 'low';
                
                bar.css = `
                    min-height: ${height}px;
                    min-width: 8px;
                    border-radius: 4px;
                    transition: min-height 50ms linear;
                `;
                bar.className = `cava-bar cava-bar-${intensity}`;
            });

            if (!isDestroyed) {
                updateTimeout = Utils.timeout(50, updateBars);
            }
        } catch (e) {
            console.error('Error updating bars:', e);
        }
    };

    const startUpdates = () => {
        if (isActive || isDestroyed) return;
        isActive = true;
        CavaService.start();
        updateBars();
    };

    const stopUpdates = () => {
        if (!isActive || isDestroyed) return;
        isActive = false;
        
        try {
            CavaService.stop();
            
            if (updateTimeout) {
                GLib.Source.remove(updateTimeout);
                updateTimeout = null;
            }
            
            bars.forEach(bar => {
                if (!isDestroyed) {
                    bar.css = `min-height: 1px;`;
                    bar.className = 'cava-bar cava-bar-low';
                }
            });
        } catch (e) {
            console.error('Error stopping updates:', e);
        }
    };

    return Widget.Box({
        className: 'cava-visualizer',
        children: bars,
        setup: (self) => {
            const initWindow = () => {
                if (isDestroyed) return;
                
                try {
                    const window = App.getWindow('music');
                    if (window) {
                        // Initial state check
                        if (window.visible) startUpdates();
                        
                        // Connect visibility changes
                        window.connect('notify::visible', () => {
                            if (isDestroyed) return;
                            window.visible ? startUpdates() : stopUpdates();
                        });
                    } else {
                        Utils.timeout(1000, initWindow); // Retry if window not found
                    }
                } catch (e) {
                    console.error('Window lookup error:', e);
                    Utils.timeout(1000, initWindow); // Retry on error
                }
            };

            // Start window lookup after short delay
            Utils.timeout(100, initWindow);

            self.on('destroy', () => {
                isDestroyed = true;
                stopUpdates();
                if (cavaHook) {
                    try {
                        CavaService.disconnect(cavaHook);
                    } catch (e) {
                        console.error('Error disconnecting CAVA hook:', e);
                    }
                }
            });
        }
    });
};
const musicWidget = () => {
    let currentPlayer = getPlayer();
    return Box({
        className: ` ${mode} `+` ${elevate} `,
        css: `min-height:260px;`,
        vexpand: true,
        setup: (self) => {
            const updateChildren = () => {
                currentPlayer = getPlayer();
                self.children = [createContent(currentPlayer)];
            };
            self.hook(Mpris, updateChildren, 'notify::players');
            updateChildren();
        }
    });
};

const createContent = (player) => Widget.Overlay({
    child: Box({
        className: 'cava-container',
        hexpand: true,
        vexpand: true,
        child: userOptions.asyncGet().etc.cava.enabled ? CavaVisualizer() : null
    }),
    overlays: [
        Box({
            spacing: 10,
            children: [
                CoverArt({ player: player }),
                Box({
                    vertical: true,
                    className: 'spacing-v-5 osd-music-info',
                    children: [
                        Box({
                            children:[
                                Box({
                                    vertical: true,
                                    vpack: 'center',
                                    hpack:"start",
                                    children: [
                                        TrackTitle({ player: player }),
                                        TrackArtists({ player: player }),
                                    
                                    ]
                                }),
                                Box({
                                    vpack:"start",
                                    hpack:"end",
                                    css:`margin-right:2rem`,
                                    hexpand:true,
                                    spacing:15,
                                    children:[
                                        TrackSource({ player: player }),
                                        // bluetoothPill({vpack:'center',className:`sec-txt`}),
                                    ]
                                  })
                            ]
                        }),
                        Box({ vexpand: true }),
                        Box({
                            className: 'spacing-h-10',
                            children: [
                                TrackControls({ player: player }),
                                Widget.Box({hexpand:true}),
                                ...(hasPlasmaIntegration ? [TrackTime({ player: player })] : []),
                                PlayState({ player: player }),
                            ]
                        }),
                    ]
                }),
            ],
        }),
    ]
});

export default () => PopupWindow({
    keymode: 'on-demand',
    anchor: ['bottom','right','left'],
    // exclusivity:"",
    layer: 'top',
    name: 'music',
    child:Box({
        vertical: true,
        children:[
                    clickCloseRegion({ name: 'music', multimonitor: false, fillMonitor: 'vertical' }),
                    // Widget.Box({
                    //     children:[
                    //         RoundedCorner('bottomleft', {hpack:"start",className: 'corner corner-amberoled'}),
                    //         Box({hexpand:true}),
                    //         RoundedCorner('bottomright', {hpack:"end", className: 'corner corner-amberoled'}),
                            
                    //     ]}),
                    musicWidget(),

        ]
    })
});
