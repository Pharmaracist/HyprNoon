import Service from 'resource:///com/github/Aylur/ags/service.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
import GLib from 'gi://GLib';
import userOptions from '../modules/.configuration/user_options.js';

class QuranService extends Service {
    static {
        Service.register(
            this,
            {
                'error': ['string'],
                'surah-received': ['string'],
                'history-updated': ['jsobject'],
                'search-results': ['jsobject'],
            },
        );
    }

    _baseUrl = 'https://api.alquran.cloud/v1';
    _currentRequest = null;
    _recentSurahs = [];
    _maxHistory = 3;
    _scrollPositions = {};
    _verses = null;

    constructor() {
        super();
        
        // Load recent surahs and scroll positions from file
        this._loadHistory();
        this._loadScrollPositions();
        this._loadVersesFromCache();
    }

    _getHistoryPath() {
        return `${GLib.get_user_cache_dir()}/ags/quran_history.json`;
    }

    _getScrollPositionsPath() {
        return `${GLib.get_user_cache_dir()}/ags/quran_scroll_positions.json`;
    }

    _loadScrollPositions() {
        try {
            const path = this._getScrollPositionsPath();
            if (Utils.readFile(path)) {
                this._scrollPositions = JSON.parse(Utils.readFile(path));
            }
        } catch (error) {
            this.emit('error', 'Error loading scroll positions');
        }
    }

    _saveScrollPositions() {
        try {
            const path = this._getScrollPositionsPath();
            Utils.writeFile(JSON.stringify(this._scrollPositions), path);
        } catch (error) {
            this.emit('error', 'Error saving scroll positions');
        }
    }

    saveScrollPosition(surahNumber, position) {
        this._scrollPositions[surahNumber] = position;
        this._saveScrollPositions();
    }

    getScrollPosition(surahNumber) {
        return this._scrollPositions[surahNumber] || 0;
    }

    _loadHistory() {
        try {
            const historyPath = this._getHistoryPath();
            if (Utils.readFile(historyPath)) {
                this._recentSurahs = JSON.parse(Utils.readFile(historyPath));
                this.emit('history-updated', this._recentSurahs);
            }
        } catch (error) {
            this.emit('error', 'Error loading history');
        }
    }

    _saveHistory() {
        try {
            const historyPath = this._getHistoryPath();
            Utils.writeFile(JSON.stringify(this._recentSurahs), historyPath);
            this.emit('history-updated', this._recentSurahs);
        } catch (error) {
            this.emit('error', 'Error saving history');
        }
    }

    addToHistory(surahNumber, surahName) {
        // Remove if already exists
        this._recentSurahs = this._recentSurahs.filter(s => s.number !== surahNumber);
        
        // Add to front
        this._recentSurahs.unshift({
            number: surahNumber,
            name: surahName,
            timestamp: new Date().toISOString(),
        });
        
        // Keep only last N
        if (this._recentSurahs.length > this._maxHistory) {
            this._recentSurahs = this._recentSurahs.slice(0, this._maxHistory);
        }
        
        this._saveHistory();
    }

    getRecentSurahs() {
        return this._recentSurahs;
    }

    getSurahName(number) {
        const surahNames = {
            1: "الفَاتِحَة",
            2: "البَقَرَة",
            3: "آل عِمرَان",
            4: "النِّسَاء",
            5: "المَائِدَة",
            6: "الأَنعَام",
            7: "الأَعرَاف",
            8: "الأَنفَال",
            9: "التَّوبَة",
            10: "يُونس",
            // Add more Surah names...
        };
        return surahNames[number] || "";
    }

    getVerseNumberStyle(number) {
        try {
            const style = userOptions.value?.modules?.quran?.verseNumberStyle || 'circle';
            const num = parseInt(number);
            switch (style) {
                case 'circle':
                    return `⟨${num}⟩`;
                case 'brackets':
                    return `⟦${num}⟧`;
                case 'square':
                    return `〖${num}〗`;
                default:
                    return `${num}.`;
            }
        } catch (error) {
            return `${number}.`; // Fallback to simple format
        }
    }

