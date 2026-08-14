import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const site = fileURLToPath(new URL("../site/", import.meta.url));

await rm(site, { recursive: true, force: true });
await mkdir(site, { recursive: true });
await cp(`${projectRoot}playground`, site, { recursive: true });
await cp(`${projectRoot}dist`, `${site}/lib`, { recursive: true });
await cp(`${projectRoot}examples/anonymous-family.json`, `${site}/example.json`);
