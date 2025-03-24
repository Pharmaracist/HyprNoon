import Widget from "resource:///com/github/Aylur/ags/widget.js";

export const TablerIcon = (icon, size, props = {}) => {
  // Convert the hexadecimal string to a Unicode character.
  const iconChar = String.fromCharCode(parseInt(icon, 16));
  return Widget.Label({
    className: `icon-tabler txt-${size}`,
    css: "font-family: 'tabler-icons';",
    label: iconChar,
    ...props,
  });
};
