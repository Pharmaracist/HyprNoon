import system from './src/system.js';
import cgjs from './../cgjs/cg.js';
import _c from './src/constants.js';

const GLib = imports.gi.GLib;
export const EOL = cgjs.PATH_SEPARATOR === '/' ? '\n' : '\r\n';

const UNAME_ALL = system('uname -a');

export const constants = _c;

export const arch = () => {
  switch (true) {
    case /\bx86_64\b/.test(UNAME_ALL): return 'x64';
    case /\bi686\b/.test(UNAME_ALL): return 'ia32';
    default: return 'arm';
  }
};

export const platform = () => {
  switch (true) {
    case /\bDarwin\b/i.test(UNAME_ALL): return 'darwin';
    case /\bLinux\b/i.test(UNAME_ALL): return 'linux';
    default: return 'win32';
  }
};

export const homedir = () => GLib.get_home_dir();

export const hostname = () => GLib.get_host_name();

export const release = () => system('uname -r');

export const tmpdir = () => GLib.get_tmp_dir();

export const type = () => system('uname');

export const userInfo = () => ({
  uid: 1000,
  gid: 100,
  username: GLib.get_user_name(),
  homedir: GLib.get_home_dir()
});

export default {
  arch,
  constants,
  platform,
  homedir,
  hostname,
  release,
  tmpdir,
  type,
  userInfo,
  UNAME_ALL,
  EOL
}
