// @ts-check

const fs = require("node:fs");
const path = require("node:path");

const buildPath = path.join(process.cwd(), "/build/");

if (fs.existsSync(buildPath)) {
    fs.rmSync(buildPath, { recursive: true });
}
