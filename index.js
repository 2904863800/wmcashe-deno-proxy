// @ts-check

const { bootstrap } = require("./build/src");

(() => {
    try {
        bootstrap();
    } catch (error) {
        console.log(error);
    }
})();
