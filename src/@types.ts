declare namespace WMCASHEDenoProxy {
    type CertificateInfo = {
        key: Buffer;
        cert: Buffer;
    };
    type CertificatePathInfo = {
        keyPath: string;
        certificatePath: string;
    };

    interface Config {
        numberOfWorkers: number;

        port: number;
        timeout: number;

        certificate: {
            [domain: string]: CertificatePathInfo;
        };

        proxyServer: {
            http: string;
            https: string;
        };
    }

    type ConfigOptions = Partial<Config>;

    type HttpsServerOptions = {
        key?: Buffer;
        cert?: Buffer;
    };
}
