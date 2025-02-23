import Widget from 'resource:///com/github/Aylur/ags/widget.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { Box, Button, Label, Revealer, Entry, Scrollable } = Widget;
import { MaterialIcon } from '../../.commonwidgets/materialicon.js';
import { TabContainer } from '../../.commonwidgets/tabcontainer.js';
import NoteService from "../../../services/notes.js"; // Import the NoteService
import { setupCursorHover } from '../../.widgetutils/cursorhover.js';
const NoteListItem = (noteName, id) => {
    const noteLabel = Widget.Label({
        hexpand: true,
        xalign: 0,
        wrap: true,
        className: 'txt txt-small sidebar-note-txt',
        label: noteName,
        selectable: true,
    });

    const actions = Box({
        hpack: 'end',
        className: 'spacing-h-5 sidebar-note-actions',
        children: [
            Widget.Button({ // Edit Note
                vpack: 'center',
                className: 'txt sidebar-note-item-action',
                child: MaterialIcon('edit', 'norm', { vpack: 'center' }),
                onClicked: () => {
                    // Open an editor for the note (you can implement this)
                    console.log(`Edit note: ${noteName}`);
                },
                setup: setupCursorHover,
            }),
            Widget.Button({ // Remove Note
                vpack: 'center',
                className: 'txt sidebar-note-item-action',
                child: MaterialIcon('delete_forever', 'norm', { vpack: 'center' }),
                onClicked: () => {
                    NoteService.removeNote(noteName);
                },
                setup: setupCursorHover,
            }),
        ]
    });

    const noteContent = Widget.Box({
        className: 'sidebar-note-item spacing-h-5',
        children: [
            noteLabel,
            actions,
        ]
    });

    const widgetRevealer = Widget.Revealer({
        revealChild: true,
        transition: 'slide_down',
        transitionDuration: userOptions.asyncGet().animations.durationLarge,
        child: noteContent,
    });

    return Box({
        homogeneous: true,
        children: [widgetRevealer]
    });
};

const noteItems = () => Widget.Scrollable({
    hscroll: 'never',
    vscroll: 'automatic',
    child: Widget.Box({
        vertical: true,
        className: 'spacing-v-5',
        setup: (self) => self
            .hook(NoteService, (self) => {
                const notes = NoteService.notes_list || [];
                self.children = notes.map((note, i) => NoteListItem(note, i));
                if (self.children.length === 0) {
                    self.homogeneous = true;
                    self.children = [
                        Widget.Box({
                            hexpand: true,
                            vertical: true,
                            vpack: 'center',
                            className: 'txt txt-subtext',
                            children: [
                                MaterialIcon('note_add', 'gigantic'),
                                Label({ label: getString('No notes yet!') })
                            ]
                        })
                    ];
                } else {
                    self.homogeneous = false;
                }
            }, 'updated')
    }),
    setup: (listContents) => {
        const vScrollbar = listContents.get_vscrollbar();
        vScrollbar.get_style_context().add_class('sidebar-scrollbar');
    }
});

const NewNoteButton = () => {
    const newNoteButton = Revealer({
        transition: 'slide_left',
        transitionDuration: userOptions.asyncGet().animations.durationLarge,
        revealChild: true,
        child: Button({
            className: 'txt-small sidebar-note-new',
            halign: 'end',
            vpack: 'center',
            label: getString('+ New note'),
            setup: setupCursorHover,
            onClicked: (self) => {
                newNoteButton.revealChild = false;
                newNoteEntryRevealer.revealChild = true;
                confirmAddNote.revealChild = true;
                cancelAddNote.revealChild = true;
                newNoteEntry.grab_focus();
            }
        })
    });

    const cancelAddNote = Revealer({
        transition: 'slide_right',
        transitionDuration: userOptions.asyncGet().animations.durationLarge,
        revealChild: false,
        child: Button({
            className: 'txt-norm icon-material sidebar-note-add',
            halign: 'end',
            vpack: 'center',
            label: 'close',
            setup: setupCursorHover,
            onClicked: (self) => {
                newNoteEntryRevealer.revealChild = false;
                confirmAddNote.revealChild = false;
                cancelAddNote.revealChild = false;
                newNoteButton.revealChild = true;
                newNoteEntry.text = '';
            }
        })
    });

    const newNoteEntry = Entry({
        vpack: 'center',
        className: 'txt-small sidebar-note-entry',
        placeholderText: getString('Add a note...'),
        onAccept: ({ text }) => {
            if (text === '') return;
            NoteService.addNote(text, ''); // Add a new note with empty content
            newNoteEntry.text = '';
        },
        onChange: ({ text }) => confirmAddNote.child.toggleClassName('sidebar-note-add-available', text !== ''),
    });

    const newNoteEntryRevealer = Revealer({
        transition: 'slide_right',
        transitionDuration: userOptions.asyncGet().animations.durationLarge,
        revealChild: false,
        child: newNoteEntry,
    });

    const confirmAddNote = Revealer({
        transition: 'slide_right',
        transitionDuration: userOptions.asyncGet().animations.durationLarge,
        revealChild: false,
        child: Button({
            className: 'txt-norm icon-material sidebar-note-add',
            halign: 'end',
            vpack: 'center',
            label: 'arrow_upward',
            setup: setupCursorHover,
            onClicked: (self) => {
                if (newNoteEntry.text === '') return;
                NoteService.addNote(newNoteEntry.text, ''); // Add a new note with empty content
                newNoteEntry.text = '';
            }
        })
    });

    return Box({
        vertical: true,
        className: 'spacing-v-5',
        setup: (box) => {
            box.pack_start(noteItems(), true, true, 0);
            box.pack_start(Box({
                setup: (self) => {
                    self.pack_start(cancelAddNote, false, false, 0);
                    self.pack_start(newNoteEntryRevealer, true, true, 0);
                    self.pack_start(confirmAddNote, false, false, 0);
                    self.pack_start(newNoteButton, false, false, 0);
                }
            }), false, false, 0);
        },
    });
};

export const NoteWidget = () => TabContainer({
    icons: ['note', 'notes'],
    names: [getString('Notes'), getString('All Notes')],
    children: [
        NewNoteButton(),
        noteItems(),
    ]
});