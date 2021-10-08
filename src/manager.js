const path = require('path');
const readline = require('readline');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const strategy = require('./strategy');
const {Storage} = require('./storage');

const dirname = path.resolve(os.homedir(), '.microjobs');
if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname);
}

class Manager {
    constructor(scriptPath, options) {
        if (!path.isAbsolute(scriptPath)) {
            throw new Error('absolute scriptPath is need');
        }
        this.scriptPath = scriptPath;
        this._hash = crypto.createHash('sha256').update(scriptPath).digest().toString('hex');
        this._backupFilename = path.resolve(dirname, this._hash + '.jobs.txt');
        this._options = this._makeOptions(options);
        this._standby = [];
        this._backup = new Map();
        this._cancelIds = new Set();
        this._consumers = new Set();
        this._producer = null;
        this._producerFinish = true;
        this._storage = null;
    }

    get storage() {
        if (this._storage) return this._storage;
        this._storage = new Storage(path.resolve(dirname, this._hash + '.storage.json'));
        return this._storage;
    }

    _makeOptions(options = {}) {
        const defaultOptions = {
            loadBackupJob: true,
            loadBackupJobWithRetry: true,
            watchSleep: 60000,
            consumerEmptyRun: strategy.consumerEmptyRunContinueWithSleep(5000),
        };
        return {...defaultOptions, ...options}
    }

    async fetchJob() {
        let job = this._standby.shift();
        if (!job && this._producer) {
            const next = await this._producer.next();
            job = next.value;
            this._producerFinish = next.done;
        }
        if (job) this._backup.set(job.id, job);
        return job;
    }

    doneJob(id) {
        this._backup.delete(id);
    }

    addProducer(generator) {
        if ('function' !== typeof generator.next) return false;
        this._producerFinish = false;
        this._producer = generator;
        return true;
    }

    addJob(id, data = {}) {
        if (this.checkCancel(id)) return;
        data.id = id;
        if ('number' === typeof data.retry) data.retry++;
        else data.retry = 0;
        this._standby.push(data);
        this._backup.set(id, data);
    }

    cancelJob(id) {
        this._backup.delete(id);
        this._cancelIds.add(id);
    }

    checkCancel(id) {
        return this._cancelIds.delete(id);
    }

    addConsumer(consumer) {
        this._consumers.add(consumer);
        consumer.$linkManager(this);
    }

    removeConsumer(consumer) {
        consumer.stop();
        this._consumers.delete(consumer);
    }

    exit() {
        if (this._options.loadBackupJob) this._saveBackupJob();
        if (this._storage) this.storage.save();
        process.exit(0);
    }

    async _watch() {
        while (true) {
            await new Promise(resolve => setTimeout(resolve, this._options.watchSleep));
            if (this._producerFinish && this._backup.size <= 0) this.exit();
            if (this._consumers.size <= 0) {
                console.warn('consumer size turn to zero');
                this.exit();
            }
        }
    }

    _saveBackupJob() {
        fs.writeFileSync(this._backupFilename, '');
        this._backup.forEach(v => {
            fs.writeFileSync(this._backupFilename, JSON.stringify(v) + '\n', {flag: 'a'});
        });
    }

    async _loadBackupJob() {
        if (fs.existsSync(this._backupFilename)) return new Promise(resolve => {
            const rl = readline.createInterface({
                input: fs.createReadStream(this._backupFilename)
            });
            rl.on('line', (line) => {
                line = line.trim();
                if (!line) return;
                const data = JSON.parse(line);
                if ('object' !== typeof data) return;
                if (!this._options.loadBackupJobWithRetry) data.retry = -1;
                this.addJob(data.id, data);
            });
            rl.on('close', resolve);
        })
    }

    async run() {
        process.on('SIGINT', () => this.exit());
        process.on('uncaughtException', (err) => {
            console.error('uncaughtException', err);
            this.exit();
        });
        if (this._options.loadBackupJob) await this._loadBackupJob();
        this._consumers.forEach(consumer => {
            consumer.run();
        });
        this._watch();
    }
}

module.exports = {Manager};
