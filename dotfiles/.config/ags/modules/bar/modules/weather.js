import Widget from "resource:///com/github/Aylur/ags/widget.js";
import * as Utils from "resource:///com/github/Aylur/ags/utils.js";
const { Box, Label, EventBox, Stack } = Widget;
const { execAsync } = Utils;
const { GLib } = imports.gi;
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
import { WWO_CODE } from "../../.commondata/weather.js";
import PrayerTimesService from '../../../services/prayertimes.js';
import Media from 'resource:///com/github/Aylur/ags/service/mpris.js';
import Notifications from 'resource:///com/github/Aylur/ags/service/notifications.js';
import Clock from './clock.js'
const WEATHER_CACHE_FOLDER = `${GLib.get_user_cache_dir()}/ags/weather`;
const WEATHER_CACHE_PATH = WEATHER_CACHE_FOLDER + "/wttr.in.txt";
Utils.exec(`mkdir -p ${WEATHER_CACHE_FOLDER}`);
const userName = GLib.get_real_name() + " ~ " + GLib.get_user_name();


const MAX_TEXT_LENGTH = 30;

const truncateText = (text, maxLength = MAX_TEXT_LENGTH) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
};

const WeatherWidget = () => {
  const CACHE_DURATION = 15 * 60 * 1000000; // 15 minutes
  const CYCLE_INTERVAL = userOptions.asyncGet().etc.weather.cycleTimeout || 10000; // 10 seconds as fallback
  const PRIORITY_DISPLAY_TIME = 1000; // 1 second for priority displays
  let lastUpdate = 0;
  let cachedData = null;
  let displayMode = 'clock';
  let previousMode = 'clock';
  let notificationTimeout = null;
  let cycleTimeout = null;
  let cachedTrackTitle = null;
  let lastTitle = null;

  const getLocation = async () => {
    try {
      const response = await execAsync(['curl', '-s', '-k', 'https://ipapi.co/json/']);
      const data = JSON.parse(response);
      return data.city || userOptions.weather?.city || 'Cairo';
    } catch (err) {
      return userOptions.weather?.city || 'Cairo';
    }
  };

  const updateWeatherForCity = async (city) => {
    // Check cache first
    const now = Date.now();
    if (cachedData && (now - lastUpdate) < CACHE_DURATION) {
      return cachedData;
    }

    try {
      const encodedCity = encodeURIComponent(city.trim());
      const cmd = ['curl', '-s', '-k', '--connect-timeout', '5', `https://wttr.in/${encodedCity}?format=j1`];
      const response = await execAsync(cmd);
      
      if (!response) {
        throw new Error('Empty response from weather API');
      }

      const data = JSON.parse(response);
      if (!data || !data.current_condition || !data.current_condition[0]) {
        throw new Error('Invalid weather data format');
      }

      const weatherData = {
        temp: data.current_condition[0].temp_C,
        feelsLike: data.current_condition[0].FeelsLikeC,
        weatherDesc: data.current_condition[0].weatherDesc[0].value,
        weatherCode: data.current_condition[0].weatherCode,
      };

      // Update cache
      cachedData = weatherData;
      lastUpdate = now;

      return weatherData;
    } catch (err) {
      return null;
    }
  };

  const getWeatherIcon = (weatherCode) => {
    const condition = WWO_CODE[weatherCode];
    switch(condition) {
      case 'Sunny':
        return 'light_mode';
      case 'PartlyCloudy':
        return 'partly_cloudy_day';
      case 'Cloudy':
      case 'VeryCloudy':
        return 'cloud';
      case 'Fog':
        return 'foggy';
      case 'LightShowers':
      case 'LightRain':
        return 'water_drop';
      case 'HeavyRain':
      case 'HeavyShowers':
        return 'rainy';
      case 'ThunderyShowers':
      case 'ThunderyHeavyRain':
        return 'thunderstorm';
      case 'LightSnow':
      case 'HeavySnow':
      case 'LightSnowShowers':
      case 'HeavySnowShowers':
        return 'ac_unit';
      case 'LightSleet':
      case 'LightSleetShowers':
        return 'weather_mix';
      default:
        return 'device_thermostat';
    }
  };

  const getPrayerIcon = (prayerName) => {
    switch(prayerName?.toLowerCase()) {
      case 'fajr':
        return 'dark_mode'; // Dawn/early morning
      case 'sunrise':
        return 'wb_twilight'; // Sunrise
      case 'dhuhr':
        return 'light_mode'; // Noon sun
      case 'asr':
        return 'routine'; // Afternoon
      case 'maghrib':
        return 'relax'; // Sunset
      case 'isha':
        return 'partly_cloudy_night'; // Night
      default:
        return 'mosque';
    }
  };
  const weatherIcon = MaterialIcon('device_thermostat', 'large weather-icon txt-norm txt-onLayer1');
  const prayerIcon = MaterialIcon('mosque', 'large weather-icon txt-norm txt-onLayer1');
  const mediaIcon = MaterialIcon('music_note', 'large weather-icon txt-norm txt-onLayer1');
  const notificationIcon = MaterialIcon('notifications', 'large weather-icon txt-norm txt-onLayer1');

  const tempLabel = Label({
    className: "txt-norm txt-onLayer1",
    label: "",
  });

  const feelsLikeTextLabel = Label({
    className: "txt-norm  txt-onLayer1",
    label: " feels",
  });

  const feelsLikeLabel = Label({
    className: "txt-norm  txt-onLayer1",
    label: "",
  });

  const prayerNameLabel = Label({
    className: "txt-norm  txt-onLayer1",
    visible: false,
    label: "",
  });

  const prayerTimeLabel = Label({
    className: "txt-norm  txt-onLayer1",
    visible: false,
    label: "",
  });

  const mediaTitleLabel = Label({
    className: 'txt-norm txt-onLayer1',
  });

  const notificationLabel = Label({
    className: 'txt-norm txt-onLayer1',
  });

  const weatherContent = Box({
    className: 'weather-content spacing-h-4',
    hpack: 'center',
    vpack: 'center',
    children: [
      weatherIcon,
      Box({
        className: 'spacing-h-2',
        hpack: 'center',
        vpack: 'center',
        children: [
          // tempLabel,
          feelsLikeTextLabel,
          feelsLikeLabel
        ]
      })
    ]
  });

  const prayerContent = Box({
    className: 'prayer-content spacing-h-10',
    hpack: 'center',
    vpack: 'center',
    children: [
      prayerIcon,
      Box({
        className: 'spacing-h-10',
        hpack: 'center',
        vpack: 'center',
        children: [prayerNameLabel, prayerTimeLabel]
      })
    ]
  });

  const usernameContent = Box({
    className: 'prayer-content spacing-h-10',
    hpack: 'center',
    vpack: 'center',
    children: [
      Box({
        className: 'spacing-h-10',
        hpack: 'center',
        vpack: 'center',
        children: [
          Widget.Label({
            className: 'txt-norm txt-onLayer1',
            label: userName
          })
        ]
      })
    ]
  });

  const mediaContent = Box({
    className: 'weather-content spacing-h-4',
    hpack: 'center',
    vpack: 'center',
    children: [
      mediaIcon,
      Box({
        className: 'spacing-h-2',
        hpack: 'center',
        vpack: 'center',
        children: [mediaTitleLabel]
      })
    ]
  });

  const notificationContent = Box({
    className: 'weather-content spacing-h-4',
    hpack: 'center',
    vpack: 'center',
    children: [
      notificationIcon,
      Box({
        className: 'spacing-h-2',
        hpack: 'center',
        vpack: 'center',
        children: [notificationLabel]
      })
    ]
  });

  const clockContent = Box({
    className: 'weather-content spacing-h-4',
    hpack: 'center',
    vpack: 'center',
    children: [
      Box({
        className: 'spacing-h-2',
        hpack: 'center',
        vpack: 'center',
        children: [Clock()]
      })
    ]
  });
  const contentStack = Stack({
    transition: 'slide_up_down',
    transitionDuration: userOptions.asyncGet().animations.durationSmall,
    children: {
      'weather': weatherContent,
      'prayer': prayerContent,
      'media': mediaContent,
      'notification': notificationContent,
      'clock': clockContent,
      'username': usernameContent,
    },
  });

  const weatherBox = Box({
    css: `padding:4.55px 45px`,
    // className: "txt-onSurfaceVariant bar-group-margin bar-group bar-group-standalone bar-group-pad",
    children: [contentStack],
  });

  const updateWidget = async () => {
    try {
      const city = await getLocation();
      const weatherData = await updateWeatherForCity(city);

      if (!weatherData) {
        tempLabel.label = "N/A";
        feelsLikeLabel.label = "";
        feelsLikeTextLabel.visible = false;
        tempLabel.tooltipText = "Weather data unavailable";
        return;
      }

      const { temp, feelsLike, weatherDesc, weatherCode } = weatherData;
      tempLabel.label = `${temp}°C`;
      feelsLikeLabel.label = ` ${feelsLike}°C`;
      feelsLikeTextLabel.visible = true;
      tempLabel.tooltipText = `${weatherDesc}\nFeels like: ${feelsLike}°C`;
      weatherIcon.label = getWeatherIcon(weatherCode);
    } catch (err) {
      tempLabel.label = "N/A";
      feelsLikeLabel.label = "";
      feelsLikeTextLabel.visible = false;
      tempLabel.tooltipText = "Weather data unavailable";
    }
  };

  const showPriorityContent = (mode, duration) => {
    if (notificationTimeout) {
      GLib.source_remove(notificationTimeout);
      notificationTimeout = null;
    }

    previousMode = displayMode;
    displayMode = mode;
    contentStack.shown = mode;

    // Return to previous mode after duration
    notificationTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, duration, () => {
      displayMode = previousMode;
      contentStack.shown = previousMode;
      notificationTimeout = null;
      return GLib.SOURCE_REMOVE;
    });
  };

  const updateMediaInfo = () => {
    const title = Media.title;
    const newTitle = title ? truncateText(title) : 'Scilent Mode';
    
    // If title changed and it's not empty, show it briefly
    if (newTitle !== lastTitle && title) {
      mediaTitleLabel.label = newTitle;
      showPriorityContent('media', PRIORITY_DISPLAY_TIME);
    } else {
      mediaTitleLabel.label = newTitle;
    }
    
    lastTitle = newTitle;
  };
  const showNotification = (Notification) => {
    const summaryText = Notification.summary || 'New Notification';
    notificationLabel.label = truncateText(summaryText);
    showPriorityContent('notification', PRIORITY_DISPLAY_TIME);
  };

  const cycleModes = () => {
    // Don't cycle if showing notification
    if (displayMode === 'notification') return;

    // Cycle through modes: weather -> prayer -> media -> weather
    switch (displayMode) {
      case 'weather':
        displayMode = 'prayer';
        break;
      case 'prayer':
        displayMode = 'media';
        break;
      case 'media':
        displayMode = 'clock';
        break;
      case 'clock':
        displayMode = 'username';
        break;
      case 'username':
        displayMode = 'weather';
        break;
      default:
        displayMode = 'weather';
    }
    
    contentStack.shown = displayMode;
    
    if (displayMode === 'prayer') {
      const nextPrayer = PrayerTimesService.nextPrayerName;
      const nextTime = PrayerTimesService.nextPrayerTime?.trim();
      if (nextPrayer && nextTime) {
        prayerNameLabel.label = nextPrayer;
        prayerTimeLabel.label = nextTime;
        prayerIcon.label = getPrayerIcon(nextPrayer);
      }
    }
  };

  const toggleDisplay = () => {
    // Clear any existing cycle timeout
    if (cycleTimeout) {
      GLib.source_remove(cycleTimeout);
      cycleTimeout = null;
    }
    
    // Manual cycle
    cycleModes();
    
    // Restart auto-cycle after 3 seconds
    cycleTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, CYCLE_INTERVAL, () => {
      cycleModes();
      return GLib.SOURCE_CONTINUE; // Keep cycling
    });
  };

  return Widget.EventBox({
    onPrimaryClick: toggleDisplay,
    hexpand:true,
    hpack: 'center',
    child: weatherBox,
    setup: self => {
      // Initial updates
      updateWidget();
      updateMediaInfo();

      // Start auto-cycle
      cycleTimeout = GLib.timeout_add(GLib.PRIORITY_DEFAULT, CYCLE_INTERVAL, () => {
        cycleModes();
        return GLib.SOURCE_CONTINUE; // Keep cycling
      });

      // Set up media monitoring
      Media.connect('changed', updateMediaInfo);
      Notifications.connect('notified', (box, notifications) => {
        showNotification(notifications);
      });

      // Regular weather updates
      self.poll(CACHE_DURATION / 1000000, updateWidget);
    }
  });
};

export default WeatherWidget;
