// @ts-check

const fs = require("node:fs");
const path = require("node:path");
const { listAllFile } = require("@wmcashe/devkits");

const targetPath = path.join(process.cwd(), "/src");
const tsconfigPath = path.join(process.cwd(), "/src/tsconfig.json");

const fileList = listAllFile(targetPath, true, ["ts"]);

const tsconfigJson = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));

tsconfigJson.files = fileList;

fs.writeFileSync(tsconfigPath, JSON.stringify(tsconfigJson, null, 4));
