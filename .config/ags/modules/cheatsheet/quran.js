import Widget from "resource:///com/github/Aylur/ags/widget.js";
import QuranService from "../../services/quran.js";
import { surahs } from "../.commondata/surahs.js";
const { Box, Button, Label, Scrollable, Stack, Revealer } = Widget;
const { Gtk } = imports.gi;

const SurahButton = (number, name, onClicked) => {
  const widgetRevealer = Widget.Revealer({
    revealChild: true,
    transition: "slide_down",
    transitionDuration: 250,
    child: Button({
      className: "todo-item",
      onClicked: () => onClicked(number),
      child: Box({
        children: [
          Box({
            vertical: true,
            children: [
              Box({
                spacing: 3,
                css: "padding: 4px;",
                setup: (box) => {
                  box.pack_start(
                    Label({
                      className: "txt-small onSurfaceVariant",
                      label: `${number}`,
                      css: "min-width: 20px;",
                    }),
                    false,
                    false,
                    0
                  );

                  box.pack_start(
                    Label({
                      hexpand: true,
                      xalign: 0,
                      className: "txt-norm onSurfaceVariant quran-arabic-text",
                      label: name,
                      // css: 'font-size',
                    }),
                    true,
                    true,
                    0
                  );
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

const CategoryButton = (label, icon, onClicked, expanded = false) =>
  Button({
    className: "category-button" + (expanded ? " active" : ""),
    onClicked: (self) => {
      if (activeButton) activeButton.toggleClassName("active", false);
      self.toggleClassName("active", true);
      activeButton = self;
      if (onClicked) onClicked(self);
    },
    child: Box({
      children: [],
    }),
  });

const SurahList = (onSurahClick) => {
  const listContent = Box({
    vertical: true,
  });

  surahs.forEach((surah) => {
    listContent.add(SurahButton(surah.number, surah.name, onSurahClick));
  });

  return Box({
    vertical: true,
    hexpand: false,
    className: "quran-cheatsheet-sidebar",
    children: [
      Scrollable({
        vexpand: true,
        hexpand: false,
        child: listContent,
      }),
    ],
  });
};

const SurahDisplay = () => {
  const contentBox = Box({
    vertical: true,
    className: "todo-list",
    setup: (self) => {
      QuranService.connect("surah-received", (_, content) => {
        console.log("Received surah content");
        self.children = []; // Clear previous content

        try {
          const data = JSON.parse(content);
          self.add(
            Box({
              vertical: true,
              css: "padding: 4rem; padding-top: 2rem;",
              children: [
                // Surah name
                Label({
                  className: "txt-title onSurfaceVariant quran-arabic-text",
                  label: data.name,
                  xalign: 1,
                  justification: "right",
                  hpack: "center",
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
                  hpack: "end",
                  css: "margin-top: 1.7rem;",
                  children: [
                    Box({
                      vertical: true,
                      children: [
                        Label({
                          className:
                            "txt-hugeass onSurfaceVariant quran-arabic-text",
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
            })
          );
        } catch (e) {
          console.error("Error displaying surah:", e);
        }
      });
    },
  });

  return Scrollable({
    vexpand: true,
    child: contentBox,
  });
};

const WelcomeMessage = () =>
  Box({
    className: "todo-list",
    vertical: true,
    vexpand: true,
    hexpand: true,
    vpack: "center",
    hpack: "center",
    css: "padding: 2rem;",
    children: [
      Box({
        vertical: true,
        className: "spacing-v-5",
        hpack: "center",
        children: [
          Box({
            className: "sidebar-chat-welcome-logo",
            hpack: "center",
            css: "margin-left:1rem;min-width: 80px; min-height: 80px; margin-bottom: 1rem;padding: 1.3rem",
            children: [
              Widget.Icon({
                icon: "quran-symbolic",
                size: 80,
              }),
            ],
          }),
          Label({
            className: "txt-title onSurfaceVariant quran-arabic-text",
            label: "القرآن الكريم",
            justification: "center",
            hpack: "center",
            css: "font-size: 36px;",
          }),
          Label({
            className: "txt-norm onSurfaceVariant quran-arabic-text",
            label: "وَرَتِّلِ الْقُرْآنَ تَرْتِيلا",
            justification: "center",
            hpack: "center",
            css: "font-size: 24px;",
          }),
        ],
      }),
    ],
  });

let activeButton = null;

export default () => {
  const surahDisplayBox = Box({
    vertical: true,
    className: "spacing-v-5",
    children: [WelcomeMessage()],
  });

  const onSurahClick = (number) => {
    QuranService.fetchSurah(number);
    surahDisplayBox.children = [SurahDisplay()];
  };

  return Box({
    className: "cheatsheet-bg spacing-h-5",
    children: [
      // Sidebar with both list and content
      Box({
        vertical: true,
        className: "todo-list-box",
        children: [
          Box({
            className: "spacing-h-5",
            children: [
              Box({
                vertical: true,
                className: "sidebar-categories",
                css: "min-width: 80px;",
                children: [
                  Box({
                    vertical: true,
                    children: [
                      CategoryButton("Surahs", "menu_book", () => {}, true),
                      Revealer({
                        revealChild: true,
                        transition: "slide_down",
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
                css: "min-width: 1100px;",
                children: [surahDisplayBox],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
