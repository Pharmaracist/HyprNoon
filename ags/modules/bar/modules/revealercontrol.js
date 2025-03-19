import Widget from "resource:///com/github/Aylur/ags/widget.js";
import { MaterialIcon } from "../../.commonwidgets/materialicon.js";
import Service from "resource:///com/github/Aylur/ags/service.js";
const { Box, Button } = Widget;

// Create a global state object to track revealer states
class RevealerStateService extends Service {
    static {
        Service.register(this, {}, {
            'revealed': ['boolean'], // Use property instead of signal
        });
    }

    _init() {
        super._init();
        this._isRevealed = false;
        this._revealers = new Map(); // Use Map to store cleanup handlers
    }

    get revealed() {
        return this._isRevealed;
    }

    set revealed(value) {
        if (this._isRevealed === value) return;
        this._isRevealed = value;
        this.notify('revealed');
        
        // Update all revealers
        for (const [revealer] of this._revealers) {
            if (revealer?.set_reveal_child) {
                try {
                    revealer.set_reveal_child(value);
                } catch (error) {
                    console.error('Error updating revealer:', error);
                }
            }
        }
    }

    // Register a revealer to be controlled
    register(revealer) {
        if (!revealer || this._revealers.has(revealer)) return revealer;

        // Set up destroy handler
        const destroyHandler = revealer.connect('destroy', () => {
            this.unregister(revealer);
        });

        this._revealers.set(revealer, destroyHandler);
        
        // Set initial state
        if (revealer.set_reveal_child) {
            try {
                revealer.set_reveal_child(this._isRevealed);
            } catch (error) {
                console.error('Error setting initial revealer state:', error);
            }
        }

        return revealer;
    }

    // Unregister a revealer
    unregister(revealer) {
        if (!revealer) return;

        const destroyHandler = this._revealers.get(revealer);
        if (destroyHandler) {
            try {
                revealer.disconnect(destroyHandler);
            } catch (error) {
                console.error('Error disconnecting revealer:', error);
            }
        }

        this._revealers.delete(revealer);
    }

    // Toggle all registered revealers
    toggleAll() {
        this.revealed = !this._isRevealed;
    }

    // Clean up on service destroy
    destroy() {
        for (const [revealer, handler] of this._revealers) {
            try {
                revealer.disconnect(handler);
            } catch (error) {
                console.error('Error cleaning up revealer:', error);
            }
        }
        this._revealers.clear();
        super.destroy();
    }
}

export const RevealerState = new RevealerStateService();

// Create the control button widget
const RevealerControl = () => Widget.Button({
    className: "revealer-control-button txt-norm",
    setup: self => {
        const icon = MaterialIcon('expand_more', 'norm');
        
        self.child = Widget.Box({
            children: [icon],
        });

        self.onClicked = () => RevealerState.toggleAll();

        // Use property binding
        const handler = RevealerState.connect('notify::revealed', () => {
            icon.icon = RevealerState.revealed ? 'expand_less' : 'expand_more';
        });

        self.connect('destroy', () => {
            RevealerState.disconnect(handler);
        });
    },
});

export default RevealerControl;
