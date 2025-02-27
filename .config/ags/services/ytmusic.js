import Service from 'resource:///com/github/Aylur/ags/service.js';
import GLib from 'gi://GLib';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import Gio from 'gi://Gio';
import Mpris from 'resource:///com/github/Aylur/ags/service/mpris.js';
import App from 'resource:///com/github/Aylur/ags/app.js';
import YTMusicAPI from './ytmusic_api.js';

// Audio quality formats
const AUDIO_FORMATS = {
    'low': 'worstaudio/bestaudio[abr<=64]',
    'medium': 'bestaudio[abr<=128]/bestaudio',
    'high': 'bestaudio',
    'best': 'bestaudio'
};

// Default options
const DEFAULT_OPTIONS = {
    audioQuality: 'best',
    queueSize: 10,
    cacheTimeout: 90,
    cacheDir: GLib.build_filenamev([GLib.get_user_cache_dir(), 'ytmusic']),
    maxCacheSize: 10240 * 10240 * 10240, // 1GB
    maxMemoryCacheSize: 50,  // Maximum number of cached URLs
    preloadEnabled: true,    // Enable/disable preloading
    aggressiveCaching: true  // Cache more aggressively
};

class YouTubeMusicService extends Service {
    static {
        Service.register(this, {
            'current-track': ['jsobject'],
            'playing': ['boolean'],
            'position': ['float'],
            'duration': ['float'],
            'volume': ['float'],
            'repeat': ['boolean'],
            'shuffle': ['boolean'],
            'search-results': ['jsobject'],
            'loading': ['boolean'],
            'caching-status': ['jsobject'],
            'show-downloaded': ['boolean'],
            'downloaded-tracks': ['jsobject'],
        }, {
            'current-track': ['jsobject', 'rw'],
            'playing': ['boolean', 'rw'],
            'position': ['float', 'rw'],
            'duration': ['float', 'rw'],
            'volume': ['float', 'rw'],
            'repeat': ['boolean', 'rw'],
            'shuffle': ['boolean', 'rw'],
            'search-results': ['jsobject', 'rw'],
            'loading': ['boolean', 'rw'],
            'caching-status': ['jsobject', 'rw'],
            'show-downloaded': ['boolean', 'rw'],
            'downloaded-tracks': ['jsobject', 'rw'],
        });
    }

    _searchResults = [];
    _currentTrack = null;
    _volume = 1.0;
    _playing = false;
    _repeat = false;
    _shuffle = false;
    _position = 0;
    _duration = 0;
    _loading = false;
    _cachingStatus = new Map();
    _showDownloaded = false;
    _downloadedTracks = [];
    _mprisPlayer = null;
    _options = { ...DEFAULT_OPTIONS };
    _audioUrlCache = new Map();
    _audioUrlCacheOrder = [];
    _trackInfoCache = new Map();
    _trackInfoCacheOrder = [];
    _preloadQueue = new Set();
    _maxPreloadItems = 3;
    _cacheTimeout = 30 * 60 * 1000;
    _currentVideoId = null;
    _playlist = [];
    _currentIndex = -1;
    _stateFile = GLib.build_filenamev([App.configDir, 'state', 'ytmusic-state.json']);
    _updateInterval = null;
    _lastOnlineResults = [];
    _currentSearchQuery = '';
    _lastDownloadedResults = [];
    _defaultContent = [];
    _cache = new Map();

    constructor() {
        super();
        
        // Initialize with default values
        this._currentTrack = null;
        this._volume = 1.0;
        this._playing = false;
        this._repeat = false;
        this._shuffle = false;
        this._position = 0;
        this._duration = 0;
        this._loading = false;
        this._cachingStatus = new Map();
        this._showDownloaded = false;
        this._downloadedTracks = [];
        this._mprisPlayer = null;
        this._options = { ...DEFAULT_OPTIONS };
        this._audioUrlCache = new Map();
        this._audioUrlCacheOrder = [];
        this._trackInfoCache = new Map();
        this._trackInfoCacheOrder = [];
        this._preloadQueue = new Set();
        this._maxPreloadItems = 3;
        this._cacheTimeout = 30 * 60 * 1000;
        this._currentVideoId = null;
        this._playlist = [];
        this._currentIndex = -1;
        this._stateFile = GLib.build_filenamev([App.configDir, 'state', 'ytmusic-state.json']);
        this._updateInterval = null;
        this._lastOnlineResults = [];
        this._currentSearchQuery = '';
        this._lastDownloadedResults = [];
        this._defaultContent = [];
        this._cache = new Map();

        // Initialize MPRIS
        this._setupMprisHandlers();
        
        // Load saved state
        this._loadState();
        
        // Start update interval
        this._updateInterval = GLib.timeout_add(GLib.PRIORITY_DEFAULT, 1000, () => {
            this._updatePlayingState();
            return GLib.SOURCE_CONTINUE;
        });
    }

