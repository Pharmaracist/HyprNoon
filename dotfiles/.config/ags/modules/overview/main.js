import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import { SearchAndWindows } from "./windowcontent.js";
import { launchCustomCommand } from "./miscfunctions.js";
import PopupWindow from '../.widgethacks/popupwindow.js';
import { clickCloseRegion } from '../.commonwidgets/clickcloseregion.js';

const createCloseRegion = (expand = false) => clickCloseRegion({
    name: 'overview',
    multimonitor: false,
    expand,
});

const searchPrompt = Widget.Entry({
    on_accept: ({ text }) => {
        if (text.startsWith('>')) {
            launchCustomCommand(text);
            App.closeWindow('overview');
            return;
        }
        // ... rest of the code ...
    },
});

export default (id = '') => PopupWindow({
    name: `overview${id}`,
    keymode: 'on-demand',
    visible: false,
    anchor: ['top', 'bottom', 'left', 'right'],
    layer: 'top',
    child: Widget.Box({
        vertical: true,
        children: [
            createCloseRegion(false),
            Widget.Box({
                children: [
                    createCloseRegion(),
                    SearchAndWindows(),
                    createCloseRegion(),
                ]
            }),
            createCloseRegion(),
        ]
    }),
})
