/*! ISC License
  *
  * Copyright (c) 2017-2018, Andrea Giammarchi, @WebReflection
  *
  * Permission to use, copy, modify, and/or distribute this software for any
  * purpose with or without fee is hereby granted, provided that the above
  * copyright notice and this permission notice appear in all copies.
  *
  * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
  * REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
  * AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
  * INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
  * LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE
  * OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
  * PERFORMANCE OF THIS SOFTWARE.
  */

import GLib from 'gi://GLib';
import Gio from 'gi://Gio';

const File = Gio.File;
const CURRENT_DIR = GLib.get_current_dir();
const PROGRAM_EXE = File.new_for_path(CURRENT_DIR)
                        .resolve_relative_path(imports.system.programInvocationName);

export default {
  // modules that are provided by cgjs (fs, path, ...)
  CORE_MODULES: Object.create(null),
  // enable some debugging flag
  DEBUG: ARGV.some(arg => arg === '--debug'),
  // the directory separator
  PATH_SEPARATOR: /^\//.test(CURRENT_DIR) ? '/' : '\\',
  // frequency to check for running timers (interval, immediate, timeouts)
  IDLE: ARGV.some(arg => /^--idle=(\d+)/.test(arg)) ? (+RegExp.$1 || 1) : 33,
  // the folder that contains cgjs related files
  // the current executing program
  PROGRAM_EXE: PROGRAM_EXE.get_path()
}