/*

  ┌─────────────┐
  │   Missing   │
  └─────────────┘
  toNamespacedPath
  posix
  win32

 */


const GLib = imports.gi.GLib;
const File = imports.gi.Gio.File;
import cgjs from './../cgjs/cg.js';

const basename = (path, ext = '') => GLib.path_get_basename(path).replace(ext, '');

const delimiter = cgjs.PATH_SEPARATOR === '/' ? ':' : ';';

const dirname = path => GLib.path_get_dirname(path);

const extname = path => {
  const base = GLib.path_get_basename(path);
  const i = base.lastIndexOf('.');
  return i <= 0 ? '' : base.slice(i);
};

const format = path => join(
  path.dir || path.root,
  path.base || (path.name + path.ext)
);

const isAbsolute = path => GLib.path_is_absolute(path);

const join = (base, ...paths) =>
  paths.reduce(
    (base, path) => base.resolve_relative_path(path),
    File.new_for_path(base)
  ).get_path();

const normalize = path => File.new_for_path(path).get_path();

const parse = path => {
  const base = GLib.path_get_basename(path);
  const ext = extname(base);
  return {
    root: isAbsolute(path) ?
      path.slice(0, path.indexOf(cgjs.PATH_SEPARATOR) + cgjs.PATH_SEPARATOR.length) :
      '',
    dir: dirname(path),
    base,
    ext,
    name: ext.length ? base.slice(0, -ext.length) : base
  };
};

const relative = (from, to) => {
  const sfrom = normalize(from)?.split(cgjs.PATH_SEPARATOR);
  const sto = normalize(to)?.split(cgjs.PATH_SEPARATOR);
  if (sfrom === undefined || sto === undefined) {
    throw new Error ('some params are undefined');
  }
  const length = sfrom.length;
  const out = [];
  let i = 0;
  while (i < length && sfrom[i] === sto[i]) i++;
  sto.splice(0, i);
  while (i++ < length) out.push('..');
  return out.concat(sto).join(cgjs.PATH_SEPARATOR);
};

const resolve = (...paths) => {
  const resolved = paths.length ? join(...paths) : '';
  return resolved || GLib.get_current_dir();
};

const sep = cgjs.PATH_SEPARATOR;

export default {
  sep,
  basename,
  delimiter,
  relative,
  resolve,
  parse,
  format,
  extname,
  dirname,
  normalize,
  join,
  isAbsolute
}