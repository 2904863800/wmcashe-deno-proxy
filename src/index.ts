import "./@types";

import * as path from "node:path";
import cluster, { Worker } from "node:cluster";
import { ConfigHelper } from "./configHelper";

export function bootstrap() {
    const workers: {
        [id: number]: {
            worker: Worker;
            workerName: string;
        };
    } = {};
    cluster.on("disconnect", (worker) => {
        console.log(`worker ${workers[worker.id].workerName} disconnect`);
    });
    cluster.on("exit", (worker, code, signal) => {
        console.log(
            `worker ${workers[worker.id].workerName} exit with signal ${signal} code ${code}`,
        );
    });
    const configHelper = new ConfigHelper();
    const workerPath = path.resolve(__dirname, "./bootstrapWorker.js");
    const numberOfWorkers = configHelper.config.numberOfWorkers;
    for (let i = 0; i < numberOfWorkers; i++) {
        const workerName = `web_${i}`;
        cluster.setupPrimary({
            silent: false,
            exec: workerPath,
        });
        const worker = cluster.fork({ name: workerName });
        workers[worker.id] = {
            worker,
            workerName,
        };
    }
    console.log(`[master]: proxy server running...`);
}
