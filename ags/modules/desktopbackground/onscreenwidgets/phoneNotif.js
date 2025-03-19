const { Pango } = imports.gi;
import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Notifications from 'resource:///com/github/Aylur/ags/service/notifications.js';
const { Box, Button, Label, Revealer, Scrollable, Stack } = Widget;
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';
import { setupCursorHover } from '../../.widgetutils/cursorhover.js';
import { RoundedCorner } from '../../.commonwidgets/cairo_roundedcorner.js';
import Notification from '../../.commonwidgets/notification.js';
let opts = await userOptions.asyncGet()
export default (props) => {
    const notificationList = Box({
        vertical: true,
        vpack: 'start',
        className: 'spacing-v-5-revealer',
        setup: (self) => {
            Notifications.notifications.forEach(n => {
                self.pack_end(Notification({
                    notifObject: n,
                    isPopup: false,
                }), false, false, 0);
            });
            self.show_all();

            const notifiedId = Notifications.connect('notified', (_, id) => {
                const notif = Notifications.getNotification(id);
                if (notif) {
                    const newNotif = Notification({
                        notifObject: notif,
                        isPopup: false,
                    });
                    self.pack_end(newNotif, false, false, 0);
                    self.show_all();
                }
            });

            const closedId = Notifications.connect('closed', (_, id) => {
                if (!id) return;
                for (const ch of self.children) {
                    if (ch._id === id) {
                        ch.attribute.destroyWithAnims();
                        break;
                    }
                }
            });

            // Cleanup signals on widget destruction
            self.connect('destroy', () => {
                Notifications.disconnect(notifiedId);
                Notifications.disconnect(closedId);
            });
        },
    });

    const ListActionButton = (icon, name, action) => Button({
        className: 'add-notif-bottom-btn',
        onClicked: action,
        child: Box({
            hpack: 'center',
            className: 'spacing-h-5',
            children: [
                MaterialIcon(icon, 'norm'),
                Label({
                    className: 'txt-small',
                    label: name,
                    wrapMode: Pango.WrapMode.WORD_CHAR,
                }),
            ],
        }),
        setup: setupCursorHover,
    });
    const silenceButton = ListActionButton('notifications_paused', getString('Silence'), (self) => {
        Notifications.dnd = !Notifications.dnd;
        self.toggleClassName('add-notif-scilence-btn-active', Notifications.dnd);
    });
    const notifCount = Label({
        attribute: {
            updateCount: (self) => {
                const count = Notifications.notifications.length;
                if (count > 0) self.label = `${count}`;
                else self.label = '';
            },
        },
        hpack: 'start',
        className: 'txt-small onSurfaceVariant',
        label: `${Notifications.notifications.length}`,
        setup: (self) => self
            .hook(Notifications, (box, id) => self.attribute.updateCount(self), 'notified')
            .hook(Notifications, (box, id) => self.attribute.updateCount(self), 'dismissed')
            .hook(Notifications, (box, id) => self.attribute.updateCount(self), 'closed')
        ,
        wrapMode: Pango.WrapMode.WORD_CHAR,
    });

    const clearButton = Revealer({
        transition: 'slide_right',
        transitionDuration: opts.animations.durationSmall,
        setup: (self) => {
            const updateVisibility = () => {
                self.revealChild = Notifications.notifications.length > 0;
            };
            const notifiedId = Notifications.connect('notified', updateVisibility);
            const closedId = Notifications.connect('closed', updateVisibility);
            self.connect('destroy', () => {
                Notifications.disconnect(notifiedId);
                Notifications.disconnect(closedId);
            });

            // Initial update
            updateVisibility();
        },
        child: ListActionButton('clear_all', getString('Clear'), () => {
            Notifications.clear();
            const kids = notificationList.get_children();
            for (let i = 0; i < kids.length; i++) {
                const kid = kids[i];
                Utils.timeout(opts.animations.choreographyDelay * i, () => {
                    if (kid.attribute && kid.attribute.destroyWithAnims) {
                        kid.attribute.destroyWithAnims();
                    }
                });
            }
        }),
    });
    const headerNotch = Box({
        hpack: 'center',
        hexpand: true,
        children: [
            RoundedCorner('topright', { vpack: "start", className: 'corner add-corner-notif' }),
            Box({
                vpack: 'start',
                hpack: 'fill',
                className: 'add-notif-header',
                child: Label({
                    hpack: 'center',
                    label: 'Notifications',
                    className: 'add-notif-header-txt',

                })

            }),
            RoundedCorner('topleft', { vpack: "start", className: 'corner add-corner-notif' }),
        ]
    })
    const notificationHeader = Box({
        children: [
            // MaterialIcon('notifications_active', 'norm', { css: 'margin-right:0.5rem' }),
            // notifCount,
            headerNotch
        ]
    })
    const notifList = Scrollable({
        className: 'add-notif-bg',
        hexpand: true,
        hscroll: 'never',
        vscroll: 'automatic',
        child: Box({
            vexpand: true,
            vertical: true,
            spacing: 10,
            children: [
                notificationHeader,
                Box({
                    vexpand: true,
                    vertical: true,
                    homogeneous: true,
                    children: [
                        notificationList,
                        Box({
                            vpack: 'end',
                            hpack: 'fill',
                            homogeneous: true,
                            className: 'add-notif-list-item',
                            children: [
                                clearButton,
                                silenceButton
                            ],
                        })
                    ]
                })
            ]
        }),
        setup: (self) => {
            const vScrollbar = self.get_vscrollbar();
            vScrollbar.get_style_context().add_class('sidebar-scrollbar');
        },
    });
    // const notifEmptyContent = Box({
    //     children: [
    //         Box({
    //             vertical: true,
    //             vpack: 'center',
    //             children: [
    //                 Box({
    //                     vertical: true,
    //                     className: 'txt-primary',
    //                     opacity: 0.3,
    //                     hpack: 'end',
    //                     children: [
    //                         MaterialIcon('relax', 'gigantic', { css: `font-size: 6rem` }),
    //                         Label({ label: getString('No notifications'), className: 'txt-norm', wrapMode: Pango.WrapMode.WORD_CHAR, }),
    //                     ]
    //                 }),
    //             ]
    //         })]
    // });

    const listContents = Stack({
        transition: 'slide_right',
        transitionDuration: opts.animations.durationLarge,
        children: {
            'empty': Box(),
            'list': notifList,
        },
        setup: (self) => {
            const updateVisibility = () => {
                self.shown = Notifications.notifications.length > 0 ? 'list' : 'empty';
            };

            // Hook into notification signals
            const notifiedId = Notifications.connect('notified', updateVisibility);
            const closedId = Notifications.connect('closed', updateVisibility);

            // Cleanup signals on widget destruction
            self.connect('destroy', () => {
                Notifications.disconnect(notifiedId);
                Notifications.disconnect(closedId);
            });

            // Initial update
            updateVisibility();
        },
    });

    return Box({
        ...props,
        hexpand: true,
        hpack: 'end',
        vpack: 'end',
        children: [
            listContents,

        ],
    });
};