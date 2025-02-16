#!/usr/bin/gjs

imports.gi.versions.Gtk = '4.0';
imports.gi.versions.Adw = '1';
imports.gi.versions.Gdk = '4.0';

const { Gtk, Adw, GLib, Gio, Gdk } = imports.gi;
const ByteArray = imports.byteArray;

Gtk.init();
const app = new Adw.Application({
    application_id: 'com.github.yt-downloader'
});

const TRANSLATIONS = {
    'en': {
        window_title: 'YouTube Downloader',
        url_placeholder: 'YouTube video URL',
        format_audio: 'Audio MP3',
        format_audio_best: 'Audio Best Quality',
        format_video_480: 'Video 480p',
        format_video_720: 'Video 720p',
        format_video_1080: 'Video 1080p',
        format_video_best: 'Video Best Quality',
        download_button: 'Download',
        show_logs: 'Show logs',
        hide_logs: 'Hide logs',
        help_button: 'Help',
        deps_title: 'Required Dependencies',
        deps_text: 'Required packages:',
        copied: 'Copied!',
        close: 'Close',
        error_no_url: 'Error: URL not specified',
        error_no_deps: 'Error: missing required dependencies',
        error_install_deps: 'Install yt-dlp and ffmpeg using your package manager',
        error_file_not_found: 'Error: file not found after download',
        error_output: 'Output reading error:',
        error_stderr: 'stderr reading error:',
        error_launch: 'Launch error:',
        download_complete: 'Download completed successfully!',
        file_saved: 'File saved:',
        done: 'Done!',
        choose_folder: 'Choose folder',
        default_folder: 'Default folder',
        cancel: 'Cancel',
        select: 'Select',
        notify_title: 'Download Complete',
        notify_audio: 'Audio file saved to:',
        notify_video: 'Video file saved to:'
    },
    'ru': {
        window_title: 'YouTube Загрузчик',
        url_placeholder: 'Ссылка на YouTube видео',
        format_audio: 'Аудио MP3',
        format_audio_best: 'Аудио Лучшее Качество',
        format_video_480: 'Видео 480p',
        format_video_720: 'Видео 720p',
        format_video_1080: 'Видео 1080p',
        format_video_best: 'Видео Лучшее Качество',
        download_button: 'Скачать',
        show_logs: 'Показать логи',
        hide_logs: 'Скрыть логи',
        help_button: 'Помощь',
        deps_title: 'Требуемые зависимости',
        deps_text: 'Требуемые пакеты:',
        copied: 'Скопировано!',
        close: 'Закрыть',
        error_no_url: 'Ошибка: URL не указан',
        error_no_deps: 'Ошибка: отсутствуют необходимые зависимости',
        error_install_deps: 'Установите yt-dlp и ffmpeg через ваш пакетный менеджер',
        error_file_not_found: 'Ошибка: файл не найден после загрузки',
        error_output: 'Ошибка чтения вывода:',
        error_stderr: 'Ошибка чтения stderr:',
        error_launch: 'Ошибка запуска:',
        download_complete: 'Загрузка завершена успешно!',
        file_saved: 'Файл сохранен:',
        done: 'Готово!',
        choose_folder: 'Выбрать папку',
        default_folder: 'Папка по умолчанию',
        cancel: 'Отмена',
        select: 'Выбрать',
        notify_title: 'Загрузка завершена',
        notify_audio: 'Аудио файл сохранен в:',
        notify_video: 'Видео файл сохранен в:'
    }
};

function getSystemLanguage() {
    const lang = GLib.getenv('LANG') || 'en_US.UTF-8';
    const langCode = lang.split('_')[0];
    return langCode === 'ru' ? 'ru' : 'en';
}

const currentLang = getSystemLanguage();
const _ = (key) => TRANSLATIONS[currentLang][key];

