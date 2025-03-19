import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import Variable from 'resource:///com/github/Aylur/ags/variable.js';
import { setupCursorHover } from '../../.widgetutils/cursorhover.js';
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';
import QuranService from '../../../services/quran.js';

const { Gtk } = imports.gi;
const { Box, Button, Icon, Label, Scrollable, Revealer } = Widget;

const contentBox = Box({
    className: 'spacing-v-5',
    vertical: true,
});

const scrollBox = Scrollable({
    className: 'quran-scrollable',
    vexpand: true,
    child: contentBox,
});

let currentSurah = null;
let surahListRevealer = null;

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
                    css: 'margin-left:1rem;min-width: 80px; min-height: 80px; margin-bottom: 1rem;padding: 1.3rem',
                    children: [
                        Widget.Icon({
                            icon: 'quran-symbolic',
                            size: 80,
                        }),
                    ],
                }),
                Label({
                    className: 'quran-arabic-text',
                    css: 'font-size: 2.7rem;',
                    label: 'القرآن الكريم',
                    justification: 'center',
                    hpack: 'center',
                }),
                Label({
                    className: 'quran-arabic-text',
                    css: 'font-size: 1.7rem;',
                    label: 'وَرَتِّلِ الْقُرْآنَ تَرْتِيلا',
                    justification: 'center',
                    hpack: 'center',
                }),
            ],
        }),
        Box({
            vertical: true,
            className: 'spacing-v-15',
            hpack: 'center',
            vpack: 'start',
            children: [
                Label({
                    xalign: 0.5,
                    css: 'margin: 8rem 0 0 0;',
                    className: 'txt txt-small txt-bold',
                    label: 'Continue Reading',
                    justification: 'center',
                }),
                Box({
                    vertical: true,
                    className: 'spacing-v-5 welcome-examples',
                    hpack: 'center',
                    setup: (self) => {
                        let historyHandler = null;
                        const updateHistory = () => {
                            self.children = [];
                            const recentSurahs = QuranService.getRecentSurahs();
                            if (recentSurahs.length === 0) {
                                self.add(Label({
                                    xalign: 0.5,
                                    className: 'txt txt-small txt-dim',
                                    label: 'No recently read Surahs',
                                }));
                            } else {
                                recentSurahs.forEach(surah => {
                                    self.add(Button({
                                        className: 'txt-norm  quran-arabic-text welcome-example-btn',
                                        label: `${surah.number} - ${surah.name}`,
                                        setup: setupCursorHover,
                                        hpack: 'center',
                                        onClicked: () => sendMessage(surah.number.toString()),
                                    }));
                                });
                            }
                        };
                        
                        // Update initially
                        updateHistory();
                        
                        // Listen for history updates
                        if (historyHandler) {
                            QuranService.disconnect(historyHandler);
                        }
                        historyHandler = QuranService.connect('history-updated', updateHistory);
                        
                        self.connect('destroy', () => {
                            if (historyHandler) {
                                QuranService.disconnect(historyHandler);
                            }
                        });
                    },
                }),
            ],
        }),
        // Box({
        //     vertical: true,
        //     className: 'spacing-v-10',
        //     hpack: 'center',
        //     css: 'min-width: 300px',
        //     children: [
        //         Label({
        //             xalign: 0.5,
        //             className: 'txt txt-small txt-bold',
        //             label: 'Capabilities',
        //             justification: 'center',
        //         }),
        //         Box({
        //             vertical: true,
        //             className: 'spacing-v-5',
        //             hpack: 'center',
        //             children: [
        //                 Label({
        //                     xalign: 0.5,
        //                     className: 'txt txt-small capability-item',
        //                     label: '• Read any Surah by entering its number (1-114)',
        //                     justification: 'center',
        //                 }),
        //                 Label({
        //                     xalign: 0.5,
        //                     className: 'txt txt-small capability-item',
        //                     label: '• Search across all verses using > followed by text',
        //                     justification: 'center',
        //                 }),
        //                 Label({
        //                     xalign: 0.5,
        //                     className: 'txt txt-small capability-item',
        //                     label: '• Copy verses and navigate between Surahs',
        //                     justification: 'center',
        //                 }),
        //             ],
        //         }),
        //     ],
        // }),
    ],
});

