import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import QuranService from '../../services/quran.js';

const { Box, Button, Label, Scrollable, Stack, Revealer } = Widget;
const { Gtk } = imports.gi;

const SurahButton = (number, name, onClicked) => {
    const widgetRevealer = Widget.Revealer({
        revealChild: true,
        transition: 'slide_down',
        transitionDuration: 250,
        child: Button({
            className: 'todo-item',
            onClicked: () => onClicked(number),
            child: Box({
                children: [
                    Box({
                        vertical: true,
                        children: [
                            Box({
                                spacing: 3,
                                css: 'padding: 4px;',
                                setup: (box) => {
                                    box.pack_start(Label({
                                        className: 'txt-small onSurfaceVariant',
                                        label: `${number}`,
                                        css: 'min-width: 20px;',
                                    }), false, false, 0);
                                    
                                    box.pack_start(Label({
                                        hexpand: true,
                                        xalign: 0,
                                        className: 'txt-norm onSurfaceVariant quran-arabic-text',
                                        label: name,
                                        // css: 'font-size',
                                    }), true, true, 0);
                                },
                            }),
                        ],
                    }),
                ],
            }),
        }),
    });

    return widgetRevealer;
};

const CategoryButton = (label, icon, onClicked, expanded = false) => Button({
    className: 'category-button' + (expanded ? ' active' : ''),
    onClicked: self => {
        if (activeButton) activeButton.toggleClassName('active', false);
        self.toggleClassName('active', true);
        activeButton = self;
        if (onClicked) onClicked(self);
    },
    child: Box({
        children: [
        ],
    }),
});

const SurahList = (onSurahClick) => {
    const listContent = Box({
        vertical: true,
        css: 'padding: 10px;',
    });

    // Complete list of surahs
    const surahs = [
        { number: 1, name: "الفاتحة" },
        { number: 2, name: "البقرة" },
        { number: 3, name: "آل عمران" },
        { number: 4, name: "النساء" },
        { number: 5, name: "المائدة" },
        { number: 6, name: "الأنعام" },
        { number: 7, name: "الأعراف" },
        { number: 8, name: "الأنفال" },
        { number: 9, name: "التوبة" },
        { number: 10, name: "يونس" },
        { number: 11, name: "هود" },
        { number: 12, name: "يوسف" },
        { number: 13, name: "الرعد" },
        { number: 14, name: "ابراهيم" },
        { number: 15, name: "الحجر" },
        { number: 16, name: "النحل" },
        { number: 17, name: "الإسراء" },
        { number: 18, name: "الكهف" },
        { number: 19, name: "مريم" },
        { number: 20, name: "طه" },
        { number: 21, name: "الأنبياء" },
        { number: 22, name: "الحج" },
        { number: 23, name: "المؤمنون" },
        { number: 24, name: "النور" },
        { number: 25, name: "الفرقان" },
        { number: 26, name: "الشعراء" },
        { number: 27, name: "النمل" },
        { number: 28, name: "القصص" },
        { number: 29, name: "العنكبوت" },
        { number: 30, name: "الروم" },
        { number: 31, name: "لقمان" },
        { number: 32, name: "السجدة" },
        { number: 33, name: "الأحزاب" },
        { number: 34, name: "سبإ" },
        { number: 35, name: "فاطر" },
        { number: 36, name: "يس" },
        { number: 37, name: "الصافات" },
        { number: 38, name: "ص" },
        { number: 39, name: "الزمر" },
        { number: 40, name: "غافر" },
        { number: 41, name: "فصلت" },
        { number: 42, name: "الشورى" },
        { number: 43, name: "الزخرف" },
        { number: 44, name: "الدخان" },
        { number: 45, name: "الجاثية" },
        { number: 46, name: "الأحقاف" },
        { number: 47, name: "محمد" },
        { number: 48, name: "الفتح" },
        { number: 49, name: "الحجرات" },
        { number: 50, name: "ق" },
        { number: 51, name: "الذاريات" },
        { number: 52, name: "الطور" },
        { number: 53, name: "النجم" },
        { number: 54, name: "القمر" },
        { number: 55, name: "الرحمن" },
        { number: 56, name: "الواقعة" },
        { number: 57, name: "الحديد" },
        { number: 58, name: "المجادلة" },
        { number: 59, name: "الحشر" },
        { number: 60, name: "الممتحنة" },
        { number: 61, name: "الصف" },
        { number: 62, name: "الجمعة" },
        { number: 63, name: "المنافقون" },
        { number: 64, name: "التغابن" },
        { number: 65, name: "الطلاق" },
        { number: 66, name: "التحريم" },
        { number: 67, name: "الملك" },
        { number: 68, name: "القلم" },
        { number: 69, name: "الحاقة" },
        { number: 70, name: "المعارج" },
        { number: 71, name: "نوح" },
        { number: 72, name: "الجن" },
        { number: 73, name: "المزمل" },
        { number: 74, name: "المدثر" },
        { number: 75, name: "القيامة" },
        { number: 76, name: "الانسان" },
        { number: 77, name: "المرسلات" },
        { number: 78, name: "النبإ" },
        { number: 79, name: "النازعات" },
        { number: 80, name: "عبس" },
        { number: 81, name: "التكوير" },
        { number: 82, name: "الإنفطار" },
        { number: 83, name: "المطففين" },
        { number: 84, name: "الإنشقاق" },
        { number: 85, name: "البروج" },
        { number: 86, name: "الطارق" },
        { number: 87, name: "الأعلى" },
        { number: 88, name: "الغاشية" },
        { number: 89, name: "الفجر" },
        { number: 90, name: "البلد" },
        { number: 91, name: "الشمس" },
        { number: 92, name: "الليل" },
        { number: 93, name: "الضحى" },
        { number: 94, name: "الشرح" },
        { number: 95, name: "التين" },
        { number: 96, name: "العلق" },
        { number: 97, name: "القدر" },
        { number: 98, name: "البينة" },
        { number: 99, name: "الزلزلة" },
        { number: 100, name: "العاديات" },
        { number: 101, name: "القارعة" },
        { number: 102, name: "التكاثر" },
        { number: 103, name: "العصر" },
        { number: 104, name: "الهمزة" },
        { number: 105, name: "الفيل" },
        { number: 106, name: "قريش" },
        { number: 107, name: "الماعون" },
        { number: 108, name: "الكوثر" },
        { number: 109, name: "الكافرون" },
        { number: 110, name: "النصر" },
        { number: 111, name: "المسد" },
        { number: 112, name: "الإخلاص" },
        { number: 113, name: "الفلق" },
        { number: 114, name: "الناس" }
    ];

    surahs.forEach(surah => {
        listContent.add(SurahButton(surah.number, surah.name, onSurahClick));
    });

    return Box({
        vertical: true,
        className: 'todo-list',
        children: [
            Scrollable({
                vexpand: true,
                child: listContent,
            })
        ],
    });
};

