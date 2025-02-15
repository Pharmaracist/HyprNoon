const { Gio, GLib } = imports.gi;
import Variable from 'resource:///com/github/Aylur/ags/variable.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import { ConfigToggle, ConfigMulipleSelection } from '../.commonwidgets/configwidgets.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { execAsync } = Utils;
import { setupCursorHover } from '../.widgetutils/cursorhover.js';
import { showColorScheme } from '../../variables.js';
import { MaterialIcon } from '../.commonwidgets/materialicon.js';
import { darkMode } from '../.miscutils/system.js';

const ColorBox = ({
    name = 'Color',
    ...rest
}) => Widget.Box({
    ...rest,
    homogeneous: true,
    children: [
        Widget.Label({
            label: `${name}`,
        })
    ]
})

const ColorSchemeSettingsRevealer = () => {
    const headerButtonIcon = MaterialIcon('expand_more', 'norm');
    const header = Widget.Button({
        className: 'osd-settings-btn-arrow',
        onClicked: () => {
            content.revealChild = !content.revealChild;
            headerButtonIcon.label = content.revealChild ? 'expand_less' : 'expand_more';
        },
        setup: setupCursorHover,
        hpack: 'end',
        child: headerButtonIcon,
    });
    const content = Widget.Revealer({
        revealChild: false,
        transition: 'slide_down',
        transitionDuration: 200,
        child: ColorSchemeSettings(),
        setup: (self) => self.hook(isHoveredColorschemeSettings, (revealer) => {
            if (isHoveredColorschemeSettings.value == false) {
                setTimeout(() => {
                    if (isHoveredColorschemeSettings.value == false)
                        revealer.revealChild = false;
                    headerButtonIcon.label = 'expand_more';
                }, 1500);
            }
        }),
    });
    return Widget.EventBox({
        onHover: (self) => {
            isHoveredColorschemeSettings.setValue(true);
        },
        onHoverLost: (self) => {
            isHoveredColorschemeSettings.setValue(false);
        },
        child: Widget.Box({
            vertical: true,
            children: [
                header,
                content,
            ]
        }),
    });
}

function calculateSchemeInitIndex(optionsArr, searchValue = 'content') {
    if (searchValue == '')
        searchValue = 'content';
    const flatArray = optionsArr.flatMap(subArray => subArray);
    const result = flatArray.findIndex(element => element.value === searchValue);
    const rowIndex = Math.floor(result / optionsArr[0].length);
    const columnIndex = result % optionsArr[0].length;
    return [rowIndex, columnIndex];
}
const gowallArr = [
    [
        { name: getString('Catppuccin'), value: 'catppuccin' },
        { name: getString('Nord'), value: 'nord' },
        { name: getString('Dracula'), value: 'dracula' },
        { name: getString('Tokyo'), value: 'tokyo-night' },
        { name: getString('Everforest'), value: 'everforest' },
    ],
    [
        { name: getString('Gruvbox'), value: 'gruvbox' },
        { name: getString('One Dark'), value: 'onedark' },
        { name: getString('Solarized'), value: 'solarized' },
        { name: getString('Cyber'), value: 'cyberpunk' },
    ],
    // [
    //     { name: getString('Material'), value: 'catppuccin' },
    //     { name: getString('Atom One Light'), value: 'nord' },
    //     { name: getString('Sweet'), value: 'everforest' },
    //     { name: getString('Synthwave 84'), value: 'synthwave84' },
    // ],
    // [
    //     { name: getString('Atom Dark'), value: 'gruvbox' },
    //     { name: getString('Ocianic Next'), value: 'dracula' },
    //     { name: getString('Shades of Purple'), value: 'tokyo-night' },
    //     { name: getString('Arc Dark'), value: 'onedark' },
    // ],
    // [
    //     { name: getString('Sunset Aurant'), value: 'catppuccin' },
    //     { name: getString('Sunset Saffron'), value: 'nord' },
    //     { name: getString('Sunset Tangerine'), value: 'everforest' },
    // ],
    // [
    //     { name: getString('Night Owl'), value: 'gruvbox' },
    //     { name: getString('Github Black'), value: 'dracula' },
    //     { name: getString('Github White'), value: 'tokyo-night' },
    // ],
    [
        { name: getString('Off'), value: 'none' },
    ],
];
const schemeOptionsArr = [
    [
        { name: getString('Tonal Spot'), value: 'tonal-spot' },
        { name: getString('Fruit Salad'), value: 'fruit-salad' },
        { name: getString('Fidelity'), value: 'fidelity' },
        { name: getString('Rainbow'), value: 'rainbow' },
    ],
    [
        { name: getString('Neutral'), value: 'neutral' },
        { name: getString('Monochrome'), value: 'monochrome' },
        { name: getString('Expressive'), value: 'expressive' },
        { name: getString('Content'), value: 'content' },
    ]
   
];

