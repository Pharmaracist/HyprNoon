import Service from 'resource:///com/github/Aylur/ags/service.js';
const { GLib } = imports.gi;
import { WWO_CODE } from "../modules/.commondata/weather.js";

const CACHE_DURATION = 30 * 60 * 1000000; // 15 minutes in microseconds
const WEATHER_CACHE_FOLDER = `${GLib.get_user_cache_dir()}/ags/weather`;
const WEATHER_CACHE_PATH = WEATHER_CACHE_FOLDER + "/wttr.in.txt";

class WeatherService extends Service {
    static {
        Service.register(this, {}, {
            'temperature': ['string'],
            'feels-like': ['string'],
            'description': ['string'],
            'icon': ['string'],
        });
    }

    _temperature = "N/A";
    _feelsLike = "N/A";
    _description = "Unknown";
    _icon = "device_thermostat";

    get temperature() { return this._temperature; }
    get feelsLike() { return this._feelsLike; }
    get description() { return this._description; }
    get icon() { return this._icon; }

    constructor() {
        super();
        Utils.exec(`mkdir -p ${WEATHER_CACHE_FOLDER}`);
        this._updateWeather();
        this._scheduleUpdates();
    }

    async _getLocation() {
        try {
            const response = await Utils.execAsync(['curl', '-s', '-k', 'https://ipapi.co/json/']);
            const data = JSON.parse(response);
            return data.city || userOptions.weather?.city || 'Cairo';
        } catch (err) {
            return userOptions.weather?.city || 'Cairo';
        }
    }

    _getWeatherIcon(weatherCode) {
        const condition = WWO_CODE[weatherCode];
        switch(condition) {
            case 'Sunny': return 'light_mode';
            case 'PartlyCloudy': return 'partly_cloudy_day';
            case 'Cloudy':
            case 'VeryCloudy': return 'cloud';
            case 'Fog': return 'foggy';
            case 'LightShowers':
            case 'LightRain': return 'water_drop';
            case 'HeavyRain':
            case 'HeavyShowers': return 'rainy';
            case 'ThunderyShowers':
            case 'ThunderyHeavyRain': return 'thunderstorm';
            case 'LightSnow':
            case 'HeavySnow':
            case 'LightSnowShowers':
            case 'HeavySnowShowers': return 'ac_unit';
            case 'LightSleet':
            case 'LightSleetShowers': return 'weather_mix';
            default: return 'device_thermostat';
        }
    }

    async _updateWeather() {
        try {
            const city = await this._getLocation();
            const encodedCity = encodeURIComponent(city.trim());
            const cmd = ['curl', '-s', '-k', '--connect-timeout', '5', `https://wttr.in/${encodedCity}?format=j1`];
            const response = await Utils.execAsync(cmd);

            if (!response) throw new Error('Empty response');
            
            const data = JSON.parse(response);
            const current = data.current_condition[0];
            
            this._temperature = `${current.temp_C}°C`;
            this._feelsLike = `${current.FeelsLikeC}°C`;
            this._description = current.weatherDesc[0].value;
            this._icon = this._getWeatherIcon(current.weatherCode);

            this.emit('changed');
            Utils.exec(`echo '${response}' > ${WEATHER_CACHE_PATH}`);
            
        } catch (error) {
            console.error('Weather update failed:', error);
            this._loadCachedWeather();
        }
    }

    _loadCachedWeather() {
        try {
            const data = Utils.readFile(WEATHER_CACHE_PATH);
            const parsed = JSON.parse(data);
            const current = parsed.current_condition[0];
            
            this._temperature = `${current.temp_C}°C`;
            this._feelsLike = `${current.FeelsLikeC}°C`;
            this._description = current.weatherDesc[0].value;
            this._icon = this._getWeatherIcon(current.weatherCode);
            
            this.emit('changed');
        } catch (error) {
            console.error('Failed to load cached weather:', error);
        }
    }

    _scheduleUpdates() {
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, CACHE_DURATION, () => {
            this._updateWeather();
            return GLib.SOURCE_CONTINUE;
        });
    }
}

export default new WeatherService();