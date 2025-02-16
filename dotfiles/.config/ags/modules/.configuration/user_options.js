import GLib from 'gi://GLib';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js'
import { writable, clone } from '../.miscutils/store.js';
import { fileExists } from '../.miscutils/files.js';

const defaultConfigPath = `${GLib.get_current_dir()}/.config/ags/modules/.configuration/user_options.default.json`;
let configOptions = {};

try {
    const defaultConfig = Utils.readFile(defaultConfigPath);
    configOptions = JSON.parse(defaultConfig);
} catch (e) {
    console.error('Error loading user_options.default.json:', e);
}

// Override defaults with user's options
let optionsOkay = true;
function overrideConfigRecursive(userOverrides, configOptions = {}, check = true) {
    for (const [key, value] of Object.entries(userOverrides)) {
        if (key === '__custom' || (configOptions['__custom'] instanceof Array && 
            configOptions['__custom'].indexOf(key) >= 0)) {
            configOptions[key] = value;
            continue;
        }

        if (configOptions[key] === undefined && check) {
            console.error(`Missing config option: ${key}`);
            optionsOkay = false;
            continue;
        }

        if (typeof value === 'object' && value !== null && !(value instanceof Array)) {
            if (!configOptions[key]) configOptions[key] = {};
            overrideConfigRecursive(value, configOptions[key], check);
        } else {
            configOptions[key] = value;
        }
    }
}
const USER_CONFIG_FOLDER = GLib.get_home_dir() + '/.ags/';
const _userOptions = writable (configOptions);

async function config_error_parse (e) {
    Utils.notify ({
        summary: 'Failed to load config',
        body: e.message || 'Unknown'
    });
}

const update = (file) => {
    if (fileExists (file)) {
        try {
            const userOverrides = Utils.readFile (file);
            const copy_configOptions = clone (configOptions);
            overrideConfigRecursive(JSON.parse(userOverrides), copy_configOptions);
            if (!optionsOkay) Utils.timeout(2000, () => Utils.execAsync(['notify-send',
                'Update your user options',
                'One or more config options don\'t exist',
                '-a', 'ags',
            ]).catch(print))
            _userOptions.set (copy_configOptions);
        } catch (e) {
            config_error_parse (e);
        }
    }
};

update (USER_CONFIG_FOLDER + 'config.json');

const monitor = Utils.monitorFile (USER_CONFIG_FOLDER + 'config.json', (file, event) => {
    if (event == 1) { update (file.get_path()); }
});

globalThis['userOptions'] = _userOptions;
export default _userOptions;
