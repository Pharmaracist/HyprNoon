import GLib from 'gi://GLib';
import App from 'resource:///com/github/Aylur/ags/app.js'
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js'
export const COMPILED_STYLE_DIR = `${GLib.get_user_cache_dir()}/ags/user/generated`

// More Basic - Faster Version
globalThis['handleStyles'] = () => {
    Utils.exec(`mkdir -p "${GLib.get_user_state_dir()}/ags/scss"`);
    async function applyStyle() {
        Utils.exec(`mkdir -p ${COMPILED_STYLE_DIR}`);
        Utils.exec(`sass -I "${GLib.get_user_state_dir()}/ags/scss" -I "${App.configDir}/scss/fallback" "${App.configDir}/scss/main.scss" "${COMPILED_STYLE_DIR}/style.css"`);
        App.resetCss();
        App.applyCss(`${COMPILED_STYLE_DIR}/style.css`);
    }
    applyStyle();
}
