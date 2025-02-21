import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import App from 'resource:///com/github/Aylur/ags/app.js'
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js'

/**
 * 
 * @param {String} file 
 * @param {String} data 
 * @param {{callback?: (err: any) => void}} options
 */
export function writeFile (file, data, {...options}) {
    console.log('writeFile(...)', file, data);
    if (!data) {
        const f = Gio.File.new_for_path(file);
        f.create_async(Gio.FileCreateFlags.NONE,
            GLib.PRIORITY_DEFAULT, null, (f, e) => {
                const exists = GLib.file_test (file, GLib.FileTest.EXISTS);
                if (options.callback) { options.callback (exists ? null : new Error ('Failed to create the file on path ' + file)); }
            });
        return;
    }
    Utils.writeFile (data, file).then (() => {
        if (options.callback) options.callback (null);
    }).catch ((e) => {
        if (options.callback) options.callback (e);
    });
}

/**
 * 
 * @param {String} file 
 * @param {{callback?: (err: any|null, content: String) => void, encode?: 'utf8'}} options 
 */
export function readFile (file, {...options}) {
    Utils.readFileAsync (file).then ((content) => {
        if (options.callback) options.callback (null, content);
    }).catch ((e) => {
        if (options.callback) options.callback (e, '');
    });
}

/**
 * 
 * @param {String} file 
 * @param {{callback: (exists: boolean) => void}} options 
 */
export function exists (file, {...options}) {
    (async () => {
        const exists = GLib.file_test (file, GLib.FileTest.EXISTS);
        if (options.callback) { options.callback (exists); }
    }) ().catch (e => {
        console.error ('failed to check file exists', e);
        options.callback (false);
    });
}

/**
 * 
 * @param {String} file1 
 * @param {String} file2 
 * @param {{callback?: (err: Error|null) => void, progress?: ((progress: number) => void)|null}} options
 */
export function rename (file1, file2, {...options}) {
    (async () => {
        const file = Gio.File.new_for_path (file1);
        const result = file.move (Gio.File.new_for_path (file2), Gio.FileCopyFlags.OVERWRITE, null, options.progress ?? null) ? null : new Error (`rename(): Failed to rename file ${file1} to ${file2}`);
        if (options.callback) { options.callback (result); }
    }) ();
}

/**
 * 
 * @param {String} file 
 * @param {{callback?: ((err: Error|null) => void)|null}} options
 */
export function unlink (file, {...options}) {
    (async () => {
        const result = GLib.unlink (file);
        if (options.callback) { options.callback (result == 0 ? null : new Error (`Failed to unlink file ${file}`)); }
    }) ();
}

/**
 * 
 * @param {String} file 
 * @param {String} data
 * @param {{callback?: (err: Error|null) => void}} options 
 */
export function appendFile (file, data, {...options}) {
    console.log('appendFile()', file, data);
    const f = Gio.File.new_for_path (file);
    f.append_to_async (Gio.FileCreateFlags.PRIVATE, GLib.PRIORITY_DEFAULT, null, (source_object, res) => {
        const ostream = source_object.append_to (Gio.FileCreateFlags.PRIVATE, null);
        ostream.write (new TextEncoder ().encode (data), null);
        if (options.callback) options.callback (null);
    });
}

export default {
    rename,
    unlink,
    writeFile,
    readFile,
    exists,
    appendFile
}