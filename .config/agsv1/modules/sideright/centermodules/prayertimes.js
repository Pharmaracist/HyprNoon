import Widget from 'resource:///com/github/Aylur/ags/widget.js';
const { Box, Label } = Widget;
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';
import prayerTimes from '../../../services/prayertimes.js';

const formatTimeRemaining = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const prayerTime = new Date();
    prayerTime.setHours(hours, minutes, 0);

    const now = new Date();
    const diff = prayerTime - now;

    if (diff < 0) return '';

    const hoursRemaining = Math.floor(diff / (1000 * 60 * 60));
    const minutesRemaining = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hoursRemaining === 0) {
        return `${minutesRemaining}m remaining`;
    }
    return `${hoursRemaining}h ${minutesRemaining}m remaining`;
};

const PrayerTimeRow = ({ name, time, isNext = false }) => {
    const row = Box({
        className: `prayer-times-item`,
        vertical: true,
        children: [
            Box({
                className: 'spacing-h-5',
                children: [
                    MaterialIcon(isNext ? 'notifications_active' : 'schedule', 'small'),
                    Label({
                        label: name,
                        xalign: 0,
                        hexpand: true,
                    }),
                    Label({
                        className: isNext ? 'time-next' : 'time',
                        label: time,
                        xalign: 1,
                    }),
                ],
            }),
        ],
    });

    if (isNext) {
        row.toggleClassName('prayer-times-next', true);
        const remainingLabel = Label({
            label: formatTimeRemaining(time),
            xalign: 0,
        });

        const updateRemaining = () => {
            remainingLabel.label = formatTimeRemaining(time);
        };

        row.poll(60000, updateRemaining);
        row.children[0].add(Box({
            className: 'prayer-times-remaining',
            children: [remainingLabel],
        }));
    }

    return row;
};

export default () => Box({
    vertical: true,
    className: 'prayer-times-box',
    setup: self => {
        self.hook(prayerTimes, () => {
            self.children = [
                // Box({
                //     className: 'prayer-times-header spacing-h-5',
                //     children: [
                //         MaterialIcon('mosque', 'small'),
                //         Label({
                //             label: 'Prayer Times',
                //             xalign: 0,
                //             hexpand: true,
                //         }),
                //     ],
                // }),
                Box({
                    className: 'prayer-times-date spacing-h-5',
                    css:`min-height: 4rem;`,
                    children: [
                        MaterialIcon('calendar_month', 'small'),
                        Label({
                            label: prayerTimes.hijriDate,
                            xalign: 0,
                        }),
                        Widget.Box({ hexpand: true }),
                        Widget.EventBox({child: MaterialIcon('pause', 'massive'), onPrimaryClick: () => Utils.exec(['killall','mpg123'])}),
                    ],
                }),
                ...['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].map(prayer => 
                    PrayerTimeRow({
                        name: prayer,
                        time: prayerTimes[prayer.toLowerCase()],
                        isNext: prayer === prayerTimes.nextPrayerName,
                    })
                ),
            ];
        });
    },
});
