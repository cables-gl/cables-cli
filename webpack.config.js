import path from "path";
import { fileURLToPath } from "url";
import cablesBuildConfig from "./src/webpack/webpack.config.js";

const args = process.argv.slice(2);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default () =>
{
    const patchFile = args[0] ? path.resolve(args[0]) : path.join(__dirname, "dino/tick_tock.cables");
    let targetDir = args[1] || path.join(__dirname, "build");
    targetDir = path.resolve(targetDir);
    const buildConfig = cablesBuildConfig({
        "test": "kram",
        "mode": "development",
        "entry": patchFile,
        "output": {
            "path": targetDir
        },
        "options": {
            "index": true
        }
    });
    return buildConfig;
};
