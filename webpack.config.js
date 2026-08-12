import path from "path";
import { fileURLToPath } from "url";
import cablesBuildConfig from "./src/webpack/webpack.config.js";

const args = process.argv.slice(2);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default () =>
{
    const patchFile = path.resolve(args[0]);
    let targetDir = args[1] || path.join(__dirname, "build");
    targetDir = path.resolve(targetDir);
    const buildConfig = cablesBuildConfig({
        "mode": "development",
        "entry": patchFile,
        "output": {
            "path": targetDir
        },
        "options": {

        }
    });
    return buildConfig;
};
