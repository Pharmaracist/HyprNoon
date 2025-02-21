import { SearchAndWindows } from "./windowcontent.js";
import PopupWindow from '../.widgethacks/popupwindow.js';

export default (id = '') => PopupWindow({
    name: `overview${id}`,
    keymode: 'on-demand',
    anchor: ['top','left', 'right'],
    layer: 'top',
    child:SearchAndWindows()
})
