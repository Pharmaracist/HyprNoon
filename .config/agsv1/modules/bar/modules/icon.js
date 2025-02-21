import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';

const { Box, Icon } = Widget;

// /**
//  * Create an icon widget that displays an image from the assets/icons folder
//  * @param {Object} props - Widget properties
//  * @param {string} props.icon - Icon filename from assets/icons folder (e.g., 'github.svg')
//  * @param {number} [props.size=36] - Icon size in pixels
//  * @param {string} [props.className=''] - Additional CSS classes
//  */
const IconWidget = ({ icon, size = 36, className = '' }) => {
    // Construct the full path to the icon
    const iconPath = App.configDir + '/assets/icons/' + icon ;

    return Box({
        className: `icon-module ${className}`,
        children: [
            Icon({
                icon: iconPath,
                size,
                hpack: 'center',
                vpack: 'center',
                css: 'color: inherit;',
            }),
        ],
    });
};

export default IconWidget;
