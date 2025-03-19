import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import Quotes from '../../../services/quotes.js';

const { Box, Label, EventBox } = Widget;

// Update interval: 3 hours in milliseconds
const UPDATE_INTERVAL = 3 * 60 * 60 * 1000;

const QuoteWidget = () => {
    // Create widget with initial content
    const label = Label({
        className: 'txt-small onSurfaceVariant',
        label: 'Loading quote...',
        justification: 'left',
        wrap: true,
        // truncate: 'end',
        wrapMode: 'word',  // Wrap at word boundaries
        widthChars: 35,    // Force width to roughly 10rem
        maxWidthChars: 50, // Maximum width in characters
    });

    // Create the main widget
    const widget = EventBox({
        onPrimaryClick: () => {
            label.label = 'Loading...';
            Quotes.fetch();
        },
        child: Box({
            className: 'spacing-h-5',
            hexpand: false,
            vexpand: true,
            children: [label],
        }),
    });

    // Update label when service changes
    const updateLabel = () => {
        if (Quotes.loading) {
            label.label = 'Loading...';
            return;
        }

        if (!Quotes.content || !Quotes.author) {
            label.label = 'Click to retry';
            return;
        }

        label.label = `"${Quotes.content}" —${Quotes.author}`;
    };

    // Connect to service changes
    widget.hook(Quotes, updateLabel);

    // Set up polling
    widget.poll(UPDATE_INTERVAL, () => {
        Quotes.fetch();
    });

    return widget;
};

// Export a function that returns the widget
export default () => QuoteWidget();
