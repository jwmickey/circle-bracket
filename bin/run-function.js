const funcName = process.argv[2];

async function runner() {
    try {
        const sanitized = funcName.replace('..', '').replace('/', '');
        const func = require(`../functions/${sanitized}.js`);
        const result = await func.handler();
        console.log(JSON.stringify(result, null, 2));
    } catch (err) {
        console.error(err);
        exit(1);
    }
}

runner();