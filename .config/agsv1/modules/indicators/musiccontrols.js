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
const elevate = userOptions.asyncGet().etc.widgetCorners ? "osd-round osd-music" : "elevation osd-music" ;

var lastCoverPath = '';

// function isRealPlayer(player) {
//     return (
//         // Remove unnecessary native buses from browsers if there's plasma integration
//         !(hasPlasmaIntegration && player.busName.startsWith('org.mpris.MediaPlayer2.firefox')) &&
//         !(hasPlasmaIntegration && player.busName.startsWith('org.mpris.MediaPlayer2.chromium')) &&
//         // playerctld just copies other buses and we don't need duplicates
//         !player.busName.startsWith('org.mpris.MediaPlayer2.playerctld') &&
//         // Non-instance mpd bus
//         !(player.busName.endsWith('.mpd') && !player.busName.endsWith('MediaPlayer2.mpd'))
//     );
// }

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
        if (!player) return;
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
    setup: (self) => self.hook(player, (self) => {
        // Update the title label with the current track title or fallback text.
        self.label = player.trackTitle.length > 0 ? trimTrackTitle(player.trackTitle) : 'No media';
        // Select font based on the track and artist information.
        const fontForThisTrack = getTrackfont(player);
        self.css = `font-family: ${fontForThisTrack}, ${DEFAULT_MUSIC_FONT};`;
    }, 'notify::track-title'),
});

const TrackArtists = ({ player, ...rest }) => Label({
    ...rest,
    xalign: 0,
    className: 'osd-music-artists',
    truncate: 'end',
    setup: (self) => self.hook(player, (self) => {
        // Show the track artists if available.
        self.label = player.trackArtists.length > 0 ? player.trackArtists.join(', ') : '';
    }, 'notify::track-artists'),
})

const CoverArt = ({ player, ...rest }) => {
    const coverArtDrawingArea = Widget.DrawingArea({ className: 'osd-music-cover-art' });
    const coverArtDrawingAreaStyleContext = coverArtDrawingArea.get_style_context();

    const fallbackCoverArt = Box({ 
        className: 'osd-music-cover-fallback',
        homogeneous: true,
        children: [
            Label({
            className: 'icon-material txt-gigantic txt-thin',
            label: 'music_note',
        })]
    });

    const realCoverArt = Box({
        className: 'osd-music-cover-art',
        homogeneous: true,
        children: [coverArtDrawingArea],
        attribute: {
            'pixbuf': null,
            'showImage': (self, imagePath) => {
                const borderRadius = coverArtDrawingAreaStyleContext.get_property('border-radius', Gtk.StateFlags.NORMAL);
                const frameHeight = coverArtDrawingAreaStyleContext.get_property('min-height', Gtk.StateFlags.NORMAL);
                const frameWidth = coverArtDrawingAreaStyleContext.get_property('min-width', Gtk.StateFlags.NORMAL);
                let imageHeight = frameHeight;
                let imageWidth = frameWidth;

                execAsync(['identify', '-format', '{"w":%w,"h":%h}', imagePath])
                    .then((output) => {
                        const imageDimensions = JSON.parse(output);
                        const imageAspectRatio = imageDimensions.w / imageDimensions.h;
                        const displayedAspectRatio = imageWidth / imageHeight;
                        if (imageAspectRatio >= displayedAspectRatio) {
                            imageWidth = imageHeight * imageAspectRatio;
                        } else {
                            imageHeight = imageWidth / imageAspectRatio;
                        }

                        self.attribute.pixbuf = GdkPixbuf.Pixbuf.new_from_file_at_size(imagePath, imageWidth, imageHeight);

                        coverArtDrawingArea.set_size_request(frameWidth, frameHeight);
                        coverArtDrawingArea.connect("draw", (widget, cr) => {
                            cr.arc(borderRadius, borderRadius, borderRadius, Math.PI, 1.5 * Math.PI);
                            cr.arc(frameWidth - borderRadius, borderRadius, borderRadius, 1.5 * Math.PI, 2 * Math.PI);
                            cr.arc(frameWidth - borderRadius, frameHeight - borderRadius, borderRadius, 0, 0.5 * Math.PI);
                            cr.arc(borderRadius, frameHeight - borderRadius, borderRadius, 0.5 * Math.PI, Math.PI);
                            cr.closePath();
                            cr.clip();

                            Gdk.cairo_set_source_pixbuf(cr, self.attribute.pixbuf,
                                frameWidth / 2 - imageWidth / 2,
                                frameHeight / 2 - imageHeight / 2
                            );
                            cr.paint();
                            return false;
                        });
                        coverArtDrawingArea.queue_draw();
                    }).catch(print)
            },
          'updateCover': (self) => {
    if (!player || player.trackTitle == "" || !player.coverPath) {
        self.css = `background-image: none;`;
        return;
    }

    const coverPath = player.coverPath;
    const stylePath = `${player.coverPath}${darkMode.value ? '' : '-l'}${COVER_COLORSCHEME_SUFFIX}`;
    if (player.coverPath == lastCoverPath) {
        Utils.timeout(300, () => {
            self.attribute.showImage(self, coverPath);
            self.css = `background-image: url('${coverPath}');`;
        });
    } else {
        lastCoverPath = player.coverPath;
        if (fileExists(stylePath)) {
            self.attribute.showImage(self, coverPath)
            self.css = `background-image: url('${coverPath}');`;
        } else {
            self.css = `background-image: url('${coverPath}');`;
        }
    }
},
        },
        setup: (self) => self.hook(player, (self) => {
            // When the player's cover-path changes, update the cover art.
            self.attribute.updateCover(self);
        }, 'notify::cover-path'),
    });

    return Box({
        ...rest,
        className: 'osd-music-cover',
        children: [
            Widget.Overlay({
                child: fallbackCoverArt,
                overlays: [realCoverArt],
            })
        ],
    });
};