    _initOptions() {
        // Initialize with defaults
        this._options = { ...DEFAULT_OPTIONS };
        
        // Try to load options from config file
        try {
            const configFile = GLib.build_filenamev([App.configDir, 'ytmusic-config.json']);
            if (GLib.file_test(configFile, GLib.FileTest.EXISTS)) {
                const [ok, contents] = GLib.file_get_contents(configFile);
                if (ok) {
                    const savedOptions = JSON.parse(new TextDecoder().decode(contents));
                    this._options = { ...DEFAULT_OPTIONS, ...savedOptions };
                }
            }
        } catch (error) {
            // Removed console logging
        }
    }

    _getOption(key) {
        return this._options[key];
    }

    // Property getters and setters
    get searchResults() { return this._searchResults; }
    set searchResults(value) {
        this._searchResults = value;
        this.notify('search-results');
    }

    get currentTrack() { return this._currentTrack; }
    set currentTrack(value) {
        this._currentTrack = value;
        this.notify('current-track');
    }

    get playing() {
        const player = this._findMprisPlayer();
        return player?.playbackStatus === 'Playing' || false;
    }

    set playing(value) {
        if (this._playing === value) return;
        this._playing = value;
        this.notify('playing');
    }

    get repeat() { return this._repeat; }
    set repeat(value) {
        this._repeat = value;
        this.notify('repeat');
    }

    get shuffle() { return this._shuffle; }
    set shuffle(value) {
        this._shuffle = value;
        this.notify('shuffle');
    }

    get volume() { return this._volume; }
    set volume(value) {
        this._volume = value;
        this.notify('volume');
    }

    get position() { return this._position; }
    set position(value) {
        this._position = value;
        this.notify('position');
    }

    get duration() { return this._duration; }
    set duration(value) {
        this._duration = value;
        this.notify('duration');
    }

    get loading() { return this._loading; }
    set loading(value) {
        this._loading = value;
        this.notify('loading');
    }

    get cachingStatus() {
        const status = {};
        for (const [videoId, state] of this._cachingStatus.entries()) {
            status[videoId] = state;
        }
        return status;
    }

    get showDownloaded() { return this._showDownloaded; }

    get downloadedTracks() {
        return this._downloadedTracks.map(track => ({
            ...track,
            isDownloaded: true,
        }));
    }

    // Playback controls
    async _isOnline() {
        try {
            const result = await Utils.execAsync(['ping', '-c', '1', '-W', '1', '8.8.8.8']);
            return result !== null;
        } catch (e) {
            return false;
        }
    }

    async _getRelatedTracks(videoId) {
        try {
            const pythonScript = `
from ytmusicapi import YTMusic
import json
ytm = YTMusic()
results = ytm.get_watch_playlist('${videoId}', limit=20)
if results and 'tracks' in results:
    tracks = []
    for track in results['tracks']:
        tracks.append({
            'videoId': track['videoId'],
            'title': track['title'],
            'artists': [{'name': a['name']} for a in track.get('artists', [])],
            'duration': track.get('duration_seconds', 0),
            'thumbnail': track.get('thumbnails', [{}])[-1].get('url', '')
        })
    print(json.dumps(tracks))
`;
            const output = await Utils.execAsync(['python3', '-c', pythonScript]);
            if (!output.trim()) {
                return [];
            }
            return JSON.parse(output.trim());
        } catch (error) {
            console.error('Error getting related tracks:', error);
            return [];
        }
    }

