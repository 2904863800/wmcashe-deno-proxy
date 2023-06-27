import * as fs from "node:fs";
import * as path from "node:path";
import * as util from "node:util";
import * as tls from "node:tls";
import * as http from "node:http";
import * as https from "node:https";
import fetch, { Headers } from "node-fetch";
import { HttpProxyAgent } from "http-proxy-agent";
import { HttpsProxyAgent } from "https-proxy-agent";
import { ConfigHelper } from "./configHelper";

const certificateRootPath = path.join(process.cwd(), "certificates");

const PROXY_DOMAIN = ["deno.com", "deno.land", "esm.sh", "esm.instatus.com"];

export class Server {
    private __configHelper: ConfigHelper;
    private __httpAgent!: HttpProxyAgent<string>;
    private __httpsAgent!: HttpsProxyAgent<string>;
    private __certificateMap = new Map<string, tls.SecureContext | undefined>();

    constructor(configOptions?: WMCASHEDenoProxy.ConfigOptions) {
        this.__configHelper = new ConfigHelper(configOptions);
        this.getCertificates();
    }

    getCertificateInfo(domain: string) {
        const info = this.config.certificate[domain];
        let certificateInfo: WMCASHEDenoProxy.CertificateInfo | undefined = undefined;
        if (info) {
            const { keyPath, certificatePath } = info;
            const fullKeypPath = path.join(certificateRootPath, keyPath);
            const fullCertificatePath = path.join(certificateRootPath, certificatePath);
            if (fs.existsSync(fullKeypPath) && fs.existsSync(fullCertificatePath)) {
                certificateInfo = {
                    key: fs.readFileSync(fullKeypPath),
                    cert: fs.readFileSync(fullCertificatePath),
                };
            }
        }
        return certificateInfo;
    }

    getCertificates() {
        const { certificate } = this.__configHelper.config;
        for (const domain in certificate) {
            const certificate = this.getCertificateInfo(domain);
            let certificateInfo: tls.SecureContext | undefined = undefined;
            if (certificate) {
                certificateInfo = tls.createSecureContext({
                    key: certificate.key.toString("utf-8"),
                    cert: certificate.cert.toString("utf-8"),
                });
            }
            this.__certificateMap.set(domain, certificateInfo);
        }
    }

    get config() {
        return this.__configHelper.config;
    }

    get httpAgent() {
        if (!this.__httpAgent) {
            this.__httpAgent = new HttpProxyAgent(this.__configHelper.config.proxyServer.http);
        }
        return this.__httpAgent;
    }

    get httpsAgent() {
        if (!this.__httpsAgent) {
            this.__httpsAgent = new HttpsProxyAgent(this.__configHelper.config.proxyServer.https);
        }
        return this.__httpsAgent;
    }