export const quranTabIcon = Widget.Icon({
    icon: 'quran-tab-symbolic',
    hpack: 'center',    
});

export const quranContent = Box({
    className: 'spacing-v-5',
    vertical: true,
    css: 'min-height: 300px;',
    setup: (self) => {
        let scrollHandler = null;
        let surahHandler = null;
        let errorHandler = null;
        let searchHandler = null;

        // Add welcome message initially
        contentBox.add(WelcomeMessage());

        // Save scroll position when scrolling
        if (scrollHandler) {
            scrollBox.disconnect(scrollHandler);
        }
        scrollHandler = scrollBox.connect('edge-reached', () => {
            if (currentSurah) {
                QuranService.saveScrollPosition(currentSurah, scrollBox.get_vadjustment().get_value());
            }
        });

        // Listen for new messages
        if (surahHandler) {
            QuranService.disconnect(surahHandler);
        }
        surahHandler = QuranService.connect('surah-received', (_, content) => {
            contentBox.children = []; // Clear previous content
            
            try {
                const data = JSON.parse(content);
                contentBox.add(Box({
                    className: 'quran-message quran-message-container',
                    vertical: true,
                    hpack: 'center',
                    children: [
                        // Surah name
                        Label({
                            className: 'quran-arabic-text',
                            css: 'font-size: 2.7rem;',
                            label: data.name,
                            justification: 'center',
                            hpack: 'center',
                        }),
                        // Bismillah
                        data.bismillah ? Label({
                            className: 'quran-arabic-text',
                            css: 'font-size: 1.7rem; margin: 1rem 0 2rem 0;',
                            label: data.bismillah,
                            justification: 'center',
                            hpack: 'center',
                        }) : null,
                        // Verses
                        Box({
                            hpack: 'center',
                            children: [
                                Box({
                                    vertical: true,
                                    children: [
                                        Label({
                                            className: 'txt txt-hugeass quran-arabic-text quran-verse-text',
                                            wrap: true,
                                            justify: Gtk.Justification.CENTER,
                                            label: data.verses,
                                            selectable: true,
                                        }),
                                        Box({
                                            className: 'spacing-h-5',
                                            hpack: 'center',
                                            css: 'margin-top: 1rem;',
                                            children: [
                                                Button({
                                                    className: 'txt-small sidebar-chat-chip',
                                                    label: 'Copy Text',
                                                    setup: setupCursorHover,
                                                    onClicked: () => {
                                                        const clipboard = Gtk.Clipboard.get_default(imports.gi.Gdk.Display.get_default());
                                                        clipboard.set_text(data.verses, -1);
                                                    },
                                                }),
                                            ],
                                        }),
                                    ],
                                }),
                            ],
                        }),
                    ].filter(Boolean), // Remove null items
                }));
            } catch (e) {
                console.error('Error displaying surah:', e);
                contentBox.add(Box({
                    className: 'quran-message',
                    vertical: true,
                    hpack: 'center',
                    css: 'padding: 8px;',
                    children: [Label({
                        className: 'txt txt-small txt-error',
                        label: 'Error displaying surah',
                    })],
                }));
            }

            // Restore scroll position
            if (currentSurah) {
                const position = QuranService.getScrollPosition(currentSurah);
                scrollBox.get_vadjustment().set_value(position);
            }
        });

        // Listen for search results
        if (searchHandler) {
            QuranService.disconnect(searchHandler);
        }
        searchHandler = QuranService.connect('search-results', (_, results) => {
            console.log('Received search results:', results);
            contentBox.children = []; // Clear previous content
            
            if (!results || results.length === 0) {
                console.log('No results found');
                contentBox.add(Box({
                    className: 'quran-message',
                    vertical: true,
                    hpack: 'center',
                    css: 'padding: 8px;',
                    children: [Label({
                        className: 'txt txt-small txt-dim',
                        label: 'No results found',
                    })],
                }));
                return;
            }

            console.log(`Displaying ${results.length} results`);
            contentBox.add(Label({
                className: 'txt txt-small txt-bold',
                label: `Found ${results.length} results`,
                css: 'margin: 1rem;',
            }));

            results.forEach((verse, index) => {
                console.log(`Processing result ${index}:`, verse);
                contentBox.add(Box({
                    className: 'quran-message',
                    vertical: true,
                    hpack: 'center',
                    css: 'padding: 1rem; background-color: $surfaceContainerLow; border-radius: $rounding_large; margin: 0.5rem 1rem;',
                    children: [Box({
                        hpack: 'center',
                        children: [
                            Box({
                                vertical: true,
                                children: [
                                    Label({
                                        className: 'txt txt-large quran-arabic-text',
                                        wrap: true,
                                        justify: Gtk.Justification.CENTER,
                                        label: verse.text_uthmani || '',
                                        selectable: true,
                                    }),
                                    Label({
                                        className: 'txt txt-small txt-dim',
                                        label: `Surah ${verse.chapter_number || '?'}, Verse ${verse.verse_number || '?'}`,
                                    }),
                                    Box({
                                        className: 'spacing-h-5',
                                        hpack: 'center',
                                        css: 'margin-top: 1rem;',
                                        children: [
                                            Button({
                                                className: 'txt-small sidebar-chat-chip',
                                                label: 'Copy Text',
                                                setup: setupCursorHover,
                                                onClicked: () => {
                                                    console.log('Copying text:', verse.text_uthmani);
                                                    const clipboard = Gtk.Clipboard.get_default(imports.gi.Gdk.Display.get_default());
                                                    clipboard.set_text(verse.text_uthmani || '', -1);
                                                },
                                            }),
                                            Button({
                                                className: 'txt-small sidebar-chat-chip',
                                                label: 'Go to Surah',
                                                setup: setupCursorHover,
                                                onClicked: () => {
                                                    console.log('Going to surah:', verse.chapter_number);
                                                    if (verse.chapter_number) {
                                                        sendMessage(verse.chapter_number.toString());
                                                    }
                                                },
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ],
                    })],
                }));
            });
        });

        // Listen for errors
        if (errorHandler) {
            QuranService.disconnect(errorHandler);
        }
        errorHandler = QuranService.connect('error', (_, text) => {
            contentBox.children = []; // Clear previous content
            currentSurah = null;
            
            contentBox.add(Box({
                className: 'quran-message',
                vertical: true,
                hpack: 'center',
                css: 'padding: 8px;',
                children: [Box({
                    hpack: 'center',
                    children: [Label({
                        className: 'txt txt-small txt-error',
                        wrap: true,
                        justify: Gtk.Justification.CENTER,
                        label: text,
                    })],
                })],
            }));
        });

        self.connect('destroy', () => {
            if (scrollHandler) scrollBox.disconnect(scrollHandler);
            if (surahHandler) QuranService.disconnect(surahHandler);
            if (searchHandler) QuranService.disconnect(searchHandler);
            if (errorHandler) QuranService.disconnect(errorHandler);
        });
    },
    children: [scrollBox],
});

export function clearChat() {
    contentBox.children = [];
    contentBox.add(WelcomeMessage());
    currentSurah = null;
    if (surahListRevealer) {
        surahListRevealer.revealChild = false;
    }
}

export function sendMessage(text) {
    if (!text) {
        return;
    }

    // Check if it's a search query
    if (text.startsWith('>')) {
        const query = text.slice(1).trim();
        console.log('Got search query:', query);
        if (query) {
            console.log('Calling QuranService.searchQuran with:', query);
            QuranService.searchQuran(query);
        }
        return;
    }
    
    const surahNumber = parseInt(text);
    if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
        contentBox.children = [];
        contentBox.add(Box({
            className: 'quran-message',
            vertical: true,
            hpack: 'center',
            css: 'padding: 8px;',
            children: [Box({
                hpack: 'center',
                children: [Label({
                    className: 'txt txt-small txt-error',
                    wrap: true,
                    justify: Gtk.Justification.CENTER,
                    label: 'Please enter a valid Surah number (1-114) or use > to search',
                })],
            })],
        }));
        return;
    }

    currentSurah = surahNumber;
    QuranService.fetchSurah(surahNumber);
};

const createSurahButton = (surah, index) => Button({
    className: 'txt-smallie sidebar-chat-chip sidebar-chat-chip-action',
    css: 'padding: 8px 12px; margin: 4px 2px; font-size: 12px;',
    hexpand: true,
    onClicked: () => {
        sendMessage((index + 1).toString());
        if (surahListRevealer) {
            surahListRevealer.revealChild = false;
        }
    },
    setup: setupCursorHover,
    label: surah,
});

const surahList = Box({
    className: 'spacing-v-3',
    css: 'padding: 4px;',
    hexpand: true,
    vertical: true,
    children: [
        "1. Al-Fatihah (The Opening)",
        "2. Al-Baqarah (The Cow)",
        "3. Al-Imran (The Family of Imran)",
        "4. An-Nisa' (The Women)",
        "5. Al-Ma'idah (The Table Spread)",
        "6. Al-An'am (The Cattle)",
        "7. Al-A'raf (The Heights)",
        "8. Al-Anfal (The Spoils of War)",
        "9. At-Tawbah (The Repentance)",
        "10. Yunus (Jonah)",
        "11. Hud (Hud)",
        "12. Yusuf (Joseph)",
        "13. Ar-Ra'd (The Thunder)",
        "14. Ibrahim (Abraham)",
        "15. Al-Hijr (The Rocky Tract)",
        "16. An-Nahl (The Bee)",
        "17. Al-Isra' (The Night Journey)",
        "18. Al-Kahf (The Cave)",
        "19. Maryam (Mary)",
        "20. Ta-Ha (Ta-Ha)",
        "21. Al-Anbiya' (The Prophets)",
        "22. Al-Hajj (The Pilgrimage)",
        "23. Al-Mu'minun (The Believers)",
        "24. An-Nur (The Light)",
        "25. Al-Furqan (The Criterion)",
        "26. Ash-Shu'ara' (The Poets)",
        "27. An-Naml (The Ant)",
        "28. Al-Qasas (The Stories)",
        "29. Al-Ankabut (The Spider)",
        "30. Ar-Rum (The Romans)",
        "31. Luqman (Luqman)",
        "32. As-Sajdah (The Prostration)",
        "33. Al-Ahzab (The Combined Forces)",
        "34. Saba' (Sheba)",
        "35. Fatir (Originator)",
        "36. Ya-Sin (Ya Sin)",
        "37. As-Saffat (Those Who Set The Ranks)",
        "38. Sad (The Letter Sad)",
        "39. Az-Zumar (The Troops)",
        "40. Ghafir (The Forgiver)",
        "41. Fussilat (Explained In Detail)",
        "42. Ash-Shura (Consultation)",
        "43. Az-Zukhruf (The Gold Adornments)",
        "44. Ad-Dukhan (The Smoke)",
        "45. Al-Jathiyah (The Kneeling)",
        "46. Al-Ahqaf (The Wind-Curved Sandhills)",
        "47. Muhammad (Muhammad)",
        "48. Al-Fath (The Victory)",
        "49. Al-Hujurat (The Rooms)",
        "50. Qaf (The Letter Qaf)",
        "51. Adh-Dhariyat (The Winnowing Winds)",
        "52. At-Tur (The Mount)",
        "53. An-Najm (The Star)",
        "54. Al-Qamar (The Moon)",
        "55. Ar-Rahman (The Beneficent)",
        "56. Al-Waqi'ah (The Inevitable)",
        "57. Al-Hadid (The Iron)",
        "58. Al-Mujadilah (The Pleading Woman)",
        "59. Al-Hashr (The Exile)",
        "60. Al-Mumtahanah (The Examined One)",
        "61. As-Saff (The Ranks)",
        "62. Al-Jumu'ah (The Congregation, Friday)",
        "63. Al-Munafiqun (The Hypocrites)",
        "64. At-Taghabun (The Mutual Disillusion)",
        "65. At-Talaq (The Divorce)",
        "66. At-Tahrim (The Prohibition)",
        "67. Al-Mulk (The Sovereignty)",
        "68. Al-Qalam (The Pen)",
        "69. Al-Haqqah (The Reality)",
        "70. Al-Ma'arij (The Ascending Stairways)",
        "71. Nuh (Noah)",
        "72. Al-Jinn (The Jinn)",
        "73. Al-Muzzammil (The Enshrouded One)",
        "74. Al-Muddaththir (The Cloaked One)",
        "75. Al-Qiyamah (The Resurrection)",
        "76. Al-Insan (Man)",
        "77. Al-Mursalat (The Emissaries)",
        "78. An-Naba' (The Tidings)",
        "79. An-Nazi'at (Those Who Drag Forth)",
        "80. 'Abasa (He Frowned)",
        "81. At-Takwir (The Overthrowing)",
        "82. Al-Infitar (The Cleaving)",
        "83. Al-Mutaffifin (Defrauding)",
        "84. Al-Inshiqaq (The Splitting Open)",
        "85. Al-Buruj (The Mansions of the Stars)",
        "86. At-Tariq (The Morning Star)",
        "87. Al-A'la (The Most High)",
        "88. Al-Ghashiyah (The Overwhelming)",
        "89. Al-Fajr (The Dawn)",
        "90. Al-Balad (The City)",
        "91. Ash-Shams (The Sun)",
        "92. Al-Layl (The Night)",
        "93. Ad-Duha (The Morning Hours)",
        "94. Ash-Sharh (The Relief)",
        "95. At-Tin (The Fig)",
        "96. Al-'Alaq (The Clot)",
        "97. Al-Qadr (The Power)",
        "98. Al-Bayyinah (The Clear Proof)",
        "99. Az-Zalzalah (The Earthquake)",
        "100. Al-'Adiyat (The Courser)",
        "101. Al-Qari'ah (The Calamity)",
        "102. At-Takathur (The Rivalry in World Increase)",
        "103. Al-'Asr (The Declining Day)",
        "104. Al-Humazah (The Traducer)",
        "105. Al-Fil (The Elephant)",
        "106. Quraysh (Quraysh)",
        "107. Al-Ma'un (The Small Kindnesses)",
        "108. Al-Kawthar (The Abundance)",
        "109. Al-Kafirun (The Disbelievers)",
        "110. An-Nasr (The Divine Support)",
        "111. Al-Masad (The Palm Fiber)",
        "112. Al-Ikhlas (The Sincerity)",
        "113. Al-Falaq (The Daybreak)",
        "114. An-Nas (Mankind)"
    ].map((surah, index) => createSurahButton(surah, index)),
});

const surahListContainer = Box({
    className: 'sidebar-chat-viewport spacing-v-5',
    vexpand: true,
    hexpand: true,
    css: 'padding: 4px; min-height: 400px;',
    child: Scrollable({
        vexpand: true,
        hexpand: true,
        child: surahList,
        setup: (scrolledWindow) => {
            scrolledWindow.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC);
            const vScrollbar = scrolledWindow.get_vscrollbar();
            vScrollbar.get_style_context().add_class('sidebar-scrollbar');
        },
    }),
});

surahListRevealer = Revealer({
    revealChild: false,
    transition: 'slide_down',
    transitionDuration: 150,
    vexpand: false,
    child: surahListContainer,
});

const showSurahsButton = Button({
    className: 'sidebar-chat-chip',
    onClicked: () => {
        surahListRevealer.revealChild = !surahListRevealer.revealChild;
        showSurahsButton.label = surahListRevealer.revealChild ? 'Hide Surahs' : 'Show Surahs';
    },
    setup: setupCursorHover,
    label: 'Show Surahs',
});

const contentContainer = Box({
    className: 'sidebar-chat',
    vertical: true,
    hexpand: true,
    vexpand: true,
    children: [
        Scrollable({
            className: 'sidebar-chat-viewport',
            vexpand: true,
            hexpand: true,
            child: quranContent,
        }),
        surahListRevealer,
    ],
});

export const quranCommands = Box({
    className: 'spacing-h-5',
    children: [
        showSurahsButton,
        Box({ hexpand: true }),
   
        Button({
            className: 'sidebar-chat-chip sidebar-chat-chip-action txt txt-small',
            onClicked: clearChat,
            setup: setupCursorHover,
            label: 'Clear',
        }),
    ],
});

export const quranView = contentContainer;
