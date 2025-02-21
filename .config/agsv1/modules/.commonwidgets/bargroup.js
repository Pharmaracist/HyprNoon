import Widget from 'resource:///com/github/Aylur/ags/widget.js';

export const BarGroup = ({ child }) => Widget.Box({
    className: 'bar-group-margin bar-sides',
    children: [
        Widget.Box({
            css:`padding: 0 12px`,
            className: 'bar-group bar-group-standalone bar-group-pad-system',
            children: [child],
        }),
    ]
});
