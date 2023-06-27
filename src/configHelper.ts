import * as fs from "node:fs";
import * as path from "node:path";

const configPath = path.join(process.cwd(), "/config/config.json");

export class ConfigHelper {
    private __config: WMCASHEDenoProxy.Config = {
        numberOfWorkers: 3,

        port: 8888,
        timeout: 10000,

        certificate: {},

        proxyServer: {
            http: "http://127.0.0.1:7890",
            https: "http://127.0.0.1:7890",
        },
    };

    constructor(configOptions?: WMCASHEDenoProxy.ConfigOptions) {
        if (fs.existsSync(configPath)) {
            const options = JSON.parse(fs.readFileSync(configPath, "utf-8"));
            this.setConfig(options);
        }
        if (configOptions) {
            this.setConfig(configOptions);
        }
    }

    get config() {
        return this.__config;
    }

    setConfig(configOptions: WMCASHEDenoProxy.ConfigOptions) {
        const { numberOfWorkers, port, timeout, certificate, proxyServer } = configOptions;
        numberOfWorkers !== undefined && (this.__config.numberOfWorkers = numberOfWorkers);
        port !== undefined && (this.__config.port = port);
        timeout !== undefined && (this.__config.timeout = timeout);
        certificate !== undefined && (this.__config.certificate = certificate);
        proxyServer !== undefined && (this.__config.proxyServer = proxyServer);
    }
}