const SurahDisplay = () => {
    const contentBox = Box({
        vertical: true,
        className: 'todo-list',
        setup: (self) => {
            QuranService.connect('surah-received', (_, content) => {
                console.log('Received surah content');
                self.children = []; // Clear previous content
                
                try {
                    const data = JSON.parse(content);
                    self.add(Box({
                        vertical: true,
                        css: 'padding: 4rem; padding-top: 2rem;',
                        children: [
                            // Surah name
                            Label({
                                className: 'txt-title onSurfaceVariant quran-arabic-text',
                                label: data.name,
                                xalign: 1,
                                justification: 'right',
                                hpack: 'center',
                            }),
                            // Bismillah
                            // data.bismillah ? Label({
                            //     className: 'txt-norm quran-arabic-text',
                            //     css: 'margin: 2.5rem 0; font-size: 38px; opacity: 0.95; font-weight: 500;',
                            //     label: data.bismillah,
                            //     xalign: 1,
                            //     justification: 'right',
                            //     hpack: 'end',
                            // }) : null,
                            // Verses
                            Box({
                                hpack: 'end',
                                css: 'margin-top: 1.7rem;',
                                children: [
                                    Box({
                                        vertical: true,
                                        children: [
                                            Label({
                                                className: 'txt-hugeass onSurfaceVariant quran-arabic-text',
                                                wrap: true,
                                                xalign: 1,
                                                justify: Gtk.Justification.RIGHT,
                                                label: data.verses,
                                                selectable: true,
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                        ].filter(Boolean), // Remove null items
                    }));
                } catch (e) {
                    console.error('Error displaying surah:', e);
                }
            });
        },
    });

    return Scrollable({
        vexpand: true,
        child: contentBox,
    });
};

const WelcomeMessage = () => Box({
    className: 'todo-list',
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
                    className: 'txt-title onSurfaceVariant quran-arabic-text',
                    label: 'القرآن الكريم',
                    justification: 'center',
                    hpack: 'center',
                    css: 'font-size: 36px;',
                }),
                Label({
                    className: 'txt-norm onSurfaceVariant quran-arabic-text',
                    label: 'وَرَتِّلِ الْقُرْآنَ تَرْتِيلا',
                    justification: 'center',
                    hpack: 'center',
                    css: 'font-size: 24px;',
                }),
            ],
        }),
    ],
});

let activeButton = null;

export default () => {
    const surahDisplayBox = Box({
        vertical: true,
        className: 'spacing-v-5',
        children: [WelcomeMessage()],
    });

    const onSurahClick = (number) => {
        QuranService.fetchSurah(number);
        surahDisplayBox.children = [SurahDisplay()];
    };

    return Box({
        className: 'cheatsheet-bg spacing-h-5',
        children: [
            // Sidebar with both list and content
            Box({
                vertical: true,
                className: 'todo-list-box',
                children: [
                    // Sidebar header
                    Box({
                        className: 'todo-category-header',
                        css: 'padding: 0.75rem;',
                        children: [
                            Label({
                                hexpand: true,
                                xalign: 0,
                                className: 'txt txt-title',
                                label: 'Surahs',
                                css: 'font-size: 20px;',
                            }),
                        ],
                    }),
                    // Two-column layout
                    Box({
                        className: 'spacing-h-5',
                        children: [
                            // Left column: Categories and surah list
                            Box({
                                vertical: true,
                                className: 'sidebar-categories',
                                css: 'min-width: 80px;',
                                children: [
                                    Box({
                                        vertical: true,
                                        children: [
                                            CategoryButton('Surahs', 'menu_book', () => {}, true),
                                            Revealer({
                                                revealChild: true,
                                                transition: 'slide_down',
                                                transitionDuration: 200,
                                                child: SurahList(onSurahClick),
                                            }),
                                        ],
                                    }),
                                ],
                            }),
                            // Right column: Surah content
                            Box({
                                vertical: true,
                                hexpand: true,
                                css: 'min-width: 1100px;',
                                children: [surahDisplayBox],
                            }),
                        ],
                    }),
                ],
            }),
        ],
    });
};