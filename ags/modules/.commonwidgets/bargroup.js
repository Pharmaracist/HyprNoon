import Widget from 'resource:///com/github/Aylur/ags/widget.js';
const { Box, EventBox } = Widget;

export const BarGroup = ({ child }) => Box({
    className: 'bar-group-margin bar-sides',
    children: [
        Box({
            css: `padding: 0 12px`,
            className: 'bar-group bar-group-standalone bar-group-pad-system',
            children: [child],
        }),
    ]
});

export const SaadiBarGroup = ({ child, onClick, props = {} }) => EventBox({
    child: Box({
        ...props,
        hexpand: false,
        className: "group-saadi",
        children: [child],
    }),
    onPrimaryClick: () => onClick || null,
})

