import Glib from 'gi://GLib';

/**
     * 
     * @param {String} path
     * @param {Number} mode 
     * @param {(err: Error|null) => void} callback
     */
function mkdirpAsync (path, mode = 755, callback) {
    const success = Glib.mkdir_with_parents (path, mode) == 0;
    if (success) { callback (null); }
    else { callback (new Error ('Failed to create directory on path: ' + path)); }
} 

/**
 * 
 * @param {String} path 
 * @param {Number} mode
 */
async function mkdirp (path, mode = 755) {
    return new Promise ((resolve, reject) => {
        mkdirpAsync (path, mode, (e) => {
            if (e === null) { resolve (e); }
            else { reject (e); }
        });
    })
}

export default {
    mkdirp,
    mkdirpAsync
};