const LIGHTDARK_FILE_LOCATION = `${GLib.get_user_state_dir()}/ags/user/colormode.txt`;
const initTransparency = Utils.exec(`bash -c "sed -n \'2p\' ${LIGHTDARK_FILE_LOCATION}"`);
const initTransparencyVal = (initTransparency == "transparent") ? 1 : 0;
const initScheme = Utils.exec(`bash -c "sed -n \'3p\' ${LIGHTDARK_FILE_LOCATION}"`);
const initSchemeIndex = calculateSchemeInitIndex(schemeOptionsArr, initScheme);
const initGowall = Utils.exec(`bash -c "sed -n \'4p\' ${LIGHTDARK_FILE_LOCATION}"`);
const initGowallIndex = calculateSchemeInitIndex(gowallArr, initGowall);

const ColorSchemeSettings = () => Widget.Box({
    className: 'osd-colorscheme-settings spacing-v-5 margin-20',
    vertical: true,
    vpack: 'center',
    children: [
        Widget.Box({
            vertical: true,
            children: [
                Widget.Label({
                    xalign: 0,
                    className: 'txt-norm titlefont onSurfaceVariant',
                    label: getString('Options'),
                    hpack: 'center',
                }),
                //////////////////
                ConfigToggle({
                    icon: 'dark_mode',
                    name: getString('Dark Mode'),
                    desc: getString('Ya should go to sleep!'),
                    initValue: darkMode.value,
                    onChange: (_, newValue) => {
                        darkMode.value = !!newValue;
                    },
                    extraSetup: (self) => self.hook(darkMode, (self) => {
                        self.enabled.value = darkMode.value;
                    }),
                }),
                ConfigToggle({
                    icon: 'border_clear',
                    name: getString('Transparency'),
                    desc: getString('Make Everything transparent'),
                    initValue: initTransparencyVal,
                    onChange: async (self, newValue) => {
                        try {
                            const transparency = newValue == 0 ? "opaque" : "transparent";
                            await execAsync([`bash`, `-c`, `mkdir -p ${GLib.get_user_state_dir()}/ags/user && sed -i "2s/.*/${transparency}/"  ${GLib.get_user_state_dir()}/ags/user/colormode.txt`]);
                            await execAsync(['bash', '-c', `${App.configDir}/scripts/color_generation/applycolor.sh &`]);
                        } catch (error) {
                            console.error('Error changing transparency:', error);
                        }
                    },
                }),
                ConfigToggle({
                    icon: 'image',
                    name: getString('GoWall'),
                    desc: getString('Theme Wallpaper for ColorPalette'),
                    initValue: initGowallIndex,
                    onChange: async (self, newValue) => {
                        try {
                            const gowall = newValue == 0 ? "none" : "";
                            await execAsync([`bash`, `-c`, `mkdir -p ${GLib.get_user_state_dir()}/ags/user && sed -i "4s/.*/${gowall}/"  ${GLib.get_user_state_dir()}/ags/user/colormode.txt`]);
                            await execAsync(['bash', '-c', `${App.configDir}/scripts/color_generation/applycolor.sh &`]);
                        } catch (error) {
                            console.error('Error changing transparency:', error);
                        }
                    },
                })
            ]
        }),
        Widget.Box({
            vertical: true,
            spacing: 10,
            children: [
                Widget.Label({
                    xalign: 0,
                    className: 'txt-norm titlefont onSurfaceVariant',
                    label: getString('Scheme styles'),
                    hpack: 'center',
                }),
                //////////////////
                ConfigMulipleSelection({
                    hpack: 'center',
                    vpack: 'center',
                    optionsArr: schemeOptionsArr,
                    initIndex: initSchemeIndex,
                    onChange: async (value, name) => {
                        await execAsync([`bash`, `-c`, `mkdir -p ${GLib.get_user_state_dir()}/ags/user && sed -i "3s/.*/${value}/" ${GLib.get_user_state_dir()}/ags/user/colormode.txt`]);
                        await execAsync(['bash', '-c', `${App.configDir}/scripts/color_generation/switchcolor.sh`]);
                    },
                }),
                Widget.Label({
                    xalign: 0,
                    className: 'txt-norm titlefont onSurfaceVariant',
                    label: getString('Wallpaper Styles'),
                    hpack: 'center',
                }),
                ConfigMulipleSelection({
                    hpack: 'center',
                    vpack: 'center',
                    optionsArr: gowallArr,
                    initIndex: initGowallIndex,
                    onChange: (value, name) => {
                        execAsync([`bash`, `-c`, `mkdir -p ${GLib.get_user_state_dir()}/ags/user && sed -i "4s/.*/${value}/" ${GLib.get_user_state_dir()}/ags/user/colormode.txt`])
                            .then(execAsync(['bash', '-c', `${App.configDir}/scripts/color_generation/switchwall.sh --switch`]))
                    },
                }),
                //////////////////
            ]
        })
    ]
});