const TrackControls = ({ player, ...rest }) => Widget.Revealer({
    // Initially hidden; these controls become visible when a valid player is detected.
    revealChild: false,
    transition: 'slide_right',
    transitionDuration: userOptions.asyncGet().animations.durationLarge,
    child: Widget.Box({
        ...rest,
        vpack: 'center',
        className: 'osd-music-controls spacing-h-3',
        children: [
            Button({
                className: 'osd-music-controlbtn',
                onClicked: () => player.previous(),
                child: Label({
                    className: 'icon-material osd-music-controlbtn-txt',
                    label: 'skip_previous',
                })
            }),
            Button({
                className: 'osd-music-controlbtn',
                onClicked: () => player.next(),
                child: Label({
                    className: 'icon-material osd-music-controlbtn-txt',
                    label: 'skip_next',
                })
            }),
        ],
    }),
    // The setup hook listens for changes in playback status.
    // If no valid player is present, the controls remain hidden.
    setup: (self) => self.hook(Mpris, (self) => {
        if (!player)
            self.revealChild = false; // Hide controls when no player is available.
        else
            self.revealChild = true;  // Reveal controls when a valid player is active.
    }, 'notify::play-back-status'),
});

const TrackSource = ({ player, ...rest }) => Widget.Revealer({
    revealChild: false, // Initially hidden.
    transition: 'slide_left',
    transitionDuration: userOptions.asyncGet().animations.durationLarge,
    child: Widget.Box({
        ...rest,
        // className: 'spacing-v-5 spacing-h-5',
        homogeneous: true,
        children: [
            Label({
                hpack: 'start',
                opacity: 0.6,
                // justification: 'center',
                className: 'txt-small onSurfaceVariant',
                setup: (self) => self.hook(player, (self) => {
                    // Update the label with the detected media source (e.g., Youtube, Discord).
                    self.label = detectMediaSource(player.trackCoverUrl);
                }, 'notify::cover-path'),
            }),
        ],
    }),
    // This hook checks for a valid player. If none is found, the media source remains hidden.
    setup: (self) => self.hook(Mpris, (self) => {
        const mpris = Mpris.getPlayer('');
        if (!mpris)
            self.revealChild = false; // Hide when no player is active.
        else
            self.revealChild = true;  // Reveal when a player is detected.
    }),
});

