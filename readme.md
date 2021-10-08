# 1. support

support platform
- nodejs(√)
- browser(×)
- deno(×)

not support multi ```Manager``` in script

# 2. usage

```javascript
const {Consumer, Manager, producer} = require('microjobs');

class MyConsumer extends Consumer{
    async working(job) {
        //todo define how to duel with the job
    }
}

(async () => {
    const manager = new Manager(__filename);
    [...Array(3)].forEach(()=>{
        const consumer = new MyConsumer({
            maxCombo: 10,
        });
        manager.addConsumer(consumer);
    });
    //you can write your generator to get jobs, and save the status by your own
    const generator = await producer.fileTextProducerGenerator(
        manager.storage, 
        '/path/to/job.txt', 
        (line, index) => JSON.parse(line)//define how to parse from line
    );
    manager.addProducer(generator);
    //manager.addJob('4');
    manager.run();
})();
```

which ```/path/to/job.txt``` looks like:

```
{"id":"2"}
{"id":"7"}
```

# 3. about job object

- id: to identify a job
- retry: to let you know how much times this job has been run
