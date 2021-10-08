const fs = require('fs');

class Storage {
    constructor(filename) {
        if (!filename) throw new Error('Storage filename is require');
        this.data = {};
        this._filename = filename;
        this._change = false;
        if (fs.existsSync(filename)) this.data = JSON.parse(fs.readFileSync(filename).toString());
    }

    set(key, value) {
        if (value === this.data[key]) return;
        this.data[key] = value;
        this._change = true;
    }

    delete(key) {
        delete this.data[key];
        this._change = true;
    }

    get(key) {
        return this.data[key];
    }

    has(key) {
        return key in this.data;
    }

    save() {
        if (this._change) fs.writeFileSync(this._filename, JSON.stringify(this.data));
    }
}

module.exports = {Storage};
