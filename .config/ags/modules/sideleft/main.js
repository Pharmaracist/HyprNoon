import PopupWindow from '../.widgethacks/popupwindow.js';
import SidebarLeft from "./sideleft.js";
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
const { Box } = Widget;
import clickCloseRegion from '../.commonwidgets/clickcloseregion.js';

export default () => PopupWindow({
    keymode: 'on-demand',
    anchor: ['left', 'top', 'bottom'],
    name: 'sideleft',
    layer: 'top',
    child: Box({
        children: [
            SidebarLeft(),
            userOptions.asyncGet().etc.clickCloseRegion ? clickCloseRegion({ name: 'sideleft', multimonitor: false, fillMonitor: 'horizontal' }) : null,
        ]
    })
});
