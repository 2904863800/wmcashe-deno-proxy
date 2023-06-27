import { Server } from "./server";

(async () => {
    try {
        const server = new Server();
        server.run();
    } catch (error) {
        console.log(error);
    }
})();
