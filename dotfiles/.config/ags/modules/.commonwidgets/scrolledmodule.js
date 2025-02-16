import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import GLib from 'gi://GLib';
import userOptions from '../.configuration/user_options.js';

const { Box, Stack, EventBox } = Widget;

/**
 * Creates a module switcher with smooth transitions and auto-cycling
 * @param {Object} props - Properties for the module switcher
 * @param {Array} props.children - Array of widgets to show
 * @param {boolean} [props.autoCycle] - Enable automatic cycling (default: false)
 * @param {number} [props.cycleInterval] - Auto-cycle interval in milliseconds (default: 5000)
 * @param {boolean} [props.pauseOnHover] - Pause cycling on mouse hover (default: true)
 * @param {string} [props.css] - Additional CSS for the container
 * @param {string} [props.className] - Additional class names for the container
 * @returns {import('types/widgets/box').default} The module switcher widget
 */
export default ({
    children = [],
    autoCycle = false,
    cycleInterval = 5000,
    pauseOnHover = true,
    css = '',
    className = '',
}) => {
    // Filter out null/undefined children
    const validChildren = children.filter(Boolean);
    if (validChildren.length === 0) return null;

    let currentIndex = 0;
    let isTransitioning = false;
    let cycleTimeoutId = 0;
    let isCycling = false;
    const transition = userOptions.asyncGet().appearance.Scroll.transition || 'slide_up_down';
    const debounceMs = userOptions.asyncGet().appearance.Scroll.debounce || 100;

    const stack = Stack({
        transition,
        transitionDuration: debounceMs,
        homogeneous: true,
        vexpand: true,
        children: validChildren.map((child, i) => Box({
            child,
            name: i.toString(),
        })),
    });

    // Show first module
    stack.shown = '0';

    const handleScroll = (direction) => {
        if (isTransitioning) return;
        isTransitioning = true;

        if (direction === 'up') {
            currentIndex = (currentIndex - 1 + validChildren.length) % validChildren.length;
        } else {
            currentIndex = (currentIndex + 1) % validChildren.length;
        }
        stack.shown = currentIndex.toString();

        // Reset transitioning state after animation completes
        GLib.timeout_add(GLib.PRIORITY_DEFAULT, debounceMs, () => {
            isTransitioning = false;
            return GLib.SOURCE_REMOVE;
        });

        // Reset cycling timer on user interaction
        if (isCycling) {
            stopCycle();
            startCycle();
        }
    };

    // Cycle control functions
    const startCycle = () => {
        if (validChildren.length <= 1) return;
        isCycling = true;
        
        cycleTimeoutId = GLib.timeout_add(GLib.PRIORITY_DEFAULT, cycleInterval, () => {
            handleScroll('down');
            return GLib.SOURCE_CONTINUE;
        });
    };

    const stopCycle = () => {
        if (cycleTimeoutId) {
            GLib.Source.remove(cycleTimeoutId);
            cycleTimeoutId = 0;
        }
        isCycling = false;
    };

    // Create event box with hover handling
    const eventBox = EventBox({
        className: `module-switcher ${className}`,
        css: css || 'min-width: 2rem;',
        onScrollUp: () => handleScroll('up'),
        onScrollDown: () => handleScroll('down'),
        child: stack,
        setup: (self) => {
            // Auto-start cycling if enabled
            if (autoCycle) startCycle();

            // Handle pause on hover
            if (pauseOnHover) {
                self.on('enter-notify-event', () => stopCycle());
                self.on('leave-notify-event', () => {
                    if (autoCycle) startCycle();
                });
            }

            // Cleanup on destroy
            self.on('destroy', () => stopCycle());
        },
    });

    // Expose control methods
    eventBox.jsx = {
        startCycle: () => {
            autoCycle = true;
            startCycle();
        },
        stopCycle: () => {
            autoCycle = false;
            stopCycle();
        },
        toggleCycle: () => {
            autoCycle = !autoCycle;
            autoCycle ? startCycle() : stopCycle();
        },
        setCycleInterval: (newInterval) => {
            cycleInterval = newInterval;
            if (isCycling) {
                stopCycle();
                startCycle();
            }
        },
    };

    return eventBox;
};