    async _loadAllVerses() {
        if (this._verses) {
            return;
        }

        try {
            // Create cache directory if it doesn't exist
            const cacheDir = `${GLib.get_user_cache_dir()}/ags/quran`;
            Utils.exec(`mkdir -p "${cacheDir}"`);

            // Get complete Quran in one request
            const url = `${this._baseUrl}/quran/ar.asad`;
            
            const cmd = ['curl', '-s', url];
            const result = await Utils.execAsync(cmd);
            
            if (!result) {
                throw new Error('Could not connect to Quran API');
            }

            const data = JSON.parse(result);

            if (!data?.data?.surahs) {
                throw new Error('Invalid API response format');
            }

            // Convert to verses array
            const allVerses = [];
            data.data.surahs.forEach(surah => {
                const chapterNum = surah.number;
                surah.ayahs.forEach(ayah => {
                    allVerses.push({
                        chapter_number: chapterNum,
                        verse_number: ayah.numberInSurah,
                        verse_key: `${chapterNum}:${ayah.numberInSurah}`,
                        text_uthmani: ayah.text
                    });
                });
            });

            if (allVerses.length === 0) {
                throw new Error('No verses were loaded');
            }

            this._verses = allVerses;
            
            // Cache the verses to a file
            const cachePath = `${GLib.get_user_cache_dir()}/ags/quran/verses.json`;
            Utils.writeFile(JSON.stringify(allVerses), cachePath);

            return true;
        } catch (error) {
            this.emit('error', 'Failed to load Quran data: ' + error.message);
            return false;
        }
    }

    async _loadVersesFromCache() {
        try {
            const cachePath = `${GLib.get_user_cache_dir()}/ags/quran/verses.json`;
            
            if (Utils.readFile(cachePath)) {
                const cacheContent = Utils.readFile(cachePath);
                
                if (!cacheContent) {
                    return false;
                }

                try {
                    this._verses = JSON.parse(cacheContent);
                    if (!Array.isArray(this._verses) || this._verses.length === 0) {
                        return false;
                    }
                    return true;
                } catch (error) {
                    return false;
                }
            }
        } catch (error) {
            this.emit('error', 'Error loading verses from cache');
        }
        
        return this._loadAllVerses();
    }

    async searchQuran(query) {
        if (!this._verses) {
            const loaded = await this._loadVersesFromCache();
            if (!loaded) {
                this.emit('error', 'Failed to load Quran data for search');
                return;
            }
        }

        if (!this._verses || !Array.isArray(this._verses)) {
            this.emit('error', 'Invalid Quran data');
            return;
        }
        
        // For Arabic text, we'll do a direct comparison without normalization
        const results = this._verses.filter(verse => {
            try {
                if (!verse?.text_uthmani) {
                    return false;
                }

                // For Arabic text, do direct comparison
                return verse.text_uthmani.includes(query);
            } catch (error) {
                this.emit('error', 'Error searching Quran');
                return false;
            }
        }).slice(0, 10);

        this.emit('search-results', results);
    }

    async fetchSurah(surahNumber) {
        try {
            // Cancel any ongoing request
            if (this._currentRequest === surahNumber) {
                return; // Already fetching this surah
            }
            this._currentRequest = surahNumber;

            const url = `${this._baseUrl}/surah/${surahNumber}/ar.asad`;
            
            const cmd = ['curl', '-s', '-H', 'Accept: application/json', '-H', 'User-Agent: Mozilla/5.0', url];
            const result = await Utils.execAsync(cmd);
            
            // Check if this request is still current
            if (this._currentRequest !== surahNumber) {
                return;
            }

            if (!result) {
                throw new Error('No response from server');
            }

            const data = JSON.parse(result);
            
            if (!data?.data?.ayahs) {
                this.emit('error', 'Invalid response format from server');
                return;
            }

            if (data.data.ayahs.length === 0) {
                this.emit('error', `No verses found for Surah ${surahNumber}`);
                return;
            }

            // Add Surah name
            const surahName = this.getSurahName(surahNumber);
            if (surahName) {
                // Add to history
                this.addToHistory(surahNumber, surahName);
                data.data.name = surahName;
            }

            // Process verses
            const processedVerses = data.data.ayahs.map(ayah => {
                // For first verse, remove Bismillah if present
                if (ayah.numberInSurah === 1) {
                    const verse = ayah.text.replace(/^بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\s*/, '')
                        .replace(/^بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\s*/, '');
                    return `${verse} ${this.getVerseNumberStyle(ayah.numberInSurah)}`;
                }
                return `${ayah.text} ${this.getVerseNumberStyle(ayah.numberInSurah)}`;
            });

            // Add Bismillah for all Surahs except At-Tawbah (9)
            const bismillah = surahNumber !== 9 ? 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ' : '';

            this.emit('surah-received', JSON.stringify({
                name: data.data.name,
                bismillah,
                verses: processedVerses.join(' ')
            }));
        } catch (error) {
            this.emit('error', 'Failed to fetch surah. Please try again.');
        } finally {
            if (this._currentRequest === surahNumber) {
                this._currentRequest = null;
            }
        }
    }
}

const service = new QuranService();
export default service;