const TrackTime = ({ player, ...rest }) => {
    return Widget.Revealer({
        revealChild: false, // Initially hidden.
        transition: 'slide_left',
        transitionDuration: userOptions.asyncGet().animations.durationLarge,
        child: Widget.Box({
            ...rest,
            vpack: 'center',
            className: 'osd-music-pill spacing-h-5',
            children: [
                Label({
                    setup: (self) => self.poll(1000, (self) => {
                        if (!player) return;
                        self.label = lengthStr(player.position);
                    }),
                }),
                Label({ label: '/' }),
                Label({
                    setup: (self) => self.hook(Mpris, (self) => {
                        if (!player) return;
                        self.label = lengthStr(player.length);
                    }, 'notify::track-artists'),
                }),
            ],
        }),
       // The hook monitors whether a valid player exists.
       // If not, the track time widget remains hidden.
       setup : (self) => self.hook(Mpris, (self) => {
            if (!player)
                self.revealChild = false; // Hide track time when no player is available.
            else
                self.revealChild = true;  // Reveal track time when a player is active.
        }),
    })
}

const PlayState = ({ player }) => {
    const trackCircProg = TrackProgress({ player: player });
    return Widget.Button({
        className: 'osd-music-playstate',
        child: Widget.Overlay({
            child: trackCircProg,
            overlays: [
                Widget.Button({
                    className: 'osd-music-playstate-btn',
                    onClicked: () => player.playPause(),
                    child: Widget.Label({
                        justification: 'center',
                        hpack: 'fill',
                        vpack: 'center',
                        setup: (self) => self.hook(player, (label) => {
                            // Toggle play/pause icon based on the playback status.
                            label.label = `${player.playBackStatus == 'Playing' ? 'pause' : 'play_arrow'}`;
                        }, 'notify::play-back-status'),
                    }),
                }),
            ],
            passThrough: true,
        })
    });
}
const CavaVisualizer = () => {
    const bars = Array(30).fill(0).map(() => Widget.Box({
        className: 'cava-bar cava-bar-low',
        hpack: 'center',
        vpack: 'end',
        hexpand: true,
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
                const height = Math.max(1, value * 10);

                const intensity = value > 2 ? 'high' : value > 0.5 ? 'med' : 'low';
                bar.className = `cava-bar cava-bar-${intensity}`;
                bar.css = `
                    min-height: ${height}px;
                    min-width: 8px;
                    border-radius: 4px;
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
            visualizer = self;
            const musicControlsWindow = App.getWindow('musiccontrols');

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
const MusicControlsWidget = (player) => Box({
    className: `${elevate}`,
    css: `min-height: 9.5rem;`,
    vexpand:false,
    children: [
        Widget.Overlay({
            child: Box({
                className: 'cava-container',
                hexpand: true,
                vexpand: true,
                children: [
                    userOptions.asyncGet().ipod.visualizer.enabled ? CavaVisualizer() : null
                ],
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
                                    setup: (box) => {
                                        box.pack_start(TrackControls({ player: player }), false, false, 0);
                                        box.pack_end(PlayState({ player: player }), false, false, 0);
                                        // Only show TrackTime if there is plasma integration or if the player is Chromium.
                                        if (hasPlasmaIntegration || player.busName.startsWith('org.mpris.MediaPlayer2.chromium'))
                                            box.pack_end(TrackTime({ player: player }), false, false, 0)
                                    }
                                })
                            ]
                        }),
                    ],
                }),
            ],
        })
    ]
});
const content = Widget.Box({
    hexpand: false,
    vexpand: false,
    children:[
        userOptions.asyncGet().etc.widgetCorners ? RoundedCorner('topright', {className: 'corner corner-music'}) : null,
        Box({
            vexpand: false,
            hexpand: false,
            spacing: 25, // Added spacing property here
            css: `min-height:10rem; min-width:55rem`,
            children: Mpris.bind("players")
            .as(players =>
                players.map(player => MusicControlsWidget(player))
            )
        }),
        userOptions.asyncGet().etc.widgetCorners ? RoundedCorner('topleft', {className: 'corner corner-music'}) : null,
    ]
});
export default () => PopupWindow({
    keymode: 'on-demand',
    anchor: ['top'],
    exclusivity:"ignore",
    layer: 'top',
    name: 'musiccontrols',
    child:Box({
            children:[
        Box({
            vertical: true,
            children:[
                content,
                clickCloseRegion({ name: 'musiccontrols', multimonitor: false, fillMonitor: 'vertical' }),
            ]
        }),
        // clickCloseRegion({ name: 'musiccontrols', multimonitor: false, fillMonitor: 'horizontal' }), 
    ]
})
});
