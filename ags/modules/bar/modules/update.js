import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { Box, Revealer, Label, Button } = Widget;
const { GLib } = imports.gi;

const UPDATE_CHECK_INTERVAL = 3600;

const UpdateService = class UpdateService extends Service {
    static {
        Service.register(this, {
            'updates-available': ['int'], // Signal now properly declares argument
        },
        {
            'count': ['int', 'r'],
        });
    }

    _count = 0;

    get count() { return this._count; }

    constructor() {
        super();
        this._checkUpdates().catch(console.error);
        GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, UPDATE_CHECK_INTERVAL, () => {
            this._checkUpdates().catch(console.error);
            return true;
        });
    }

    async _checkUpdates() {
        try {
            const output = await Utils.execAsync(['checkupdates'])
                .catch(err => {
                    // Log the error to inspect its structure
                    console.error('Error during update check:', err);

                    // Handle "no updates" scenario properly
                    if (err && err.message && err.message.includes('exit status 1')) {
                        return '';
                    }
                    throw err;
                });

            this._count = output.split('\n').filter(line => line.trim()).length;
        } catch (error) {
            console.error('Update check failed:', error);
            this._count = 0;
        }
        this.emit('updates-available', this._count); // Pass count as argument
        this.notify('count');
    }
};

const updateService = new UpdateService();
export default Box({
    className: "group-saadi-short",
    visible: updateService.bind('count').transform(c => c > 0),
    children: [
        Button({
            className: 'icon-button',
            child: Label({
                className: 'icon-material onSurfaceVariant txt-larger',
                label: 'download',
            }),
            onClicked: self => {
                self.parent.children[1].revealChild = !self.parent.children[1].revealChild;
            },
        }),
        Revealer({
            transition: 'slide_left',
            transitionDuration: userOptions.asyncGet().animations.durationLarge || 200,
            revealChild: false,
            child: Label({
                className: 'bar-time',
                css: 'margin:0 0.8rem 0 0.8rem;font-size:1.2rem',
                label: updateService.bind('count').transform(c => `${c} updates`),
            }),
        }),
    ],
});
