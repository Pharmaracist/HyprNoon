import PopupWindow from '../.widgethacks/popupwindow.js';
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import clickCloseRegion from '../.commonwidgets/clickcloseregion.js';
import SidebarRight from "./sideright.js";
const { Box } = Widget;

export default () => PopupWindow({
    keymode: 'on-demand',
    anchor: ['right', 'top', 'bottom'],
    name: 'sideright',
    layer: 'top',
    child: Box({
        children: [
            clickCloseRegion({ name: 'sideright', multimonitor: false, fillMonitor: 'horizontal' }),
            SidebarRight(),
        ]
    })
});
