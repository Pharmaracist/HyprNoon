import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import PowerProfiles from 'resource:///com/github/Aylur/ags/service/powerprofiles.js';
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';

const { Button, Box, Stack } = Widget;

const POWER_MODES = {
    'power-saver': {
        icon: 'battery_saver',
        next: 'balanced'
    },
    'balanced': {
        icon: 'balance',
        next: 'performance'
    },
    'performance': {
        icon: 'bolt',
        next: 'power-saver'
    }
};

export default () => Button({
    className: 'bar-powermode',
    onClicked: () => {
        const currentMode = PowerProfiles.active_profile;
        if (currentMode && POWER_MODES[currentMode]) {
            PowerProfiles.active_profile = POWER_MODES[currentMode].next;
        }
    },
    child: Box({
        className: 'bar-button',
        children: [
            Box({
                className: 'spacing-h-10 onSurfaceVariant',
                children: [
                    Stack({
                        transition: 'slide_up_down',
                        transitionDuration: 100,
                        children: {
                            'power-saver': MaterialIcon('battery_saver', 'larger'),
                            'balanced': MaterialIcon('balance', 'larger'),
                            'performance': MaterialIcon('bolt', 'larger'),
                        },
                        setup: self => self.hook(PowerProfiles, stack => {
                            const currentMode = PowerProfiles.active_profile;
                            if (currentMode && POWER_MODES[currentMode]) {
                                stack.shown = currentMode;
                            }
                        }),
                    }),
                ],
            }),
        ],
    }),
});
