import Widget from 'resource:///com/github/Aylur/ags/widget.js';
const { Box, Label, Scrollable } = Widget;
import QuickScripts from './tools/quickscripts.js';
import ColorPicker from './tools/colorpicker.js';
import Configure from './../sideright/centermodules/configure.js';
export default Scrollable({
    hscroll: "never",
    vscroll: "automatic",
    child: Box({
        vertical: true,
        className: 'spacing-v-10',
        children: [
            Box({child:Configure(),css:`margin-top:1.2rem`}),
            ColorPicker(),
            QuickScripts(),
        ]
    })
});