const ColorschemeContent = () => Widget.Box({
    className: 'osd-colorscheme spacing-v-5',
    vertical: true,
    hpack: 'center',
    children: [
        Widget.Label({
            xalign: 0,
            className: 'txt-norm titlefont txt',
            label: getString('Color scheme'),
            hpack: 'center',
        }),
        Widget.Box({
            className: 'spacing-h-5',
            hpack: 'center',
            children: [
                ColorBox({ name: 'P', className: 'osd-color osd-color-primary' }),
                ColorBox({ name: 'S', className: 'osd-color osd-color-secondary' }),
                ColorBox({ name: 'T', className: 'osd-color osd-color-tertiary' }),
                ColorBox({ name: 'Sf', className: 'osd-color osd-color-surface' }),
                ColorBox({ name: 'Sf-i', className: 'osd-color osd-color-inverseSurface' }),
                ColorBox({ name: 'E', className: 'osd-color osd-color-error' }),
            ]
        }),
        Widget.Box({
            className: 'spacing-h-5',
            hpack: 'center',
            children: [
                ColorBox({ name: 'P-c', className: 'osd-color osd-color-primaryContainer' }),
                ColorBox({ name: 'S-c', className: 'osd-color osd-color-secondaryContainer' }),
                ColorBox({ name: 'T-c', className: 'osd-color osd-color-tertiaryContainer' }),
                ColorBox({ name: 'Sf-c', className: 'osd-color osd-color-surfaceContainer' }),
                ColorBox({ name: 'Sf-v', className: 'osd-color osd-color-surfaceVariant' }),
                ColorBox({ name: 'E-c', className: 'osd-color osd-color-errorContainer' }),
            ]
        }),
        ColorSchemeSettingsRevealer(),
    ]
});

const isHoveredColorschemeSettings = Variable(false);

export default () => Widget.Revealer({
    transition: 'slide_down',
    transitionDuration: userOptions.asyncGet().animations.durationLarge,
    child: ColorschemeContent(),
    setup: (self) => {
        self
            .hook(showColorScheme, (revealer) => {
                if (showColorScheme.value == true)
                    revealer.revealChild = true;
                else
                    revealer.revealChild = isHoveredColorschemeSettings.value;
            })
            .hook(isHoveredColorschemeSettings, (revealer) => {
                if (isHoveredColorschemeSettings.value == false) {
                    setTimeout(() => {
                        if (isHoveredColorschemeSettings.value == false)
                            revealer.revealChild = showColorScheme.value;
                    }, 2000);
                }
            })
    },
})