function checkDependencies() {
    const deps = ['yt-dlp', 'ffmpeg'];
    const missing = deps.filter(dep => !GLib.find_program_in_path(dep));
    
    if (missing.length > 0) {
        log(`Отсутствуют зависимости: ${missing.join(', ')}`);
        return false;
    }
    return true;
}

function createWindow() {
    const window = new Adw.ApplicationWindow({
        application: app,
        title: _('window_title'),
        default_width: 600,
        default_height: 200,
        resizable: false
    });

    const headerBar = new Adw.HeaderBar();
    const helpButton = new Gtk.Button({
        icon_name: 'question-round-symbolic',
        tooltip_text: _('help_button'),
        css_classes: ['flat']
    });

    helpButton.connect('clicked', () => {
        const command = 'yt-dlp ffmpeg';
        
        const copyButton = new Gtk.Button({
            label: command,
            css_classes: ['monospace'],
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 10,
            margin_end: 10,
            halign: Gtk.Align.CENTER
        });

        let dialog = null;

        copyButton.connect('clicked', () => {
            const clipboard = Gdk.Display.get_default().get_clipboard();
            clipboard.set(command);
            copyButton.label = _('copied');
            copyButton.add_css_class('success');
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
                if (dialog && !dialog.is_destroyed()) {
                    copyButton.label = command;
                    copyButton.remove_css_class('success');
                }
                return GLib.SOURCE_REMOVE;
            });
        });

        dialog = new Adw.MessageDialog({
            heading: _('deps_title'),
            body: _('deps_text'),
            extra_child: copyButton,
            close_response: 'close',
            modal: true,
            transient_for: window
        });

        dialog.connect('response', () => {
            if (copyButton) {
                copyButton.unparent();
            }
            dialog.destroy();
            dialog = null;
        });

        dialog.add_response('close', _('close'));
        dialog.present();
    });

    headerBar.pack_end(helpButton);

    const mainBox = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL,
        spacing: 12,
        margin_top: 15,
        margin_bottom: 15,
        margin_start: 15,
        margin_end: 15
    });

    const inputBox = new Gtk.Box({
        spacing: 8,
        homogeneous: false
    });

    let downloadDir = GLib.get_home_dir() + '/Music';

    const folderBox = new Gtk.Box({
        spacing: 8,
        homogeneous: false,
        margin_bottom: 8
    });

    const folderEntry = new Gtk.Entry({
        text: downloadDir,
        hexpand: true
    });

    const folderButton = new Gtk.Button({
        label: _('choose_folder'),
        css_classes: ['flat']
    });

    folderButton.connect('clicked', () => {
        const dialog = new Gtk.FileChooserNative({
            title: _('choose_folder'),
            action: Gtk.FileChooserAction.SELECT_FOLDER,
            modal: true,
            transient_for: window
        });

        dialog.set_current_folder(Gio.File.new_for_path(downloadDir));

        dialog.connect('response', (dialog, response) => {
            if (response === Gtk.ResponseType.ACCEPT) {
                downloadDir = dialog.get_file().get_path();
                folderEntry.text = downloadDir;
            }
        });

        dialog.show();
    });

    folderEntry.connect('changed', () => {
        downloadDir = folderEntry.text;
    });

    folderBox.append(folderEntry);
    folderBox.append(folderButton);

    const urlEntry = new Gtk.Entry({
        placeholder_text: _('url_placeholder'),
        hexpand: true
    });

    const formatCombo = new Gtk.ComboBoxText({
        width_request: 160
    });
    formatCombo.append('audio', _('format_audio'));
    formatCombo.append('audio_best', _('format_audio_best'));
    formatCombo.append('video_480', _('format_video_480'));
    formatCombo.append('video_720', _('format_video_720'));
    formatCombo.append('video_1080', _('format_video_1080'));
    formatCombo.append('video_best', _('format_video_best'));
    formatCombo.set_active_id('audio');

    inputBox.append(urlEntry);
    inputBox.append(formatCombo);

    let originalHeight = 200;
    let isLogsVisible = false;

    const showLogsButton = new Gtk.Button({
        label: _('show_logs'),
        visible: false,
        margin_top: 8
    });

    const progressBar = new Gtk.ProgressBar({
        visible: false,
        show_text: true,
        text: '',
        margin_top: 8
    });

    const logsRevealer = new Gtk.Revealer({
        transition_type: Gtk.RevealerTransitionType.SLIDE_DOWN,
        reveal_child: false,
        transition_duration: 250
    });

    const scrolledWindow = new Gtk.ScrolledWindow({
        vexpand: true,
        margin_top: 8,
        min_content_height: 200,
        max_content_height: 200
    });
    
    const logView = new Gtk.TextView({
        editable: false,
        cursor_visible: false,
        wrap_mode: Gtk.WrapMode.WORD_CHAR,
        top_margin: 8,
        bottom_margin: 8,
        left_margin: 8,
        right_margin: 8
    });

    scrolledWindow.set_child(logView);
    logsRevealer.set_child(scrolledWindow);
    const logBuffer = logView.get_buffer();

    function appendLog(text) {
        const [start, end] = logBuffer.get_bounds();
        logBuffer.insert(end, text + '\n', -1);
        logView.scroll_to_mark(logBuffer.get_insert(), 0, true, 0, 1);
    }

    showLogsButton.connect('clicked', () => {
        isLogsVisible = !isLogsVisible;
        if (isLogsVisible) {
            window.resizable = true;
            window.default_height = originalHeight + 250;
        } else {
            window.default_height = originalHeight;
            GLib.timeout_add(GLib.PRIORITY_DEFAULT, 300, () => {
                window.resizable = false;
                return false;
            });
        }
        logsRevealer.reveal_child = isLogsVisible;
        showLogsButton.label = isLogsVisible ? _('hide_logs') : _('show_logs');
    });

    const downloadButton = new Gtk.Button({
        label: _('download_button'),
        css_classes: ['suggested-action'],
        margin_top: 8
    });

    let currentProcess = null;
    let currentStdoutStream = null;
    let currentStderrStream = null;

    let isClosing = false;

    window.connect('close-request', () => {
        if (isClosing) return true;
        isClosing = true;

        const cleanup = () => {
            if (currentStdoutStream) {
                try {
                    currentStdoutStream.close(null);
                } catch (e) {}
                currentStdoutStream = null;
            }
            if (currentStderrStream) {
                try {
                    currentStderrStream.close(null);
                } catch (e) {}
                currentStderrStream = null;
            }
            if (currentProcess) {
                try {
                    currentProcess.force_exit();
                } catch (e) {}
                currentProcess = null;
            }
        };

        cleanup();

        GLib.timeout_add(GLib.PRIORITY_DEFAULT, 0, () => {
            try {
                window.destroy();
            } catch (e) {}
            app.quit();
            return GLib.SOURCE_REMOVE;
        });

        return true;
    });

    function showNotification(isAudio, filePath) {
        const title = _('notify_title');
        const body = `${isAudio ? _('notify_audio') : _('notify_video')} ${downloadDir}`;
        const icon = isAudio ? 'audio-x-generic' : 'video-x-generic';
        
        const command = ['notify-send', 
            title,
            body,
            '-i', icon,
            '-u', 'normal'
        ].map(arg => GLib.shell_quote(arg)).join(' ');
        
        try {
            GLib.spawn_command_line_async(command);
        } catch (error) {
            log(`Notification error: ${error.message}`);
        }
    }

    function checkDownloadedFile() {
        const files = Gio.File.new_for_path(downloadDir)
            .enumerate_children('standard::*', Gio.FileQueryInfoFlags.NONE, null);
        
        let latestFile = null;
        let latestTime = 0;
        
        let fileInfo;
        while ((fileInfo = files.next_file(null)) !== null) {
            const fileName = fileInfo.get_name();
            const filePath = GLib.build_filenamev([downloadDir, fileName]);
            
            if (fileName.endsWith('.mp3') || fileName.endsWith('.mp4') || fileName.endsWith('.webm')) {
                const modifiedTime = Gio.File.new_for_path(filePath).query_info(
                    'time::modified', Gio.FileQueryInfoFlags.NONE, null
                ).get_modification_time().tv_sec;
                
                if (modifiedTime > latestTime) {
                    latestTime = modifiedTime;
                    latestFile = filePath;
                }
            }
        }
        
        if (latestFile) {
            const currentTime = GLib.get_real_time() / 1000000;
            if (currentTime - latestTime < 30) {
                return latestFile;
            }
        }
        return null;
    }

    downloadButton.connect('clicked', () => {
        const url = urlEntry.get_text();
        const format = formatCombo.get_active_id();
        
        if (!url) {
            appendLog(_('error_no_url'));
            return;
        }

        downloadButton.sensitive = false;
        progressBar.visible = true;
        showLogsButton.visible = true;
        progressBar.set_fraction(0);
        logBuffer.set_text('', 0);

        GLib.mkdir_with_parents(downloadDir, 0o755);

        function sanitizeFilename(template) {
            return `${downloadDir}/%(title).50s-%(id)s.%(ext)s`;
        }

        let command;
        if (format === 'audio') {
            command = [
                'yt-dlp',
                '--progress',
                '--newline',
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '192K',
                '--no-playlist',
                '--embed-thumbnail',
                '--add-metadata',
                '--format', 'bestaudio',
                '--restrict-filenames',
                '-o', sanitizeFilename('%(title)s'),
                '--no-warnings',
                url
            ];
        } else if (format === 'audio_best') {
            command = [
                'yt-dlp',
                '--progress',
                '--newline',
                '--extract-audio',
                '--audio-format', 'mp3',
                '--audio-quality', '0',
                '--no-playlist',
                '--embed-thumbnail',
                '--add-metadata',
                '--format', 'bestaudio',
                '--restrict-filenames',
                '-o', sanitizeFilename('%(title)s'),
                '--no-warnings',
                url
            ];
        } else if (format === 'video_480') {
            command = [
                'yt-dlp',
                '--progress',
                '--newline',
                '--no-playlist',
                '--format', 'bestvideo[height<=480][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '--merge-output-format', 'mp4',
                '--add-metadata',
                '--restrict-filenames',
                '-o', sanitizeFilename('%(title)s'),
                '--no-warnings',
                url
            ];
        } else if (format === 'video_720') {
            command = [
                'yt-dlp',
                '--progress',
                '--newline',
                '--no-playlist',
                '--format', 'bestvideo[height<=720][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '--merge-output-format', 'mp4',
                '--add-metadata',
                '--restrict-filenames',
                '-o', sanitizeFilename('%(title)s'),
                '--no-warnings',
                url
            ];
        } else if (format === 'video_1080') {
            command = [
                'yt-dlp',
                '--progress',
                '--newline',
                '--no-playlist',
                '--format', 'bestvideo[height<=1080][ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '--merge-output-format', 'mp4',
                '--add-metadata',
                '--restrict-filenames',
                '-o', sanitizeFilename('%(title)s'),
                '--no-warnings',
                url
            ];
        } else if (format === 'video_best') {
            command = [
                'yt-dlp',
                '--progress',
                '--newline',
                '--no-playlist',
                '--format', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
                '--merge-output-format', 'mp4',
                '--add-metadata',
                '--restrict-filenames',
                '-o', sanitizeFilename('%(title)s'),
                '--no-warnings',
                url
            ];
        }

        try {
            const launcher = new Gio.SubprocessLauncher({
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            });
            
            currentProcess = launcher.spawnv(command);
            const stdout = currentProcess.get_stdout_pipe();
            const stderr = currentProcess.get_stderr_pipe();
            currentStdoutStream = new Gio.DataInputStream({
                base_stream: stdout
            });
            currentStderrStream = new Gio.DataInputStream({
                base_stream: stderr
            });

            function readOutput() {
                currentStdoutStream.read_line_async(GLib.PRIORITY_DEFAULT, null, (stream, result) => {
                    try {
                        const [line, length] = stream.read_line_finish(result);
                        if (line) {
                            const text = ByteArray.toString(line);
                            
                            if (text.includes('[download]')) {
                                const match = text.match(/(\d+\.?\d*)%/);
                                if (match) {
                                    const progress = parseFloat(match[1]) / 100;
                                    progressBar.set_fraction(progress);
                                    progressBar.set_text(`${(progress * 100).toFixed(1)}%`);
                                }
                            }
                            
                            appendLog(text);
                            readOutput();
                        }
                    } catch (e) {
                        appendLog(`Ошибка чтения вывода: ${e.message}`);
                    }
                });
            }

            function readError() {
                currentStderrStream.read_line_async(GLib.PRIORITY_DEFAULT, null, (stream, result) => {
                    try {
                        const [line, length] = stream.read_line_finish(result);
                        if (line) {
                            const text = ByteArray.toString(line);
                            appendLog(`ERROR: ${text}`);
                            readError();
                        }
                    } catch (e) {
                        appendLog(`Ошибка чтения stderr: ${e.message}`);
                    }
                });
            }

            readOutput();
            readError();

            currentProcess.wait_async(null, (proc, result) => {
                try {
                    proc.wait_finish(result);
                    if (!isClosing) {
                        if (currentStdoutStream) {
                            try {
                                currentStdoutStream.close(null);
                            } catch (e) {}
                            currentStdoutStream = null;
                        }
                        if (currentStderrStream) {
                            try {
                                currentStderrStream.close(null);
                            } catch (e) {}
                            currentStderrStream = null;
                        }
                        currentProcess = null;

                        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                            const downloadedFile = checkDownloadedFile();
                            if (downloadedFile) {
                                downloadButton.sensitive = true;
                                progressBar.set_fraction(1.0);
                                progressBar.set_text(_('done'));
                                appendLog(`${_('download_complete')}\n${_('file_saved')} ${downloadedFile}`);
                                
                                const isAudio = format === 'audio' || format === 'audio_best';
                                showNotification(isAudio, downloadedFile);
                                
                                GLib.spawn_command_line_async(`xdg-open "${downloadDir}"`);
                            } else {
                                downloadButton.sensitive = true;
                                appendLog(_('error_file_not_found'));
                            }
                            return GLib.SOURCE_REMOVE;
                        });
                    }
                } catch (error) {
                    if (!isClosing) {
                        GLib.idle_add(GLib.PRIORITY_DEFAULT, () => {
                            downloadButton.sensitive = true;
                            appendLog(`Ошибка: ${error.message}`);
                            return GLib.SOURCE_REMOVE;
                        });
                    }
                }
            });

        } catch (error) {
            downloadButton.sensitive = true;
            appendLog(`Ошибка запуска: ${error.message}`);
        }
    });

    mainBox.append(folderBox);
    mainBox.append(inputBox);
    mainBox.append(downloadButton);
    mainBox.append(progressBar);
    mainBox.append(showLogsButton);
    mainBox.append(logsRevealer);

    const content = new Gtk.Box({
        orientation: Gtk.Orientation.VERTICAL
    });
    content.append(headerBar);
    content.append(mainBox);

    window.set_content(content);
    window.present();
}

app.connect('activate', () => {
    if (checkDependencies()) {
        createWindow();
    } else {
        const errorDialog = new Gtk.MessageDialog({
            message_type: Gtk.MessageType.ERROR,
            buttons: Gtk.ButtonsType.OK,
            text: _('error_no_deps'),
            secondary_text: _('error_install_deps')
        });
        errorDialog.connect('response', () => {
            errorDialog.destroy();
            app.quit();
        });
        errorDialog.show();
    }
});

app.connect('shutdown', () => {
});

app.run([]); 