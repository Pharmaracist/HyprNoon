import Widget from 'resource:///com/github/Aylur/ags/widget.js';
const { GLib, Gtk } = imports.gi;
const { Box, Label, Icon, Button, Revealer, Overlay, EventBox } = Widget;
let bg = Overlay({
    child: Icon({
        className: 'add-calendar-bg'
    }),
    overlays: [
        Icon({
            vpack: 'end',
            icon: 'calendar-tree-symbolic',
            size: 150,
            className: 'calendar-tree'
        }),
    ]
})
const dateDay = Variable("", {
    poll: [
        100000,
        () => GLib.DateTime.new_now_local().format("%d"),
    ],
});
const year = Variable("", {
    poll: [
        100000,
        () => GLib.DateTime.new_now_local().format("%Y"),
    ],
});
const dayName = Variable("", {
    poll: [
        100000,
        () => GLib.DateTime.new_now_local().format("%A"),
    ],
});

let frontCard = Overlay({
    child: bg,
    overlays: [
        Box({
            vertical: true,
            hpack: 'start',
            vpack: 'end',
            css: 'margin:1rem',
            children: [
                Box({
                    children: [
                        Label({
                            xalign: 0,
                            className: 'add-calendar-date-day',
                            label: dateDay.bind(),
                        }),
                        Label({
                            className: 'add-calendar-date-day',
                            label: '.',
                        })]
                }),
                Label({
                    xalign: 0,
                    className: 'add-calendar-dayname',
                    label: dayName.bind(),
                }),
                Label({
                    xalign: 0,
                    className: 'add-calendar-year',
                    label: year.bind(),
                }),
            ]
        })
    ]
})
const CalendarDay = () => Box({
    css: `margin:2.5rem 0 0 0`,
    children: [
        frontCard
    ]
})
export default CalendarDay