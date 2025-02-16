import GLib from 'gi://GLib';
/**
 * 
 * @param {number} n 
 * @returns {Uint8Array}
 */
function randomBytes (n) {
    const arr = new Uint8Array (n);
    for (let i = 0; i < arr.length; i++) {
        arr[i] = GLib.random_int_range (0, 255);
    }
    return arr;
}

export default {
    randomBytes
};