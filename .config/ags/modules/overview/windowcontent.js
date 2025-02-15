const { Gdk, Gtk } = imports.gi;
import App from 'resource:///com/github/Aylur/ags/app.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import GLib from "gi://GLib";
import Gio from 'gi://Gio';
import Applications from 'resource:///com/github/Aylur/ags/service/applications.js';
const { execAsync, exec } = Utils;
import { execAndClose, expandTilde, hasUnterminatedBackslash, couldBeMath, launchCustomCommand, ls } from './miscfunctions.js';
import {
    CalculationResultButton, CustomCommandButton, DirectoryButton,
    DesktopEntryButton, ExecuteCommandButton, SearchButton, AiButton, NoResultButton,
} from './searchbuttons.js';
import { checkKeybind } from '../.widgetutils/keybind.js';
import GeminiService from '../../services/gemini.js';
import { Writable, writable, waitLastAction } from '../.miscutils/store.js';

// Добавляем математические функции
const { abs, sin, cos, tan, cot, asin, acos, atan, acot } = Math;
const pi = Math.PI;
// Тригонометрические функции для градусов
const sind = x => sin(x * pi / 180);
const cosd = x => cos(x * pi / 180);
const tand = x => tan(x * pi / 180);
const cotd = x => cot(x * pi / 180);
const asind = x => asin(x) * 180 / pi;
const acosd = x => acos(x) * 180 / pi;
const atand = x => atan(x) * 180 / pi;
const acotd = x => acot(x) * 180 / pi;

const MAX_RESULTS = 8; // Уменьшаем количество результатов
const OVERVIEW_SCALE = 0.18;
const OVERVIEW_WS_NUM_SCALE = 0.09;
const OVERVIEW_WS_NUM_MARGIN_SCALE = 0.07;
const TARGET = [Gtk.TargetEntry.new('text/plain', Gtk.TargetFlags.SAME_APP, 0)];

// Кэшируем тему иконок
const iconTheme = Gtk.IconTheme.get_default();
function iconExists(iconName) {
    return iconTheme.has_icon(iconName);
}

const OptionalOverview = async () => {
    try {
        return (await import('./overview_hyprland.js')).default();
    } catch {
        return Widget.Box({});
    }
};

const overviewContent = await OptionalOverview();

/**
 * @type {Gio.FileMonitor[]}
 */
let monitors = [];
/**
 * @type {GLib.Source|null}
 */
let waitToRereadDesktop = null;

const watchersOption = writable ([]);

watchersOption.subscribe (/*** @param {string[]} paths */ (paths) => {
    for (const monitor of monitors) {
        monitor.cancel();
    }

    monitors = [];

    for (const path of paths) {
        const monitor = Utils.monitorFile (expandTilde(path), () => {
            waitToRereadDesktop = waitLastAction (waitToRereadDesktop, 500, () => {
                Applications.reload();
                waitToRereadDesktop = null;
            });
        });
        if (monitor !== null) { monitors.push(monitor); }
    }
});

userOptions.subscribe ((n) => {
    watchersOption.set (n.search.watchers ?? []);
});