    async play(videoId = null) {
        try {
            if (!videoId && !this._currentVideoId) return;
            
            if (videoId) {
                // Kill any existing VLC instance
                await this._killAllVlc();

                this._currentVideoId = videoId;
                this.loading = true;
                this.notify('loading');
                
                try {
                    // Get track info for the clicked song
                    const trackInfo = await this._getTrackInfo(videoId);
                    if (!trackInfo) {
                        throw new Error('Failed to get track info');
                    }

                    // Get related tracks for continuous playback
                    const relatedTracks = await this._getRelatedTracks(videoId);
                    const playlist = [
                        `https://music.youtube.com/watch?v=${videoId}`,
                        ...relatedTracks.map(track => `https://music.youtube.com/watch?v=${track.videoId}`)
                    ];

                    // Update current track to match bar's format
                    this._currentTrack = {
                        videoId,
                        trackTitle: trackInfo.title,
                        trackArtists: trackInfo.artists,
                        coverPath: trackInfo.thumbnail,
                        length: trackInfo.duration * 1000000 // Convert to microseconds for MPRIS
                    };
                    this.notify('current-track');

                    // Start playback using VLC
                    const vlcArgs = [
                        'vlc',
                        '--no-video',
                        '--intf', 'dummy',  // No interface
                        '--play-and-exit',  // Exit when done playing
                        '--extraintf', 'mpris2', // Enable MPRIS2 interface
                        ...playlist
                    ];

                    const vlcProcess = await Utils.execAsync(vlcArgs, {
                        spawn: true,
                    });

                    if (!vlcProcess) {
                        throw new Error('Failed to start VLC');
                    }

                    this.playing = true;
                    this.notify('playing');

                    // Show notification
                    this._showNotification('Now Playing', trackInfo.title);
                } catch (error) {
                    console.error('Error during playback:', error);
                    this._showNotification('Playback Error', error.toString());
                    throw error;
                } finally {
                    this.loading = false;
                    this.notify('loading');
                }
            } else {
                // Just toggle play/pause
                await this.togglePlay();
            }
        } catch (error) {
            console.error('Error in play:', error);
            this._showNotification('Error', error.toString());
            this.loading = false;
            this.notify('loading');
            throw error;
        }
    }

    async _killAllVlc() {
        try {
            // Only kill VLC if socket doesn't exist or isn't responding
            if (Utils.readFile('/tmp/vlcsocket')) {
                try {
                    // Try to communicate with the socket
                    await Utils.execAsync(['socat', '-', '/tmp/vlcsocket'], {
                        input: 'get_property pid\n',
                        timeout: 1000,
                    });
                    return;
                } catch (e) {
                    // Socket exists but not responding, clean up
                    await Utils.execAsync(['rm', '-f', '/tmp/vlcsocket']).catch(() => {});
                }
            }
            // Kill VLC only if no valid socket exists
            await Utils.execAsync(['pkill', 'vlc']).catch(() => {});
        } catch (error) {
            console.error('Error killing VLC:', error);
        }
    }

    async togglePlay() {
        const player = this._findMprisPlayer();
        if (player) player.playPause();
    }

    async next() {
        const player = this._findMprisPlayer();
        if (player) player.next();
    }

    async previous() {
        const player = this._findMprisPlayer();
        if (player) player.previous();
    }

    async stop() {
        try {
            if (!this._currentVideoId) return;
            
            const player = this._findMprisPlayer();
            if (player) {
                player.stop();
            }
            await Utils.execAsync(['pkill', 'vlc']).catch(() => {});
            this._playing = false;
            this._position = 0;
            this.notify('playing');
            this.notify('position');
        } catch (e) {
            console.error('Error stopping:', e);
            this._notifyError('Failed to stop');
        }
    }

    _findMprisPlayer() {
        // Look for VLC MPRIS player
        const players = Mpris.players;
        return players.find(player => player.busName.startsWith('org.mpris.MediaPlayer2.vlc'));
    }

    _setupMprisHandlers() {
        this._mprisPlayer = this._findMprisPlayer();
        if (!this._mprisPlayer) {
            return;
        }

        this._connectMprisSignals();
    }

    _connectMprisSignals() {
        if (!this._mprisPlayer) return;

        this._mprisPlayer.connect('notify::playback-status', () => {
            const newStatus = this._mprisPlayer.playbackStatus === 'Playing';
            this._playing = newStatus;
            this.notify('playing');
        });

        this._mprisPlayer.connect('notify::position', () => {
            const newPosition = this._mprisPlayer.position / 1000000; // Convert from microseconds
            if (Math.abs(this._position - newPosition) > 1.0) {
                this._position = newPosition;
                this.notify('position');
            }
        });
    }

    _updatePlayingState() {
        if (!this._currentVideoId) return;

        try {
            const player = this._findMprisPlayer();
            if (player) {
                const newStatus = player.playBackStatus === 'Playing';
                if (this._playing !== newStatus) {
                    this._playing = newStatus;
                    this.notify('playing');
                }

                const newPosition = player.position / 1000000; // Convert from microseconds
                if (Math.abs(this._position - newPosition) > 1.0) {
                    this._position = newPosition;
                    this.notify('position');
                }
            }
        } catch (e) {
            console.error('Error updating playing state:', e);
        }
    }

