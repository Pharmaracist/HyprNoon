const gi = imports.gi;
const GLib = gi.GLib;
const Gio = gi.Gio;
const File = Gio.File;
const System = imports.system;
const TIME = Date.now();
import cgjs from './../cgjs/cg.js';
import os from './../os/index.js';
import fs from './../fs/index.js';
import EventEmitter from './../EventMitter/index.js';

const lazy = (key, value) =>
  Object.defineProperty(process, key, {
    enumerable: true,
    value: value
  })[key];

  const process = Object.defineProperties(
    new EventEmitter,
    Object.getOwnPropertyDescriptors({
      // lazy own properties
      get arch() {
        return lazy('arch', os.arch());
      },
      get argv() {
        const arr = [cgjs.PROGRAM_EXE];
        ARGV.forEach(arg => {
          if (arg[0] !== '-') {
            arr.push(
              fs.existsSync(arg) ?
                File.new_for_path(arg).get_path() :
                arg
            );
          } else {
            arr.push(arg);
          }
        });
        return lazy('argv', arr);
      },
      get argv0() {
        return lazy('argv0', File.new_for_path(cgjs.PROGRAM_EXE).get_basename());
      },
      get env() {
        return lazy('env', GLib.listenv().reduce(
          (env, key) => {
            env[key] = GLib.getenv(key);
            return env;
          },
          {}
        ));
      },
      get pid() {
        return lazy('pid', new Gio.Credentials().get_unix_pid());
      },
      get platform() {
        return lazy('platform', os.platform());
      },
      get title() {
        return lazy('title', GLib.get_prgname());
      },
      // methods
      abort() {
        // no
      },
      cwd() {
        return GLib.get_current_dir();
      },
      exit(status) {
        // no
      },
      nextTick(callback) {
        //setImmediate.apply(null, callback);
        setTimeout (callback, 0);
      },
      uptime() {
        return (Date.now() - TIME) / 1000;
      }
    })
);

export default process;