const { Gio, GLib } = imports.gi;
import Service from 'resource:///com/github/Aylur/ags/service.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { exec, execAsync } = Utils;

class NoteService extends Service {
    static {
        Service.register(
            this,
            {
                'updated': [], // Emitted when notes are updated
                'note-added': ['string'], // Emitted when a new note is added
                'note-removed': ['string'], // Emitted when a note is removed
                'note-edited': ['string'], // Emitted when a note is edited
            },
        );
    }

    _notesDir = ''; // Directory to store notes
    _notesList = []; // List of note filenames

    refresh() {
        this.emit('updated');
    }

    connectWidget(widget, callback, signal = 'updated') {
        this.connect(widget, callback, signal);
    }

    get notes_list() {
        return this._notesList;
    }

    // Get the content of a specific note
    getNoteContent(filename) {
        const filePath = `${this._notesDir}/${filename}`;
        try {
            return Utils.readFile(filePath);
        } catch (error) {
            console.error(`Error reading note ${filename}:`, error);
            return '';
        }
    }

    // Add a new note
    addNote(filename, content = '') {
        const filePath = `${this._notesDir}/${filename}.md`;
        if (this._notesList.includes(`${filename}.md`)) {
            console.error(`Note "${filename}.md" already exists.`);
            return;
        }
        Utils.writeFile(content, filePath)
            .then(() => {
                this._notesList.push(`${filename}.md`);
                this.emit('note-added', `${filename}.md`);
                this.emit('updated');
            })
            .catch(error => console.error(`Error creating note ${filename}:`, error));
    }

    // Edit an existing note
    editNote(filename, newContent) {
        const filePath = `${this._notesDir}/${filename}`;
        if (!this._notesList.includes(filename)) {
            console.error(`Note "${filename}" does not exist.`);
            return;
        }
        Utils.writeFile(newContent, filePath)
            .then(() => {
                this.emit('note-edited', filename);
                this.emit('updated');
            })
            .catch(error => console.error(`Error editing note ${filename}:`, error));
    }

    // Remove a note
    removeNote(filename) {
        const filePath = `${this._notesDir}/${filename}`;
        if (!this._notesList.includes(filename)) {
            console.error(`Note "${filename}" does not exist.`);
            return;
        }
        Utils.exec(`rm ${filePath}`)
            .then(() => {
                this._notesList = this._notesList.filter(note => note !== filename);
                this.emit('note-removed', filename);
                this.emit('updated');
            })
            .catch(error => console.error(`Error removing note ${filename}:`, error));
    }

    // List all notes in the directory
    _listNotes() {
        try {
            const files = Utils.exec(`ls ${this._notesDir}`).split('\n');
            this._notesList = files.filter(file => file.endsWith('.md'));
        } catch (error) {
            console.error('Error listing notes:', error);
            this._notesList = [];
        }
    }

    constructor() {
        super();
        this._notesDir = userOptions.asyncGet().etc.notesPath || `${GLib.get_user_state_dir()}/ags/user`;
        // Ensure the notes directory exists
        Utils.exec(`mkdir -p ${this._notesDir}`)
            .then(() => {
                this._listNotes(); // Populate the notes list
            })
            .catch(error => console.error('Error creating notes directory:', error));
    }
}

// The singleton instance
const service = new NoteService();

// Make it global for easy use with cli
globalThis.notes = service;

// Export to use in other modules
export default service;