    async _playNextTrack() {
        if (!this._playlist || this._playlist.length === 0) return;

        let nextIndex;
        if (this._shuffle) {
            // Get random index excluding current
            const availableIndices = Array.from(
                { length: this._playlist.length },
                (_, i) => i
            ).filter(i => i !== this._currentIndex);
            
            if (availableIndices.length > 0) {
                nextIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
            } else {
                nextIndex = 0;
            }
        } else {
            nextIndex = (this._currentIndex + 1) % this._playlist.length;
        }

        // Handle repeat mode
        if (!this._repeat && nextIndex <= this._currentIndex) {
            // Stop playback if we've reached the end and repeat is off
            await this.stop();
            return;
        }

        // Play the next track
        const nextTrack = this._playlist[nextIndex];
        if (nextTrack) {
            this._currentIndex = nextIndex;
            await this.play(nextTrack.videoId);
        }
    }

    async _setMpvProperty(property, value) {
        const response = await this._sendMpvCommand(['set_property', property, value]);
        return response?.error === 'success';
    }

    // Property getters and setters
    get playlist() { return this._playlist; }
    set playlist(value) {
        this._playlist = value;
        this.notify('playlist');
    }

    // Playlist management
    addToPlaylist(track) {
        this._playlist.push(track);
        if (this._currentIndex === -1) {
            this._currentIndex = 0;
        }
        this.notify('playlist');
    }

    clearPlaylist() {
        this._playlist = [];
        this._currentIndex = -1;
        this.notify('playlist');
    }

    async _getTrackInfo(videoId) {
        try {
            const pythonScript = `
from ytmusicapi import YTMusic
import json
import sys

try:
    ytm = YTMusic()
    result = ytm.get_song(videoId='${videoId}')
    if result:
        # Extract video ID from one of several possible locations
        video_id = result.get('videoId') or result.get('videoDetails', {}).get('videoId') or '${videoId}'
        
        # Get the best quality thumbnail
        thumbnails = result.get('thumbnails', []) or result.get('videoDetails', {}).get('thumbnail', {}).get('thumbnails', [])
        thumbnail_url = thumbnails[-1].get('url') if thumbnails else ''
        
        # Get artists - handle different possible structures
        artists = result.get('artists', []) or result.get('videoDetails', {}).get('author', '').split(',')
        if isinstance(artists, list):
            artist_list = [a.get('name') if isinstance(a, dict) else str(a).strip() for a in artists]
        else:
            artist_list = [str(artists).strip()]
        
        track_info = {
            'videoId': video_id,
            'title': result.get('title') or result.get('videoDetails', {}).get('title', ''),
            'artists': artist_list,
            'duration': result.get('duration_seconds') or result.get('videoDetails', {}).get('lengthSeconds', 0),
            'thumbnail': thumbnail_url
        }
        print(json.dumps(track_info))
except Exception as e:
    print(json.dumps({'error': str(e)}))
`;
            const output = await Utils.execAsync(['python3', '-c', pythonScript]);
            if (!output.trim()) {
                throw new Error('No track info returned');
            }
            
            const result = JSON.parse(output.trim());
            if (result.error) {
                throw new Error(result.error);
            }
            
            return result;
        } catch (error) {
            console.error('Error getting track info:', error);
            throw error;
        }
    }

    async _performSearch(query) {
        try {
            const result = await YTMusicAPI.searchSongs(query);
            return result;
        } catch (error) {
            logError(error);
            return [];
        }
    }

    async search(query) {
        this._currentSearchQuery = query;

        if (!query) {
            // Show default content when no search query
            this._searchResults = this._showDownloaded ? 
                this._downloadedTracks : 
                (this._defaultContent.length > 0 ? this._defaultContent : this._lastOnlineResults);
            this.notify('search-results');
            
            // Refresh default content in the background
            if (!this._showDownloaded) {
                this._initDefaultContent().catch(logError);
            }
            return;
        }

        try {
            this.loading = true;
            this.notify('loading');
            
            const pythonScript = `
from ytmusicapi import YTMusic
import json
ytm = YTMusic()
results = ytm.search('${query}', filter='songs', limit=10)
tracks = []
for track in results:
    tracks.append({
        'videoId': track['videoId'],
        'title': track['title'],
        'artists': [{'name': a['name']} for a in track.get('artists', [])],
        'duration': track.get('duration_seconds', 0),
        'thumbnail': track.get('thumbnails', [{}])[-1].get('url', '')
    })
print(json.dumps(tracks))
`;
            const output = await Utils.execAsync(['python3', '-c', pythonScript]);
            if (!output.trim()) {
                this._searchResults = [];
            } else {
                this._searchResults = JSON.parse(output.trim());
            }
            
            this.notify('search-results');
        } catch (error) {
            console.error('Error searching:', error);
            this._searchResults = [];
            this.notify('search-results');
        } finally {
            this.loading = false;
            this.notify('loading');
        }
    }

