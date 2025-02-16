import Widget from 'resource:///com/github/Aylur/ags/widget.js';
const { Gtk } = imports.gi;

export const RoundedCorner = (place, props) => Widget.DrawingArea({
    ...props,
    css: 'min-width: 16px; min-height: 16px;',
    setup: widget => {
        widget.set_size_request(16, 16);
        widget.connect('draw', (widget, cr) => {
            const c = widget.get_style_context().get_property('background-color', Gtk.StateFlags.NORMAL);
            cr.arc(...{
                'topleft': [16, 16, 16, Math.PI, 3 * Math.PI / 2],
                'topright': [0, 16, 16, 3 * Math.PI / 2, 2 * Math.PI],
                'bottomleft': [16, 0, 16, Math.PI / 2, Math.PI],
                'bottomright': [0, 0, 16, 0, Math.PI / 2],
            }[place]);
            cr.lineTo(...{
                'topleft': [0, 0],
                'topright': [16, 0],
                'bottomleft': [0, 16],
                'bottomright': [16, 16],
            }[place]);
            cr.closePath();
            cr.setSourceRGBA(c.red, c.green, c.blue, c.alpha);
            cr.fill();
            return false;
        });
    },
});