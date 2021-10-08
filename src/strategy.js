function consumerEmptyRunContinueWithSleep(timeout) {
    return async function () {
        await new Promise(resolve => setTimeout(resolve, timeout + Math.random() * timeout));
        return true;
    }
}

function consumerEmptyRunQuit() {
    return false;
}

module.exports = {consumerEmptyRunContinueWithSleep, consumerEmptyRunQuit};
