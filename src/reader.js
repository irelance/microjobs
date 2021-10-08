async function signalEnd(reader) {
    return new Promise(resolve => {
        reader.once("end", resolve);
    });
}

async function signalReadable(reader) {
    return new Promise(resolve => {
        reader.once("readable", resolve);
    });
}

function streamToBinaryAsyncGenerator(reader, chunkSize) {
    return (async function* () {
        const endPromise = signalEnd(reader);
        while (!reader.readableEnded) {
            while (reader.readable) {
                let val = reader.read(chunkSize);
                if (val) yield val;
                else break;
            }
            const readablePromise = signalReadable(reader);
            await Promise.race([endPromise, readablePromise]);
        }
    })();
}

async function readUntilSplit(reader, left) {
    let next;
    while (true) {
        next = await reader.next();
        if (!next.value) break;
        left += next.value.toString();
        if (next.done) break;
        if (left.lastIndexOf('\n') >= 0) break;
    }
    return {value: left, done: next.done};
}

function streamToLineAsyncGenerator(reader, chunkSize = 1024) {
    return (async function* () {
        const bufferReader = streamToBinaryAsyncGenerator(reader, chunkSize);
        let left = '';
        let done = false;
        const lines = [];
        while (true) {
            if (lines.length <= 0 && !done) {
                const next = await readUntilSplit(bufferReader, left);
                done = next.done;
                const lastIndex = next.value.lastIndexOf('\n');
                left = next.value.substring(lastIndex + 1);
                next.value.substring(0, lastIndex).split('\n').forEach(i => lines.push(i));
            }
            if (done && lines.length <= 1) return lines.shift();
            yield lines.shift();
        }
    })();
}

module.exports = {streamToLineAsyncGenerator, streamToBinaryAsyncGenerator};
