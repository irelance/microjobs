const {Manager} = require('./src/manager');
const {Consumer} = require('./src/consumer');
const {Storage} = require('./src/storage');
const strategy = require('./src/strategy');
const reader = require('./src/reader');
const producer = require('./src/producer');


module.exports = {Manager, Consumer, Storage, strategy, reader, producer};