    toggleDownloadedView() {
        this._showDownloaded = !this._showDownloaded;
        this.notify('show-downloaded');
        
        // Switch view immediately using cached results
        if (this._showDownloaded) {
            // If we have a search query, use filtered downloaded results
            if (this._currentSearchQuery) {
                this._searchResults = this._lastDownloadedResults;
            } else {
                this._searchResults = this._downloadedTracks;
            }
        } else {
            // Switch back to online results
            this._searchResults = this._lastOnlineResults;
        }
        this.notify('search-results');
        
        // Perform the search again in the background if we have a query
        if (this._currentSearchQuery) {
            this.search(this._currentSearchQuery).catch(logError);
        }
    }

    async _preloadTrack(videoId) {
        if (!videoId || this._preloadQueue.has(videoId) || !this._getOption('preloadEnabled')) return;
        
        // Limit preload queue size
        if (this._preloadQueue.size >= this._maxPreloadItems) return;
        
        this._preloadQueue.add(videoId);
        
        try {
            // Preload track info and audio URL in parallel
            await Promise.all([
                this._getTrackInfo(videoId),
                this._getAudioUrl(videoId, false)
            ]);
        } catch (e) {
            console.error('Error preloading track:', e);
        } finally {
            this._preloadQueue.delete(videoId);
        }
    }

    _updateAudioUrlCache(videoId, url) {
        // Remove oldest entry if cache is full
        if (this._audioUrlCache.size >= this._getOption('maxMemoryCacheSize')) {
            const oldest = this._audioUrlCacheOrder.shift();
            this._audioUrlCache.delete(oldest);
        }
        
        // Add new entry
        this._audioUrlCache.set(videoId, {
            data: url,
            timestamp: Date.now()
        });
        this._audioUrlCacheOrder.push(videoId);
    }

    async _getAudioUrl(videoId, shouldCache = true) {
        return `https://music.youtube.com/watch?v=${videoId}`;
    }

    async _searchSongs(query) {
        if (!query) return [];
        try {
            const pythonScript = `
from ytmusicapi import YTMusic
import json
ytm = YTMusic()
results = ytm.search('${query}', filter='songs', limit=10)
tracks = []
for track in results:
    tracks.append({
        'videoId': track['videoId'],
        'title': track['title'],
        'artists': [{'name': a['name']} for a in track.get('artists', [])],
        'duration': track.get('duration_seconds', 0),
        'thumbnail': track.get('thumbnails', [{}])[-1].get('url', '')
    })
print(json.dumps(tracks))
`;
            const output = await Utils.execAsync(['python3', '-c', pythonScript]);
            if (!output.trim()) {
                return [];
            }
            return JSON.parse(output.trim());
        } catch (error) {
            console.error('Error searching songs:', error);
            return [];
        }
    }

    async _getRadio(videoId) {
        if (!videoId) return [];
        try {
            const pythonScript = `
from ytmusicapi import YTMusic
import json
ytm = YTMusic()
results = ytm.get_watch_playlist('${videoId}', limit=10)
if results and 'tracks' in results:
    tracks = []
    for track in results['tracks']:
        tracks.append({
            'videoId': track['videoId'],
            'title': track['title'],
            'artists': [{'name': a['name']} for a in track.get('artists', [])],
            'duration': track.get('duration_seconds', 0),
            'thumbnail': track.get('thumbnails', [{}])[-1].get('url', '')
        })
    print(json.dumps(tracks))
`;
            const output = await Utils.execAsync(['python3', '-c', pythonScript]);
            if (!output.trim()) {
                return [];
            }
            return JSON.parse(output.trim());
        } catch (error) {
            console.error('Error getting radio:', error);
            return [];
        }
    }