    getRespHeaders(host: string, fetchHeaders?: Headers) {
        const defaultHeaders: { [key: string]: string } = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "X-Rquested-With",
            "Access-Control-Allow-Methods": "PUT,POST,GET,DELETE,OPTIONS",
            "X-Powered-By": "3.2.1",
        };
        if (fetchHeaders) {
            for (const [key, value] of fetchHeaders) {
                if (key === "X-Content-Type-Options" || key === "x-content-type-options") {
                    continue;
                }
                if (key.includes("Content-Type") || key.includes("content-type")) {
                    defaultHeaders["Content-Type"] = value;
                }
                // 301/307 跳转
                if (key === "Location" || key === "location") {
                    if ((value as any) instanceof Array) {
                        defaultHeaders["Location"] = (value as unknown as string[]).map((item) => {
                            if (item.includes(host)) {
                                return item.slice(item.indexOf(host) + host.length);
                            } else {
                                return value;
                            }
                        }) as unknown as string;
                    } else {
                        if (value.includes(host)) {
                            defaultHeaders["Location"] = value.slice(
                                value.indexOf(host) + host.length,
                            );
                        } else {
                            defaultHeaders["Location"] = value;
                        }
                    }
                }
            }
        }
        if (
            defaultHeaders["Content-Type"] === undefined &&
            defaultHeaders["content-type"] === undefined
        ) {
            defaultHeaders["Content-Type"] = "text/html; charset=utf-8";
        }
        return defaultHeaders;
    }

    getReqHeaders(method: string, req: http.IncomingMessage) {
        const headers = {
            Method: method,
            Accept:
                req.headers.accept ||
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
            "Accept-Encoding": (req.headers["accept-encoding"] as string) || "gzip, deflate, br",
            "Accept-Language": req.headers["accept-language"] || "zh-CN,zh;q=0.9",
            "User-Agent":
                req.headers["user-agent"] ||
                "Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1",
        };
        return headers;
    }

    checkHost(host: string) {
        if (PROXY_DOMAIN.includes(host) === false) {
            throw new Error(`cannot handle request for ${host}`);
        }
    }

    getHttpHandler() {
        return async (
            req: http.IncomingMessage,
            res: http.ServerResponse<http.IncomingMessage> & {
                req: http.IncomingMessage;
            },
        ) => {
            const method = req.method || "GET";
            const host = req.headers.host as string;
            try {
                this.checkHost(host);
                const fetchResult = await fetch(`http://${host}${req.url}`, {
                    headers: this.getReqHeaders(method, req),
                    timeout: this.config.timeout,
                    agent: this.httpAgent,
                });
                let data = "";
                for await (const chunk of fetchResult.body) {
                    data += chunk.toString();
                }
                res.writeHead(fetchResult.status, this.getRespHeaders(host, fetchResult.headers));
                res.end(data);
            } catch (err: any) {
                console.error(err);
                res.writeHead(200, this.getRespHeaders(host));
                res.end(util.format(err));
            }
        };
    }

    getHttpsHandler() {
        return async (
            req: http.IncomingMessage,
            res: http.ServerResponse<http.IncomingMessage> & {
                req: http.IncomingMessage;
            },
        ) => {
            const method = req.method || "GET";
            const host = req.headers.host as string;
            try {
                this.checkHost(host);
                console.debug(`[${process.env["name"]}]: ${host}, ${method}, ${req.url}`);
                const fetchResult = await fetch(`https://${host}${req.url}`, {
                    headers: this.getReqHeaders(method, req),
                    timeout: this.config.timeout,
                    agent: this.httpsAgent,
                });
                let data = "";
                for await (const chunk of fetchResult.body) {
                    data += chunk.toString();
                }
                res.writeHead(fetchResult.status, this.getRespHeaders(host, fetchResult.headers));
                res.end(data);
            } catch (err: any) {
                console.error(err);
                res.writeHead(200, this.getRespHeaders(host));
                res.end(util.format(err));
            }
        };
    }

    runHttpServer() {
        const config = this.__configHelper.config;
        const server = http.createServer();
        server.on("error", (err) => {
            console.log(err);
        });
        server.on("request", this.getHttpHandler());
        server.listen(config.port);
        console.log(`[${process.env["name"]}]: http proxy server run with port ${config.port}`);
    }

    runHttpsServer() {
        const config = this.__configHelper.config;
        const certInfo = this.getCertificateInfo("deno.land");
        if (certInfo === undefined) {
            throw new Error(`must have a default key and cert with domain 'deno.land'`);
        }
        const options = {
            SNICallback: (domain: string, cb: Function) => {
                const certificateInfo = this.__certificateMap.get(domain);
                if (certificateInfo === undefined) {
                    const error = new Error(`no keys/certificates for domain ${domain} requested`);
                    if (cb) {
                        return cb(error);
                    }
                    return error;
                }
                if (cb) {
                    return cb(null, certificateInfo);
                }
                // compatibility for older versions of node
                return certificateInfo;
            },
            // must list a default key and cert because required by tls.createServer()
            key: certInfo.key,
            cert: certInfo.cert,
        };
        const server = https.createServer(options);
        server.on("error", (err) => {
            console.log(err);
        });
        server.on("request", this.getHttpsHandler());
        server.listen(config.port);
        console.log(`[${process.env["name"]}]: https proxy server run with port ${config.port}`);
    }

    run() {
        // this.runHttpServer();
        this.runHttpsServer();
    }
}
