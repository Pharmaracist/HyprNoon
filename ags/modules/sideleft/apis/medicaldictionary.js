const Pango = imports.gi.Pango;
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import MedicalDictionary from '../../../services/medicaldictionary.js';
import { setupCursorHover } from '../../.widgetutils/cursorhover.js';

const { Box, Button, Icon, Label, Scrollable, Stack } = Widget;

// Create a tab icon for the Medical Dictionary API.
export const medicalDictionaryTabIcon = Label({
    label: "rib_cage",
    className: "onSurfaceVariant txt-large icon-material"
});

const WelcomeMessage = () => Box({
    className: 'welcome-message spacing-v-15',
    vertical: true,
    vexpand: true,
    hexpand: true,
    vpack: 'center',
    hpack: 'center',
    css: 'padding: 2rem;',
    children: [
        Box({
            vertical: true,
            className: 'spacing-v-5',
            hpack: 'center',
            children: [
                Box({
                    className: 'sidebar-chat-welcome-logo',
                    hpack: 'center',
                    css:`margin-bottom:1.5rem`,
                    children: [
                        Label({
                            css:`font-size:3.5rem`,
                            hpack:"center",
                            className: 'onSurfaceVariant  material-welcome-logo icon-material',
                            label:"rib_cage"
                        }),
                    ],
                }),
                Label({
                    className: 'txt txt-title-small sidebar-chat-welcome-txt',
                    label: 'Medical Dictionary',
                    justification: 'center',
                    hpack: 'center',
                }),
                Box({
                    hpack: 'center',
                    spacing: 5,
                    children:[
                    Label({
                        className: 'medical-dictionary-tagline',
                        label: 'Powered By Merriam-Webster',
                        opacity:0.6,
                    }),
                    Button({
                        child:Label({
                        label:"info",
                        className:"onSurfaceVariant icon-material txt-small",
                        setup:setupCursorHover,
                    }),
                    onClicked:() => Utils.execAsync(`xdg-open https:merriamWebster.com`).catch(print)
                })]
                })
            ],
            
        }),
        // Box({
        //     vertical: true,
        //     className: 'spacing-v-15',
        //     hpack: 'center',
        //     vpack: 'start',
        //     children: [
        //         Label({
        //             xalign: 0.5,
        //             css: 'margin: 8rem 0 0 0;',
        //             className: 'txt txt-small txt-bold',
        //             label: 'Search for a term',
        //             justification: 'center',
        //         }),
        //         Box({
        //             vertical: true,
        //             className: 'spacing-v-5 welcome-examples',
        //             hpack: 'center',
        //             setup: (self) => {
        //                 let historyHandler = null;
        //                 const updateHistory = () => {
        //                     self.children = [];
        //                     // If you have a function to get recent search terms, use it here.
        //                     // Otherwise, leave this list empty.
        //                     const recentTerms = MedicalDictionary.getRecentTerms ? MedicalDictionary.getRecentTerms() : [];
        //                     if (recentTerms.length === 0) {
        //                         self.add(Label({
        //                             xalign: 0.5,
        //                             className: 'txt txt-small txt-dim',
        //                             label: 'No recent searches',
        //                         }));
        //                     } else {
        //                         recentTerms.forEach(term => {
        //                             self.add(Button({
        //                                 className: 'txt-norm medical-dictionary-text welcome-example-btn',
        //                                 label: term,
        //                                 setup: setupCursorHover,
        //                                 hpack: 'center',
        //                                 onClicked: () => sendMessage(term),
        //                             }));
        //                         });
        //                     }
        //                 };

        //                 // Update initially
        //                 updateHistory();

        //                 // If your MedicalDictionary service supports events for history updates,
        //                 // connect them here.
        //                 if (MedicalDictionary.connect) {
        //                     if (historyHandler) {
        //                         MedicalDictionary.disconnect(historyHandler);
        //                     }
        //                     historyHandler = MedicalDictionary.connect('history-updated', updateHistory);
        //                 }

        //                 self.connect('destroy', () => {
        //                     if (MedicalDictionary.disconnect && historyHandler) {
        //                         MedicalDictionary.disconnect(historyHandler);
        //                     }
        //                 });
        //             },
        //         }),
        //     ],
        // }),
    ],
});

