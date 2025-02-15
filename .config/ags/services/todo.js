const { Gio, GLib } = imports.gi;
import Service from 'resource:///com/github/Aylur/ags/service.js';
import * as Utils from 'resource:///com/github/Aylur/ags/utils.js';
const { exec, execAsync } = Utils;

class TodoService extends Service {
    static {
        Service.register(
            this,
            { 'updated': [], },
        );
    }

    _todoPath = '';
    _todoJson = [];

    refresh(value) {
        this.emit('updated', value);
    }

    connectWidget(widget, callback) {
        this.connect(widget, callback, 'updated');
    }

    get todo_json() {
        return this._todoJson;
    }

    _save() {
        Utils.writeFile(JSON.stringify(this._todoJson), this._todoPath)
            .catch(print);
    }

    add(content) {
        this._todoJson.push({ content, done: false });
        this._save();
        this.emit('updated');
    }

    check(index) {
        this._todoJson[index].done = true;
        this._save();
        this.emit('updated');
    }

    uncheck(index) {
        this._todoJson[index].done = false;
        this._save();
        this.emit('updated');
    }

    remove(index) {
        this._todoJson.splice(index, 1);
        Utils.writeFile(JSON.stringify(this._todoJson), this._todoPath)
            .catch(print);
        this.emit('updated');
    }

    constructor() {
        super();
        this._todoPath = `${GLib.get_user_state_dir()}/ags/user/todo.json`;
        
        // Ensure directory exists
        const dirPath = `${GLib.get_user_state_dir()}/ags/user`;
        if (!GLib.file_test(dirPath, GLib.FileTest.EXISTS)) {
            Utils.exec(`mkdir -p '${dirPath}'`);
        }
        
        // Initialize with empty array
        this._todoJson = [];
        
        // Try to read existing file
        try {
            if (GLib.file_test(this._todoPath, GLib.FileTest.EXISTS)) {
                const fileContents = Utils.readFile(this._todoPath);
                const parsed = JSON.parse(fileContents);
                if (Array.isArray(parsed)) {
                    this._todoJson = parsed;
                }
            }
        } catch (error) {
            console.error('Error reading todo file:', error);
        }
        
        // Ensure file exists with valid content
        if (!GLib.file_test(this._todoPath, GLib.FileTest.EXISTS)) {
            Utils.writeFile(JSON.stringify(this._todoJson), this._todoPath)
                .catch(error => console.error('Error writing todo file:', error));
        }
    }
}

// the singleton instance
const service = new TodoService();

// make it global for easy use with cli
globalThis.todo = service;

// export to use in other modules
export default service;