    async _loadState() {
        try {
            if (GLib.file_test(this._stateFile, GLib.FileTest.EXISTS)) {
                const [ok, contents] = GLib.file_get_contents(this._stateFile);
                if (ok) {
                    const state = JSON.parse(new TextDecoder().decode(contents));
                    
                    // Restore state values
                    if (state.currentTrack) {
                        this._currentTrack = state.currentTrack;
                        this._currentVideoId = state.currentTrack.videoId;
                    }
                    if (state.playlist) this._playlist = state.playlist;
                    if (typeof state.volume === 'number') this._volume = state.volume;
                    if (typeof state.playing === 'boolean') this._playing = state.playing;
                    if (typeof state.repeat === 'boolean') this._repeat = state.repeat;
                    if (typeof state.shuffle === 'boolean') this._shuffle = state.shuffle;
                    if (state.searchResults) this._searchResults = state.searchResults;
                    if (typeof state.position === 'number') this._position = state.position;
                    if (typeof state.duration === 'number') this._duration = state.duration;
                    if (typeof state.loading === 'boolean') this._loading = state.loading;

                    // Restore caching status
                    if (state.cachingStatus) {
                        // Clear existing status
                        this._cachingStatus.clear();
                        
                        // For each cached song, verify it still exists in cache
                        const cacheDir = this._getOption('cacheDir');
                        Object.entries(state.cachingStatus).forEach(([videoId, status]) => {
                            if (status === 'cached') {
                                const cachedFile = GLib.build_filenamev([cacheDir, `${videoId}.mp3`]);
                                if (GLib.file_test(cachedFile, GLib.FileTest.EXISTS)) {
                                    this._cachingStatus.set(videoId, status);
                                }
                            }
                        });
                        this.notify('caching-status');
                    }
                }
            }
        } catch (error) {
            // Ignore errors during state load
        }
    }

    _saveState() {
        try {
            const state = {
                currentTrack: this._currentTrack,
                playlist: this._playlist,
                volume: this._volume,
                playing: this._playing,
                repeat: this._repeat,
                shuffle: this._shuffle,
                searchResults: this._searchResults,
                position: this._position,
                duration: this._duration,
                loading: this._loading,
                cachingStatus: Object.fromEntries(this._cachingStatus),
            };

            // Ensure state directory exists
            const stateDir = GLib.path_get_dirname(this._stateFile);
            if (!GLib.file_test(stateDir, GLib.FileTest.EXISTS)) {
                GLib.mkdir_with_parents(stateDir, 0o755);
            }

            // Save state to file
            const contents = new TextEncoder().encode(JSON.stringify(state, null, 2));
            GLib.file_set_contents(this._stateFile, contents);
        } catch (error) {
            // Ignore errors during state save
        }
    }

