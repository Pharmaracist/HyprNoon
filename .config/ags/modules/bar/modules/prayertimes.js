import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
import PrayerTimesService from '../../../services/prayertimes.js';

const getPrayerIcon = (prayerName) => {
    switch(prayerName?.toLowerCase()) {
        case 'fajr': return 'dark_mode';
        case 'sunrise': return 'wb_twilight';
        case 'dhuhr': return 'light_mode';
        case 'asr': return 'routine';
        case 'maghrib': return 'relax';
        case 'isha': return 'partly_cloudy_night';
        default: return 'mosque';
    }
};

const PrayerTimesWidget = () => {
    const prayerIcon = MaterialIcon('mosque', 'large weather-icon txt-norm txt-onLayer1');
    const prayerNameLabel = Widget.Label({
        className: "txt-norm txt-onLayer1",
        label: "",
    });
    const prayerTimeLabel = Widget.Label({
        className: "txt-norm txt-onLayer1",
        label: "",
    });

    const updatePrayerTimes = () => {
        const nextPrayer = PrayerTimesService.nextPrayerName;
        const nextTime = PrayerTimesService.nextPrayerTime?.trim();
        
        if (nextPrayer && nextTime) {
            prayerNameLabel.label = nextPrayer;
            prayerTimeLabel.label = nextTime;
            prayerIcon.label = getPrayerIcon(nextPrayer);
        }
    };

    return Widget.Box({
        className: 'prayer-content spacing-h-10',
        hpack: 'center',
        vpack: 'center',
        children: [
            prayerIcon,
            Widget.Box({
                className: 'spacing-h-10',
                hpack: 'center',
                vpack: 'center',
                children: [prayerNameLabel, prayerTimeLabel]
            })
        ],
        setup: self => {
            self.hook(PrayerTimesService, updatePrayerTimes, 'updated')
            updatePrayerTimes();
        }
    });
};

export default PrayerTimesWidget;