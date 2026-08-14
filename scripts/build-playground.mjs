import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const site = fileURLToPath(new URL("../site/", import.meta.url));
const packageMetadata = JSON.parse(await readFile(`${projectRoot}package.json`, "utf8"));
const assetVersion = packageMetadata.version;

await rm(site, { recursive: true, force: true });
await mkdir(site, { recursive: true });
await cp(`${projectRoot}playground`, site, { recursive: true });
await cp(`${projectRoot}dist`, `${site}/lib/${assetVersion}`, { recursive: true });
await cp(`${projectRoot}examples/anonymous-family.json`, `${site}/example.json`);

const appPath = `${site}/app.js`;
const appSource = await readFile(appPath, "utf8");
await writeFile(appPath, appSource.replace("./lib/index.js", `./lib/${assetVersion}/index.js`));

const indexPath = `${site}/index.html`;
const indexSource = await readFile(indexPath, "utf8");
await writeFile(indexPath, indexSource.replace("./app.js", `./app.js?v=${assetVersion}`));
