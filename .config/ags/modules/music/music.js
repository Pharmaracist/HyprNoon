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
            return '󰈹 Firefox'
        return "󰈣 File";
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
    label: 'No music playing',
    xalign: 0,
    truncate: 'end',
    className: 'osd-music-title',
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
    className: 'osd-music-artists',
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
        className: 'osd-music-cover-art',
        setup: (self) => {
            self.set_size_request(DEFAULT_COVER_SIZE, DEFAULT_COVER_SIZE);
            self.connect("draw", (widget, cr) => {
                if (!currentCoverPath) return;

                try {
                    const pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_scale(
                        currentCoverPath,
                        DEFAULT_COVER_SIZE,
                        DEFAULT_COVER_SIZE,
                        true
                    );

                    // Create rounded corners
                    const radius = 20;
                    cr.arc(radius, radius, radius, Math.PI, 1.5 * Math.PI);
                    cr.arc(DEFAULT_COVER_SIZE - radius, radius, radius, 1.5 * Math.PI, 2 * Math.PI);
                    cr.arc(DEFAULT_COVER_SIZE - radius, DEFAULT_COVER_SIZE - radius, radius, 0, 0.5 * Math.PI);
                    cr.arc(radius, DEFAULT_COVER_SIZE - radius, radius, 0.5 * Math.PI, Math.PI);
                    cr.closePath();
                    cr.clip();

                    Gdk.cairo_set_source_pixbuf(cr, pixbuf, 0, 0);
                    cr.paint();
                } catch (e) {
                    console.error('Error drawing cover art:', e);
                }
            });
        }
    });

    return Widget.Box({
        ...rest,
        className: 'osd-music-cover',
        child: Widget.Overlay({
            child: drawingArea,
            overlays: [
                Widget.Box({
                    className: 'osd-music-cover-fallback',
                    homogeneous: true,
                    hpack:"center",
                    vpack:"center",
                    visible: false,
                    child: Label({
                        className: 'icon-material txt-gigantic txt-thin',
                        label: 'music_note',
                    }),
                })
            ]
        }),
        setup: (self) => {
            const updateCover = () => {
                const fallback = self.get_children()[0].get_children()[1];
                
                if (!player || !player.coverPath) {
                    currentCoverPath = null;
                    fallback.visible = true;
                    drawingArea.queue_draw();
                    return;
                }

                const newPath = player.coverPath;
                if (newPath === currentCoverPath) return;

                currentCoverPath = newPath;
                fallback.visible = false;

                // Handle URL covers (e.g., Spotify)
                if (newPath.startsWith('http')) {
                    Utils.fetch(newPath).then(filePath => {
                        currentCoverPath = filePath;
                        drawingArea.queue_draw();
                    }).catch(() => {
                        currentCoverPath = null;
                        fallback.visible = true;
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
            Button({
                className: 'osd-music-controlbtn',
                onClicked: () => (player && player.next ? player.next() : null),
                child: Label({
                    className: 'icon-material osd-music-controlbtn-txt',
                    label: 'skip_next',
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
        vpack: 'end',
        hexpand: true,
        vexpand:true,
    }));

    let cavaHook = null;
    let visualizer = null;

    const startCava = () => {
        if (cavaHook || !visualizer) return;
        CavaService.start();

        const updateBars = () => {
            const output = CavaService.output;
            if (!output || typeof output !== 'string') return;

            const values = output.split('');
            const step = Math.floor(values.length / bars.length);

            bars.forEach((bar, i) => {
                const value = values[i * step]?.charCodeAt(0) - 9601 || 0;
                const height = Math.max(1, value * 30);

                const intensity = value > 1.3 ? 'high' : value > 0.2 ? 'med' : 'low';
                bar.className = `cava-bar cava-bar-${intensity}`;
                bar.css = `
                    min-height: ${height}px;
                    min-width: 9px;
                    border-radius: 5px;
                `;
            });
        };

        cavaHook = CavaService.connect('output-changed', updateBars);
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

        bars.forEach(bar => {
            bar.className = 'cava-bar cava-bar-low';
            bar.css = `
                min-height: 0px;
                min-width: 8px;
                border-radius: 4px;
            `;
        });
    };

    return Widget.Box({
        className: 'cava-visualizer',
        spacing: 4,
        children: bars,
        setup: (self) => {
            const musicControlsWindow = App.getWindow('ipod');
            if (musicControlsWindow) {
                self.hook(musicControlsWindow, checkAndUpdateCava, 'notify::visible');
            } else {
                log('musicControlsWindow is undefined. Skipping hook registration.');
            }
            const checkAndUpdateCava = () => {
                const player = Mpris.getPlayer();
                const shouldRun = musicControlsWindow.visible && 
                                player?.playBackStatus === 'Playing';

                if (shouldRun) {
                    startCava();
                } else {
                    stopCava();
                }
            };

            // Connect to window visibility changes
            self.hook(musicControlsWindow, checkAndUpdateCava, 'notify::visible');
            // Connect to player changes
            self.hook(Mpris, checkAndUpdateCava);
            // Initial check
            Utils.timeout(1000, checkAndUpdateCava);

            self.connect('destroy', () => {
                stopCava();
                visualizer = null;
            });

            self.connect('unrealize', () => {
                stopCava();
                visualizer = null;
            });
        },
    });
};
const MusicControlsWidget = () => {
    let currentPlayer = getPlayer();
    return Box({
        className: `${elevate}`,
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
                            vertical: true,
                            vpack: 'center',
                            hexpand: true,
                            children: [
                                TrackTitle({ player: player }),
                                TrackArtists({ player: player }),
                                TrackSource({ player: player }),
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
                        })
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
    name: 'ipod',
    child:Box({
        vertical: true,
        children:[
                    clickCloseRegion({ name: 'ipod', multimonitor: false, fillMonitor: 'vertical' }),
                    Widget.Box({
                        children:[
                            RoundedCorner('bottomleft', {hpack:"start",className: 'corner corner-music'}),
                            Box({hexpand:true}),
                            RoundedCorner('bottomright', {hpack:"end",className: 'corner corner-music'}),
                            
                        ]}),
                    MusicControlsWidget(),

                    // clickCloseRegion({ name: 'musiccontrols', multimonitor: false, fillMonitor: 'horizontal' }), 
        ]
    })
});