export const SearchAndWindows = () => {
    let _appSearchResults = [];
    const options = userOptions.asyncGet();
    
    const resultsBox = Widget.Box({
        className: 'overview-search-results',
        vertical: true,
    });

    const resultsRevealer = Widget.Revealer({
        transitionDuration: options.animations.durationLarge,
        revealChild: false,
        transition: 'slide_down',
        hpack: 'center',
        child: resultsBox,
    });

    const entryPromptRevealer = Widget.Revealer({
        transition: 'crossfade', 
        transitionDuration: options.animations.durationLarge,
        revealChild: true,
        hpack: 'center',
        child: Widget.Label({
            className: 'overview-search-prompt txt-small txt',
            label: getString('Type to search')
        }),
    });

    const entryIconRevealer = Widget.Revealer({
        transition: 'crossfade',
        transitionDuration: options.animations.durationLarge,
        revealChild: false,
        hpack: 'end',
        child: Widget.Label({
            className: 'txt txt-large icon-material overview-search-icon',
            label: 'search',
        }),
    });
    const entryIcon = Widget.Box({
        className: 'overview-search-prompt-box',
        setup: box => box.pack_start(entryIconRevealer, true, true, 0),
    });

    const entry = Widget.Entry({
        className: 'overview-search-box txt-small txt',
        hpack: 'center',
        onAccept: (self) => {
            resultsBox.children[0]?.onClicked();
        },
        onChange: (entry) => {
            const text = entry.text;
            const isAction = text[0] === '>';
            const isDir = ['/', '~'].includes(text[0]);

            resultsBox.get_children().forEach(ch => ch.destroy());

            if (!text) {
                resultsRevealer.revealChild = false;
                overviewContent.revealChild = true;
                entryPromptRevealer.revealChild = true;
                entryIconRevealer.revealChild = false;
                entry.toggleClassName('overview-search-box-extended', false);
                return;
            }

            resultsRevealer.revealChild = true;
            overviewContent.revealChild = false;
            entryPromptRevealer.revealChild = false;
            entryIconRevealer.revealChild = true;
            entry.toggleClassName('overview-search-box-extended', true);

            // Кэшируем результаты поиска
            _appSearchResults = Applications.query(text);

            if (options.search.enableFeatures.mathResults && couldBeMath(text)) {
                try {
                    resultsBox.add(CalculationResultButton({ 
                        result: eval(text.replace(/\^/g, "**")),
                        text: text 
                    }));
                } catch {}
            }

            if (options.search.enableFeatures.directorySearch && isDir) {
                ls({ path: text, silent: true })
                    .forEach(item => resultsBox.add(DirectoryButton(item)));
            }

            if (options.search.enableFeatures.actions && isAction) {
                resultsBox.add(CustomCommandButton({ text }));
            }

            // Добавляем приложения
            _appSearchResults.slice(0, MAX_RESULTS)
                .forEach(app => resultsBox.add(DesktopEntryButton(app)));

            // Добавляем команды
            if (options.search.enableFeatures.commands && !isAction && 
                !hasUnterminatedBackslash(text) && 
                exec(`bash -c "command -v ${text.split(' ')[0]}"`) !== '') {
                resultsBox.add(ExecuteCommandButton({ 
                    command: text,
                    terminal: text.startsWith('sudo')
                }));
            }

            // Добавляем поиск
            if (options.search.enableFeatures.aiSearch)
                resultsBox.add(AiButton({ text }));
            if (options.search.enableFeatures.webSearch)
                resultsBox.add(SearchButton({ text }));
            if (resultsBox.children.length === 0)
                resultsBox.add(NoResultButton());

            resultsBox.show_all();
        },
    });

    return Widget.Box({
        vertical: true,
        children: [
            Widget.Box({
                hpack: 'center',
                children: [
                    entry,
                    Widget.Box({
                        className: 'overview-search-icon-box',
                        setup: box => box.pack_start(entryPromptRevealer, true, true, 0),
                    }),
                    entryIcon,
                ]
            }),
            overviewContent,
            resultsRevealer,
        ],
        setup: (self) => self
            .hook(App, (_b, name, visible) => {
                if (name === 'overview' && !visible) {
                    resultsBox.children = [];
                    entry.set_text('');
                }
            })
            .on('key-press-event', (widget, event) => {
                const keyval = event.get_keyval()[1];
                const modstate = event.get_state()[1];

                if (checkKeybind(event, options.keybinds.overview.altMoveLeft))
                    entry.set_position(Math.max(entry.get_position() - 1, 0));
                else if (checkKeybind(event, options.keybinds.overview.altMoveRight))
                    entry.set_position(Math.min(entry.get_position() + 1, entry.get_text().length));
                else if (checkKeybind(event, options.keybinds.overview.deleteToEnd)) {
                    const pos = entry.get_position();
                    entry.set_text(entry.get_text().slice(0, pos));
                    entry.set_position(pos);
                }
                else if (!(modstate & Gdk.ModifierType.CONTROL_MASK) && 
                    keyval >= 32 && keyval <= 126 && widget !== entry) {
                    Utils.timeout(1, () => {
                        entry.grab_focus();
                        entry.set_text(entry.text + String.fromCharCode(keyval));
                        entry.set_position(-1);
                    });
                }
            }),
    });
};
