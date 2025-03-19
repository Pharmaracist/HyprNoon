const { Gtk, Gdk } = imports.gi;
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';
import { setupCursorHover } from '../../.widgetutils/cursorhover.js';
import WallpaperService from '../../../services/wallpapers.js';
import { chatEntry } from '../apiwidgets.js';
import GdkPixbuf from 'gi://GdkPixbuf';

const { Box, Button, Label, Scrollable } = Widget;

// Read custom prompts from config
const getCustomPrompts = () => {
    try {
        const configPath = `${Utils.HOME}/.ags/config.json`;
        const config = JSON.parse(Utils.readFile(configPath));
        return config.wallpapers?.customPrompts || [
            { icon: 'landscape', style: 'realistic landscape photography', tooltip: 'Realistic' },
            { icon: 'brush', style: 'oil painting', tooltip: 'Oil Painting' },
            { icon: 'architecture', style: 'architectural concept art', tooltip: 'Architecture' },
            { icon: 'palette', style: 'digital art', tooltip: 'Digital Art' },
            { icon: 'animation', style: 'anime style', tooltip: 'Anime' },
        ];
    } catch (error) {
        console.error('Error reading custom prompts:', error);
        return [
            { icon: 'landscape', style: 'realistic landscape photography', tooltip: 'Realistic' },
            { icon: 'brush', style: 'oil painting', tooltip: 'Oil Painting' },
            { icon: 'architecture', style: 'architectural concept art', tooltip: 'Architecture' },
            { icon: 'palette', style: 'digital art', tooltip: 'Digital Art' },
            { icon: 'animation', style: 'anime style', tooltip: 'Anime' },
        ];
    }
};

export const wallpaperTabIcon = MaterialIcon('wallpaper', 'norm');

const StyleButton = ({ icon, onClick, tooltip }) => Button({
    className: 'sidebar-chat-chip txt-norm sec-txt',
    tooltipText: tooltip,
    child: Box({
        className: 'spacing-h-5',
        children: [
            MaterialIcon(icon, 'norm'),
        ],
    }),
    onClicked: onClick,
    setup: setupCursorHover,
});

const WallpaperInfo = () => {
    const wallpaperLogo = MaterialIcon('wallpaper', 'norm', {
        className: 'sidebar-chat-welcome-logo',
    });
    return Box({
        vertical: true,
        className: 'spacing-v-15',
        children: [
            wallpaperLogo,
            Label({
                className: 'txt txt-title-small sidebar-chat-welcome-txt',
                wrap: true,
                justify: Gtk.Justification.CENTER,
                label: 'Wallpaper Generator',
            }),
            Label({
                className: 'txt-smallie txt-subtext',
                wrap: true,
                justify: Gtk.Justification.CENTER,
                label: 'Enter a prompt and use style buttons below',
            }),
        ],
    });
}

const wallpaperWelcome = Box({
    vertical: true,
    vpack: 'center',
    className: 'spacing-v-15',
    children: [
        WallpaperInfo(),
    ],
});

const LoadingIndicator = () => Box({
    className: 'wallpaper-loading spacing-v-5',
    vertical: true,
    vpack: 'center',
    hpack: 'center',
    css: 'opacity: 0.7;',
    children: [
        MaterialIcon('wallpaper', 'larger sec-txt'),
        Label({
            label: 'Generating...',
            className: 'txt-small txt-bold sec-txt',
        }),
    ],
});

