import Service from 'resource:///com/github/Aylur/ags/service.js';
import Mpris from 'resource:///com/github/Aylur/ags/service/mpris.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import GLib from 'gi://GLib';

class LocalMediaService extends Service {
    static {
        Service.register(this, {
            'changed': [],
            'position': ['float'],
            'player-name': ['string'],
            'title': ['string'],
            'artist': ['string'],
            'art-url': ['string'],
        });
    }

    #player = null;
    #lastPlayerName = '';
    #lastTitle = '';
    #mpvSocket = null;

    constructor() {
        super();
        this._setupMPV();
        this._setupPlayerTracking();
        Mpris.connect('changed', () => this._onPlayerChanged());
    }

    async _setupMPV() {
        try {
            // Create MPV config directory if it doesn't exist
            const mpvDir = GLib.build_filenamev([GLib.get_home_dir(), '.config', 'mpv']);
            if (!GLib.file_test(mpvDir, GLib.FileTest.EXISTS)) {
                GLib.mkdir_with_parents(mpvDir, 0o755);
            }

            // Create music directory if it doesn't exist
            const musicDir = GLib.build_filenamev([GLib.get_home_dir(), 'Music']);
            if (!GLib.file_test(musicDir, GLib.FileTest.EXISTS)) {
                GLib.mkdir_with_parents(musicDir, 0o755);
            }

            // Set up MPV socket
            this.#mpvSocket = GLib.build_filenamev([GLib.get_tmp_dir(), 'mpv-socket']);
        } catch (error) {
            console.error('Error setting up MPV:', error);
        }
    }

    _setupPlayerTracking() {
        try {
            // Prefer MPV over other players
            this.#player = Mpris.getPlayer('mpv') || Mpris.getPlayer();
            if (this.#player) {
                this.#lastPlayerName = this.#player.identity;
                this.#lastTitle = this.#player.trackTitle;
                this.emit('changed');
            }
        } catch (error) {
            console.error('Error setting up player tracking:', error);
        }
    }

    _onPlayerChanged() {
        try {
            // Prefer MPV over other players
            const newPlayer = Mpris.getPlayer('mpv') || Mpris.getPlayer();
            const newTitle = newPlayer?.trackTitle;
            
            if (newPlayer !== this.#player || newTitle !== this.#lastTitle) {
                this.#player = newPlayer;
                this.#lastTitle = newTitle;
                this.emit('changed');
            }
        } catch (error) {
            console.error('Error on player change:', error);
        }
    }

    get player() {
        return this.#player;
    }

    get title() {
        return this.#player?.trackTitle || '';
    }

    get artist() {
        return this.#player?.trackArtists?.join(', ') || '';
    }

    async play(uri) {
        try {
            if (uri) {
                await Utils.execAsync(['mpv', '--input-ipc-server=' + this.#mpvSocket, uri]);
            } else {
                await Utils.execAsync(['echo', '{"command": ["set_property", "pause", false]}', '|', 'socat', '-', 'UNIX-CONNECT:' + this.#mpvSocket]);
            }
        } catch (error) {
            console.error('Error playing media:', error);
        }
    }

    async pause() {
        try {
            await Utils.execAsync(['echo', '{"command": ["set_property", "pause", true]}', '|', 'socat', '-', 'UNIX-CONNECT:' + this.#mpvSocket]);
        } catch (error) {
            console.error('Error pausing media:', error);
        }
    }

    async next() {
        try {
            await Utils.execAsync(['echo', '{"command": ["playlist-next"]}', '|', 'socat', '-', 'UNIX-CONNECT:' + this.#mpvSocket]);
        } catch (error) {
            console.error('Error skipping to next:', error);
        }
    }

    async previous() {
        try {
            await Utils.execAsync(['echo', '{"command": ["playlist-prev"]}', '|', 'socat', '-', 'UNIX-CONNECT:' + this.#mpvSocket]);
        } catch (error) {
            console.error('Error going to previous:', error);
        }
    }
}

export default new LocalMediaService();
