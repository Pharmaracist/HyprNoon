const GLib = imports.gi.GLib;
const trim = ''.trim;
export default o_O => {
    const str = new TextDecoder ().decode (GLib.spawn_command_line_sync(o_O)[1]);
    const a = trim.call(str);
    return a;
};