const PreviewBox = (tempFile) => {
    const preview = Box({
        vertical: true,
        className: 'spacing-v-10',
        children: [
            Box({
                className: 'wallpaper-preview',
                css: `
                    background-image: url('${tempFile}');
                    background-size: cover;
                    background-position: center;
                    border-radius: 12px;
                    min-height: 200px;
                `,
            }),
            Box({
                className: 'spacing-h-5',
                hpack: 'center',
                children: [
                    StyleButton({
                        icon: 'save',
                        tooltip: 'Save to ~/Pictures/Wallpapers',
                        onClick: (button) => {
                            button.toggleClassName('sidebar-chat-chip-active', true);
                            WallpaperService.saveWallpaper(tempFile)
                                .then(() => {
                                    button.setCss('transition: all 0.1s ease;');
                                    button.toggleClassName('success', true);
                                    Utils.timeout(1000, () => {
                                        button.toggleClassName('success', false);
                                        button.toggleClassName('sidebar-chat-chip-active', false);
                                    });
                                })
                                .catch(error => {
                                    button.toggleClassName('error', true);
                                    button.toggleClassName('sidebar-chat-chip-active', false);
                                    Utils.timeout(1000, () => {
                                        button.toggleClassName('error', false);
                                    });
                                    console.error('Error saving wallpaper:', error);
                                });
                        },
                    }),
                    StyleButton({
                        icon: 'wallpaper',
                        tooltip: 'Set as desktop wallpaper',
                        onClick: (button) => {
                            button.toggleClassName('sidebar-chat-chip-active', true);
                            WallpaperService.setWallpaper(tempFile)
                                .then(() => {
                                    button.setCss('transition: all 0.1s ease;');
                                    button.toggleClassName('success', true);
                                    Utils.timeout(1000, () => {
                                        button.toggleClassName('success', false);
                                        button.toggleClassName('sidebar-chat-chip-active', false);
                                    });
                                })
                                .catch(error => {
                                    button.toggleClassName('error', true);
                                    button.toggleClassName('sidebar-chat-chip-active', false);
                                    Utils.timeout(1000, () => {
                                        button.toggleClassName('error', false);
                                    });
                                    console.error('Error setting wallpaper:', error);
                                });
                        },
                    }),
                    StyleButton({
                        icon: 'account_circle',
                        tooltip: 'Set as profile photo',
                        onClick: (button) => {
                            button.toggleClassName('sidebar-chat-chip-active', true);
                            WallpaperService.setAsProfilePhoto(tempFile)
                                .then(() => {
                                    button.setCss('transition: all 0.1s ease;');
                                    button.toggleClassName('success', true);
                                    Utils.timeout(1000, () => {
                                        button.toggleClassName('success', false);
                                        button.toggleClassName('sidebar-chat-chip-active', false);
                                    });
                                })
                                .catch(error => {
                                    button.toggleClassName('error', true);
                                    button.toggleClassName('sidebar-chat-chip-active', false);
                                    Utils.timeout(1000, () => {
                                        button.toggleClassName('error', false);
                                    });
                                    console.error('Error setting profile photo:', error);
                                });
                        },
                    }),
                ],
            }),
        ],
    });

    return preview;
};

const MessageContent = (content, type) => Box({
    className: 'sidebar-chat-msg spacing-v-5',
    vertical: true,
    children: [
        Label({
            hpack: 'start',
            wrap: true,
            className: type === 'user' ? 'txt' : 'error-text',
            label: content,
        }),
    ],
});

const chatContent = Box({
    vertical: true,
    className: 'spacing-v-5',
    children: [],
});

export const wallpaperView = Box({
    vertical: true,
    className: 'spacing-v-15',
    setup: self => {
        self.hook(WallpaperService, (box) => {
            const loadingIndicator = box.children[0];
            const contentBox = box.children[1];
            loadingIndicator.visible = WallpaperService.loading;
            wallpaperWelcome.visible = !WallpaperService.loading && chatContent.children.length === 0;
        }, 'loading');
    },
    children: [
        LoadingIndicator(),
        Box({
            className: 'spacing-v-5',
            vertical: true,
            children: [
                Scrollable({
                    className: 'sidebar-chat-viewport',
                    vexpand: true,
                    child: Box({
                        vertical: true,
                        children: [
                            wallpaperWelcome,
                            chatContent,
                        ],
                    }),
                    setup: (scrolledWindow) => {
                        // Show scrollbar
                        scrolledWindow.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
                        const vScrollbar = scrolledWindow.get_vscrollbar();
                        vScrollbar.get_style_context().add_class('sidebar-scrollbar');
                        // Avoid click-to-scroll-widget-to-view behavior
                        Utils.timeout(1, () => {
                            const viewport = scrolledWindow.child;
                            viewport.set_focus_vadjustment(new Gtk.Adjustment(undefined));
                        })
                        // Always scroll to bottom with new content
                        const adjustment = scrolledWindow.get_vadjustment();
                        adjustment.connect("changed", () => Utils.timeout(1, () => {
                            adjustment.set_value(adjustment.get_upper() - adjustment.get_page_size());
                        }))
                    }
                }),
            ],
        }),
    ],
});