    formatDuration(seconds) {
        if (!seconds || isNaN(seconds)) return '';
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    async _updateTrackFromMpris() {
        if (!this._mprisPlayer) return;

        try {
            // Get metadata from MPRIS
            const metadata = this._mprisPlayer.metadata;
            if (!metadata) return;

            // Extract track info
            const title = metadata['xesam:title']?.toString() || '';
            const artist = metadata['xesam:artist']?.[0] || '';
            const artUrl = metadata['mpris:artUrl']?.toString() || '';
            const trackid = metadata['mpris:trackid']?.toString() || '';
            const videoId = trackid.split('/').pop() || this._currentVideoId;

            // Try to get thumbnail from cache if not in MPRIS
            let thumbnail = artUrl;
            if (!thumbnail && videoId) {
                const trackInfo = await this._getTrackInfo(videoId);
                if (trackInfo?.thumbnail) {
                    thumbnail = trackInfo.thumbnail;
                }
            }

            // Update current track
            const trackUpdate = {
                title,
                artists: [{ name: artist }],
                thumbnail,
                videoId,
            };

            // Always update thumbnail if it changes
            const thumbnailChanged = !this._currentTrack?.thumbnail && thumbnail;
            
            // Check for other changes
            const hasChanges = !this._currentTrack ||
                this._currentTrack.title !== trackUpdate.title ||
                this._currentTrack.artists[0].name !== trackUpdate.artists[0].name ||
                thumbnailChanged;

            if (hasChanges || thumbnailChanged) {
                this._currentTrack = trackUpdate;
                this.notify('current-track');

                // Show notification for track change
                if (hasChanges) {
                    this._showNotification(
                        'Now Playing',
                        `${title} - ${artist}`
                    );
                }
            }

            // Update position and duration
            const length = metadata['mpris:length'] || 0;
            if (length > 0) {
                this._duration = Math.floor(length / 1000000); // Convert from microseconds
                this.notify('duration');
            }

            const position = this._mprisPlayer.position || 0;
            if (position > 0) {
                this._position = Math.floor(position / 1000000);
                this.notify('position');
            }
        } catch (e) {
            logError('Error updating track from MPRIS:', e);
        }
    }

    async _showNotification(summary, body = '', urgency = 'normal') {
        try {
            Utils.notify({
                summary: summary,
                body: body,
                urgency: urgency,
            });
        } catch (e) {
            console.error('Notification error:', e);
        }
    }

    _updateCachingStatus(videoId, status) {
        if (!videoId) return;
        this._cachingStatus.set(videoId, status);
        this.notify('caching-status');
        this.emit('changed');
    }

    _initDownloadedTracks() {
        // Initial load of downloaded tracks
        this._updateDownloadedTracks();
        
        // Set up file monitoring
        const cacheDir = this._getOption('cacheDir');
        Utils.execAsync(['mkdir', '-p', cacheDir]).then(() => {
            const file = Gio.File.new_for_path(cacheDir);
            this._monitor = file.monitor_directory(Gio.FileMonitorFlags.NONE, null);
            this._monitor.connect('changed', (monitor, changedFile, otherFile, eventType) => {
                if (eventType === Gio.FileMonitorEvent.CREATED ||
                    eventType === Gio.FileMonitorEvent.DELETED) {
                    this._updateDownloadedTracks();
                }
            });
        });
    }

    async _updateDownloadedTracks() {
        const cacheDir = this._getOption('cacheDir');
        const files = await Utils.execAsync(['find', cacheDir, '-name', '*.mp3']);
        
        if (!files) {
            this._downloadedTracks = [];
            return;
        }

        const tracks = [];
        for (const file of files.split('\n').filter(Boolean)) {
            const videoId = GLib.path_get_basename(file).replace('.mp3', '');
            const metadataFile = GLib.build_filenamev([cacheDir, `${videoId}.json`]);
            
            try {
                let trackInfo;
                if (GLib.file_test(metadataFile, GLib.FileTest.EXISTS)) {
                    // Read from cached metadata
                    const [ok, contents] = GLib.file_get_contents(metadataFile);
                    if (ok) {
                        trackInfo = JSON.parse(new TextDecoder().decode(contents));
                    }
                } else {
                    // Fetch and cache metadata
                    trackInfo = await this._getTrackInfo(videoId);
                    if (trackInfo) {
                        GLib.file_set_contents(
                            metadataFile,
                            JSON.stringify(trackInfo, null, 2)
                        );
                    }
                }
                
                if (trackInfo) {
                    tracks.push({
                        ...trackInfo,
                        isDownloaded: true,
                    });
                }
            } catch (error) {
                console.error('Error processing track:', error);
            }
        }

        this._downloadedTracks = tracks;
        this.emit('changed');
        this.notify('downloaded-tracks');
    }

    _cleanupCache(cacheDir) {
        try {
            const dir = Gio.File.new_for_path(cacheDir);
            if (!dir.query_exists(null)) return;

            const children = dir.enumerate_children('standard::*', Gio.FileQueryInfoFlags.NONE, null);
            let fileInfo;
            const now = GLib.get_real_time() / 1000000; // Convert to seconds
            const maxAge = 24 * 60 * 60; // 24 hours in seconds

            while ((fileInfo = children.next_file(null)) !== null) {
                const child = dir.get_child(fileInfo.get_name());
                const info = child.query_info('time::modified', Gio.FileQueryInfoFlags.NONE, null);
                const mtime = info.get_modification_time().tv_sec;
                
                if (now - mtime > maxAge) {
                    child.delete(null);
                }
            }
        } catch (error) {
            console.error('Error cleaning cache:', error);
        }
    }

    async cacheTrack(videoId) {
        if (!videoId) return;
        
        try {
            const trackInfo = await this._getTrackInfo(videoId);
            if (!trackInfo || trackInfo.error) {
                throw new Error('Failed to get track info');
            }

            const url = `https://music.youtube.com/watch?v=${videoId}`;
            const musicDir = GLib.get_home_dir() + '/Music';
            
            await Utils.execAsync(['pkill', 'vlc']).catch(print);
            this._updateCachingStatus(videoId, 'caching');
            this._showNotification('Download Started', `Downloading: ${trackInfo.title}`);

            try {
                // Download with original title for easy lookup
                await Utils.execAsync(['yt-dlp',
                    '--format', 'bestaudio[acodec=opus]/bestaudio',
                    '--extract-audio',
                    '--audio-format', 'opus',
                    '--audio-quality', '0',
                    '--no-playlist',
                    '--output', `${musicDir}/%(title)s.%(ext)s`,
                    '--no-mtime',  // Don't change file modification time
                    url
                ]).catch(print);

                this._updateCachingStatus(videoId, 'cached');
                this._showNotification('Download Complete', `Downloaded: ${trackInfo.title}`);

                // Play the local file directly
                const localFile = `${musicDir}/${trackInfo.title}.opus`;
                await Utils.execAsync([
                    'vlc',
                    '--no-video',
                    '--intf', 'dummy',
                    '--play-and-exit',
                    '--extraintf', 'mpris2',
                    '--audio-display=no',
                    '--force-seekable=yes',
                    '--hr-seek=yes',
                    localFile
                ], {
                    spawn: true,
                });
            } catch (error) {
                this._updateCachingStatus(videoId, 'error');
                throw error;
            }
        } catch (error) {
            console.error('Error downloading track:', error);
            this._showNotification('Download Failed', error.message, 'error');
        }
    }

    async stopAllInstances() {
        try {
            // Only kill VLC if socket doesn't exist or isn't responding
            const socketExists = GLib.file_test('/tmp/vlcsocket', GLib.FileTest.EXISTS);
            if (socketExists) {
                try {
                    await Utils.execAsync(['socat', '-', '/tmp/vlcsocket'], {
                        input: '{ "command": ["get_property", "pid"] }\n'
                    });
                    // VLC is running and responding, don't kill it
                    return;
                } catch (e) {
                    // Socket exists but not responding, clean up
                    await Utils.execAsync(['rm', '-f', '/tmp/vlcsocket']).catch(() => {});
                }
            }
            // Kill VLC only if no valid socket exists
            await Utils.execAsync(['pkill', '-9', 'vlc']).catch(() => {});
            // Remove the socket file
            await Utils.execAsync(['rm', '-f', '/tmp/vlcsocket']).catch(() => {});
            // Reset state
            this._currentTrack = null;
            this._currentVideoId = null;
            this._playing = false;
            this._position = 0;
            this._duration = 0;
            this._mprisPlayer = null;
            // Notify changes
            this.notify('current-track');
            this.notify('playing');
            this.notify('position');
            this.notify('duration');
            this._showNotification('YouTube Music', 'All instances stopped');
        } catch (error) {
            console.error('Error stopping instances:', error);
            this._showNotification('Error', 'Failed to stop all instances', 'critical');
        }
    }

    async _initDefaultContent() {
        try {
            this._loading = true;
            this.notify('loading');
            
            const isOnline = await this._isOnline();
            if (!isOnline) {
                this._defaultContent = this._downloadedTracks.slice(0, 20);
                return;
            }

            // Get trending/recommended music
            const pythonScript = `
from ytmusicapi import YTMusic
import json
ytm = YTMusic()
results = ytm.get_trending()
for result in results:
    print(json.dumps({
        'videoId': result['videoId'],
        'title': result['title'],
        'artists': [{'name': a['name']} for a in result.get('artists', [])],
        'duration': result.get('duration_seconds', 0),
        'thumbnail': result.get('thumbnails', [{}])[-1].get('url', '')
    }))
`;
            const output = await Utils.execAsync(['python3', '-c', pythonScript]);
            
            this._defaultContent = output.split('\n')
                .filter(line => line.trim())
                .map(line => JSON.parse(line.trim()));

            // If no search is active, show default content
            if (!this._currentSearchQuery) {
                this._searchResults = this._showDownloaded ? this._downloadedTracks : this._defaultContent;
                this.notify('search-results');
            }
        } catch (error) {
            logError(error);
            // Fallback to downloaded tracks if available
            this._defaultContent = this._downloadedTracks.slice(0, 20);
        } finally {
            this._loading = false;
            this.notify('loading');
        }
    }

    _notifyError(message) {
        Notifications.notify({
            summary: 'YouTube Music Error',
            body: message,
            icon: 'error',
            urgency: 'normal',
        });
    }

    _handleError(error, operation) {
        console.error(`Error during ${operation}:`, error);
        this._notifyError(`Failed to ${operation}: ${error.message}`);
        this.emit('error', error);
    }

    _getCached(key) {
        const cached = this._cache.get(key);
        if (!cached) return null;
        
        if (Date.now() - cached.timestamp > this._cacheTimeout * 1000) {
            this._cache.delete(key);
            return null;
        }
        return cached.data;
    }

    _setCache(key, data) {
        this._cache.set(key, {
            data,
            timestamp: Date.now(),
        });
        this._cleanCache();
    }

    _cleanCache() {
        const now = Date.now();
        for (const [key, value] of this._cache.entries()) {
            if (now - value.timestamp > this._cacheTimeout * 1000) {
                this._cache.delete(key);
            }
        }
    }
}

// Export the service
const service = new YouTubeMusicService();
export default service;
