class Consumer {
    constructor(options) {
        this._options = this._makeOptions(options);
        this._quit = false;
        this._manager = null;
        this._combo = 0;
    }

    _makeOptions(options = {}) {
        const defaultOptions = {
            maxCombo: 0,
        };
        return {...defaultOptions, ...options}
    }

    $linkManager(manager) {
        this._manager = manager;
    }

    async working(job) {
    }

    async run() {
        if (!this._manager) return;
        let job;
        while (true) {
            if (this._quit) {
                this._manager.removeConsumer(this);
                this._manager = null;
                break;
            }
            job = await this._manager.fetchJob();
            if (!job) {
                const result = await this._manager._options.consumerEmptyRun();
                if (result) continue;
                else break;
            }
            //lazy cancel
            if (this._manager.checkCancel(job.id)) continue;
            await this.working(job)
                .then(() => {
                    this._manager.doneJob(job.id);
                    this._combo = 0;
                }).catch(e => {
                    console.warn('Consumer run failed:', job.id, JSON.stringify(job), e.toString());
                    this._manager.addJob(job.id, job);
                    this._combo++;
                    if (this._options.maxCombo > 0 && this._combo > this._options.maxCombo) {
                        this.stop();
                    }
                })
        }
    }

    stop() {
        this._quit = true;
    }
}

module.exports = {Consumer};
