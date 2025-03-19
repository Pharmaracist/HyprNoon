import Widget from 'resource:///com/github/Aylur/ags/widget.js';
const { Box, Label, Scrollable } = Widget;
import PrayerTimesService from '../../../services/prayertimes.js';

// Helper function to convert 24h to 12h format
const to12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
};

const PrayerTimeItem = (name, time24) => Box({
    className: 'sidebar-prayertime-item txt-small',
    children: [Box({
        vertical: true,
        hexpand: true,
        children: [
            Label({
                xalign: 0,
                className: 'sidebar-prayertime-name',
                label: name,
            }),
            Label({
                xalign: 0,
                className: 'sidebar-prayertime-time',
                label: to12Hour(time24) || '',
            }),
        ],
    })],
});

const TopSection = (nextPrayer, hijriDate) => {
    if (!nextPrayer) return null;
    
    return Box({
        className: 'sidebar-prayertime-top',
        vertical: true,
        children: [
            Label({
                xalign: 0,
                className: 'txt txt-smallie',
                label: hijriDate || '',
            }),
            Box({
                className: 'sidebar-prayertime-next',
                children: [Box({
                    vertical: true,
                    children: [
                        Label({
                            xalign: 0,
                            className: 'txt-small',
                            label: 'Next Prayer:',
                        }),
                        Box({
                            className: 'spacing-h-5',
                            children: [
                                Label({
                                    xalign: 0,
                                    className: 'txt-larger sidebar-prayertime-name',
                                    label: nextPrayer.name,
                                }),
                                Label({
                                    xalign: 1,
                                    hexpand: true,
                                    className: 'txt-larger sidebar-prayertime-time',
                                    label: to12Hour(nextPrayer.time) || '',
                                }),
                            ],
                        }),
                    ],
                })],
            }),
        ],
    });
};

export const PrayerTimesWidget = () => {
    const prayersList = Box({
        vertical: true,
        className: 'spacing-v-5',
    });

    const scrollArea = Scrollable({
        vexpand: true,
        child: prayersList,
        setup: scrollable => {
            scrollable.get_vscrollbar()
                .get_style_context()
                .add_class('sidebar-scrollbar');
        },
    });

    const update = () => {
        const prayers = [
            { name: 'Fajr', time: PrayerTimesService.fajr },
            { name: 'Dhuhr', time: PrayerTimesService.dhuhr },
            { name: 'Asr', time: PrayerTimesService.asr },
            { name: 'Maghrib', time: PrayerTimesService.maghrib },
            { name: 'Isha', time: PrayerTimesService.isha }
        ];

        const nextPrayer = {
            name: PrayerTimesService.nextPrayerName,
            time: PrayerTimesService.nextPrayerTime
        };
        
        const items = [
            TopSection(nextPrayer, PrayerTimesService.hijriDate),
            ...prayers
                .filter(prayer => prayer.name !== nextPrayer.name)
                .map(prayer => PrayerTimeItem(prayer.name, prayer.time))
        ];
        
        prayersList.children = items;
    };

    return Box({
        vertical: true,
        className: 'spacing-v-10',
        setup: box => {
            // Cleanup on destroy
            box.connect('destroy', () => {
                box.get_children().forEach(child => {
                    if (child.destroy) child.destroy();
                });
            });

            // Connect update handler
            const updateHandler = PrayerTimesService.connect('updated', update);
            box.connect('destroy', () => PrayerTimesService.disconnect(updateHandler));
            
            box.children = [scrollArea];
            
            // Initial state
            update();
            PrayerTimesService.refresh();
        },
    });
};
