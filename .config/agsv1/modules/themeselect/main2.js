import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Indicator from '../../services/indicator.js';
import ColorScheme from './colorscheme.js';

export default () => Widget.Window({
    name: `scheme`,
    className: 'indicator',
    layer: 'overlay',
    exclusivity: 'ignore',
    visible: true,
    anchor: ['top'],
    child: Widget.EventBox({
        onHover: () => { //make the widget hide when hovering
            Indicator.popup(-1);
        },
        child: Widget.Box({
            vertical: true,
            className: 'osd-window',
            css: 'min-height: 2px;',
            children: [
                ColorScheme(),
            ]
        })
    }),
});