const styles = [
    { icon: 'camera', style: 'photographic, 4k, high quality', tooltip: 'High quality photo' },
    { icon: 'palette', style: 'digital art, artistic, vibrant colors', tooltip: 'Digital art' },
    { icon: 'landscape', style: 'landscape photography, wide angle, scenic view', tooltip: 'Landscape photo' },
    { icon: 'architecture', style: 'urban photography, cityscape, modern architecture', tooltip: 'Urban/City' },
    { icon: 'brush', style: 'anime art style, high quality illustration', tooltip: 'Anime style' },
    { icon: 'auto_fix_high', style: 'fantasy art, magical, ethereal atmosphere', tooltip: 'Fantasy art' },
];

const randomPrompts = [
    'mystical forest at twilight',
    'futuristic neon city',
    'serene mountain lake',
    'abstract cosmic patterns',
    'cherry blossoms in spring',
    'underwater coral reef',
    'northern lights over mountains',
    'cyberpunk street scene',
    'peaceful zen garden',
    'dramatic storm clouds',
    'colorful autumn forest',
    'geometric abstract patterns',
    'desert sand dunes at sunset',
    'misty waterfall in jungle',
    'starry night over ocean',
];

export const wallpaperCommands = Box({
    className: 'spacing-h-5',
    children: [
        Box({ hexpand: true }),
        StyleButton({
            icon: 'clear_all',
            tooltip: 'Clear messages',
            onClick: () => {
                chatContent.children = [];
                wallpaperWelcome.visible = true;
            },
        }),
        StyleButton({
            icon: 'casino',
            tooltip: 'Generate random wallpaper',
            onClick: () => {
                const randomStyle = styles[Math.floor(Math.random() * styles.length)];
                const randomPrompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
                const buffer = chatEntry.get_buffer();
                buffer.set_text(`${randomPrompt}, ${randomStyle.style}`, -1);
                const event = new Gdk.Event(Gdk.EventType.KEY_PRESS);
                event.keyval = Gdk.KEY_Return;
                chatEntry.emit('key-press-event', event);
            },
        }),
        ...styles.map(({icon, style, tooltip}) => StyleButton({
            icon,
            tooltip,
            onClick: () => {
                const buffer = chatEntry.get_buffer();
                const [start, end] = buffer.get_bounds();
                const text = buffer.get_text(start, end, true);
                buffer.set_text(`${text}, ${style}`, -1);
                const event = new Gdk.Event(Gdk.EventType.KEY_PRESS);
                event.keyval = Gdk.KEY_Return;
                chatEntry.emit('key-press-event', event);
            },
        })),
        ...getCustomPrompts().map(({icon, style, tooltip}) => StyleButton({
            icon,
            tooltip,
            onClick: () => {
                const buffer = chatEntry.get_buffer();
                const [start, end] = buffer.get_bounds();
                const text = buffer.get_text(start, end, true);
                buffer.set_text(`${text}, ${style}`, -1);
                const event = new Gdk.Event(Gdk.EventType.KEY_PRESS);
                event.keyval = Gdk.KEY_Return;
                chatEntry.emit('key-press-event', event);
            },
        })),
    ],
});

let textView = null;

export const sendMessage = (textView) => {
    // Get text
    const buffer = textView.get_buffer();
    const [start, end] = buffer.get_bounds();
    const text = buffer.get_text(start, end, true).trimStart();
    if (!text || text.length == 0) return;

    // Clear input
    buffer.set_text('', -1);

    // Add user message
    chatContent.add(MessageContent(text, 'user'));
    wallpaperWelcome.visible = false;

    // Generate wallpaper
    WallpaperService.generateWallpaper(text)
        .catch(error => {
            chatContent.add(MessageContent(error.message, 'error'));
        });
};

WallpaperService.connect('preview-ready', (_, tempFile) => {
    chatContent.add(PreviewBox(tempFile));
});
