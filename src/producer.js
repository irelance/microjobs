const fs = require('fs');
const {streamToLineAsyncGenerator} = require('./reader');

async function fileTextProducerGenerator(storage, filename, lineToJob) {
    let change = storage.get('filename') !== filename;
    const mtime = fs.statSync(filename).mtime.getTime();
    if (!change) change = mtime !== storage.get('mtime');
    storage.set('filename', filename);
    storage.set('mtime', mtime);
    if (change) storage.set('line', 0);
    const generator = (async function* () {
        const reader = fs.createReadStream(filename);
        const g = streamToLineAsyncGenerator(reader);
        let next;
        let i = -1;
        while (next = await g.next()) {
            i++;
            storage.set('line', i);
            const line = next.value.trim();
            if (next.done) {
                if (!line) return;
                return lineToJob(line, i);
            } else {
                if (!line) continue;
                yield lineToJob(line, i);
            }
        }
        reader.close();
    })();
    const skip = storage.get('line') || 0;
    for (let i = 0; i < skip; i++) {
        await generator.next();
        //wait for gc
        if (499 === i % 500) await new Promise(resolve => setTimeout(resolve));
    }
    return generator;
}

module.exports = {fileTextProducerGenerator};
