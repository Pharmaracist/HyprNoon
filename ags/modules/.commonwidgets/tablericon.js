import Widget from 'resource:///com/github/Aylur/ags/widget.js';

export const TablerIcon = (icon, size, props = {}) => Widget.Label({
    className: `icon-tabler txt-${size}`,
    label: icon,
    ...props,
})