// ---------------------
// Commands Widget
// ---------------------
export const medicalDictionaryCommands = Box({
    className: 'spacing-h-5',
    children: [
        Box({ hexpand: true }),
        Button({
            className: 'sidebar-chat-chip sidebar-chat-chip-action txt txt-small',
            label: '/clear',
            onClicked: () => {
                MedicalDictionary.clear();
            },
            setup: setupCursorHover,
        }),
    ]
});

// ---------------------
// Helper Functions
// ---------------------
// Create a TextBlock widget with styling similar to your original code.
const TextBlock = (content = '') => {
    let item = Label({
        attribute: {
            'updateText': (text) => {
                item.label = text;
            },
            type: 'text'
        },
        wrapMode: Pango.WrapMode.WORD_CHAR,
        hpack: 'fill',
        className: 'txt sidebar-chat-txtblock sidebar-chat-txt',
        useMarkup: true,
        xalign: 0,
        wrap: true,
        selectable: true,
        label: content
    });
    return item;
};

// Build a dictionary entry widget with chat styling.
function DictionaryEntry(entry) {
    const entryArea = Stack({
        homogeneous: true,
        transition: 'crossfade',
        transitionDuration: 200,
        children: {
            'definition': TextBlock(entry.definition)
        },
        shown: 'definition',
    });

    return Box({
        className: 'sidebar-chat-message',
        homogeneous: true,
        children: [
            Box({
                vertical: true,
                children: [
                    Label({
                        hpack: 'start',
                        xalign: 0,
                        className: 'txt txt-bold sidebar-chat-name sidebar-chat-name-bot',
                        wrap: true,
                        label: entry.term,
                    }),
                    Box({
                        className: 'sidebar-chat-messagearea',
                        vertical: true,
                        children: [
                            entryArea,
                            entry.example ? Box({ className: 'separator-line margin-top-5 margin-bottom-5' }) : null,
                            entry.example ? Label({
                                xalign: 0,
                                wrap: true,
                                selectable: true,
                                hpack: 'start',
                                className: 'txt-onSurfaceVariant txt-tiny',
                                css: 'margin-left: 0.65rem;',
                                label: entry.example,
                                wrapMode: Pango.WrapMode.WORD_CHAR,
                            }) : null,
                        ]
                    }),
                ]
            })
        ]
    });
}

// ---------------------
// Main View Widget
// ---------------------
// We now build the main view for the Medical Dictionary. Notice that we add the WelcomeMessage
// initially. Later, when new dictionary entries arrive (via 'newEntry'), we remove the welcome view.
export const medicalDictionaryView = Scrollable({
    className: 'sidebar-chat-viewport',
    vexpand: true,
    child: Box({
        vertical: true,
        children: [
            WelcomeMessage(), // initially display the welcome view
        ],
        setup: (container) => {
            // If there are any pre-existing entries, add them here.
            for (const term in MedicalDictionary.entries) {
                const entry = MedicalDictionary.entries[term];
                container.add(DictionaryEntry(entry));
            }
            // Listen for new dictionary entries.
            MedicalDictionary.on('newEntry', (entry) => {
                if (!entry) return;
                // If the welcome view is present as the only child, remove it.
                if (container.get_children && container.get_children().length === 1) {
                    const firstChild = container.get_children()[0];
                    if (firstChild && firstChild.className && firstChild.className.includes('welcome-message')) {
                        container.remove(firstChild);
                    }
                }
                container.add(DictionaryEntry(entry));
            });
            // When cleared, remove all entries and re-add the welcome view.
            MedicalDictionary.on('cleared', () => {
                if (container.get_children) {
                    container.get_children().forEach(child => container.remove(child));
                } else {
                    console.warn('Container does not support get_children()');
                }
                container.add(WelcomeMessage());
            });
        },
    }),
});

// ---------------------
// Send Message Function
// ---------------------
// If the message starts with '/', handle it as a command. Otherwise, perform a lookup.
export function sendMessage(text) {
    if (text.startsWith('/')) {
        if (text === '/clear') {
            MedicalDictionary.clear();
            return;
        }
    }
    MedicalDictionary.lookup(text, {}).catch((e) => console.log(e));
}
