const { GLib, Gdk, Gtk } = imports.gi;
const Lang = imports.lang;
const Cairo = imports.cairo;
const Pango = imports.gi.Pango;
const PangoCairo = imports.gi.PangoCairo;

import App from 'resource:///com/github/Aylur/ags/app.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
const { Box, DrawingArea, EventBox } = Widget;

import Hyprland from 'resource:///com/github/Aylur/ags/service/hyprland.js';

const getFontWeightName = (weight) => {
    switch (weight) {
        case Pango.Weight.ULTRA_LIGHT:
            return 'UltraLight';
        case Pango.Weight.LIGHT:
            return 'Light';
        case Pango.Weight.NORMAL:
            return 'Normal';
        case Pango.Weight.BOLD:
            return 'Bold';
        case Pango.Weight.ULTRA_BOLD:
            return 'UltraBold';
        case Pango.Weight.HEAVY:
            return 'Heavy';
        default:
            return 'Normal';
    }
};

// Number style conversion functions
const numberStyles = {
    'arabic': (n) => n.toString(),
    'thai': (n) => n.toString().replace(/[0-9]/g, d => '๐๑๒๓๔๕๖๗๘๙'[d]),
    'japanese': (n) => n.toString().replace(/[0-9]/g, d => '〇一二三四五六七八九'[d]),
    'chinese': (n) => n.toString().replace(/[0-9]/g, d => '零一二三四五六七八九'[d]),
    'korean': (n) => n.toString().replace(/[0-9]/g, d => '영일이삼사오육칠팔구'[d]),
    'devanagari': (n) => n.toString().replace(/[0-9]/g, d => '०१२३४५६७८९'[d]),
    'bengali': (n) => n.toString().replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[d])
};

const convertNumber = (number, style = 'arabic') => {
    const converter = numberStyles[style] || numberStyles.arabic;
    return converter(number);
};

const WorkspaceContents = () => {
    return DrawingArea({
        className: 'bar-ws-container',
        attribute: {
            updateMask: (self) => {
                self.queue_draw(); // Redraw whenever there's a change
            },
        },
        setup: (area) => area
            .hook(Hyprland.active.workspace, (self) => {
                self.setCss(`font-size: ${Hyprland.active.workspace.id}px;`);
            })
            .hook(Hyprland, (self) => self.attribute.updateMask(self), 'notify::workspaces')
            .on('draw', Lang.bind(area, (area, cr) => {
                const allocation = area.get_allocation();
                const { width, height } = allocation;

                const workspaceStyleContext = dummyWs.get_style_context();
                const workspaceFontSize = workspaceStyleContext.get_property('font-size', Gtk.StateFlags.NORMAL);
                const workspaceFontFamily = workspaceStyleContext.get_property('font-family', Gtk.StateFlags.NORMAL);
                const workspaceFontWeight = workspaceStyleContext.get_property('font-weight', Gtk.StateFlags.NORMAL);
                const wsfg = workspaceStyleContext.get_property('color', Gtk.StateFlags.NORMAL);

                const layout = PangoCairo.create_layout(cr);
                const fontDesc = Pango.font_description_from_string(`${workspaceFontFamily[0]} ${getFontWeightName(workspaceFontWeight)} ${workspaceFontSize}`);
                layout.set_font_description(fontDesc);
                cr.setAntialias(Cairo.Antialias.BEST);

                // Get the current workspace ID
                const workspaceId = Hyprland.active.workspace.id;

                // Convert number to selected style
                const numberStyle = userOptions.asyncGet().workspaces.style || 'arabic';
                const displayNumber = convertNumber(workspaceId, numberStyle);
                layout.set_text(displayNumber, -1);

                const [layoutWidth, layoutHeight] = layout.get_pixel_size();
                const x = (width - layoutWidth) / 2;
                const y = (height - layoutHeight) / 2;
                cr.moveTo(x, y);
                PangoCairo.show_layout(cr, layout);
                cr.stroke();
            })),
    });
};

export default () => EventBox({
    hexpand: true,
    attribute: {
        ws_group: 0,
    },
    child: Box({
        homogeneous: true,
        className: 'bar-group-margin',
        hexpand: true,
        children: [Box({
            css: 'min-width: 2px;',
            hexpand: true,
            children: [WorkspaceContents()],
        })]
    }),
});