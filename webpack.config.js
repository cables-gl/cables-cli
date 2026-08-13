import path from "path";
import cablesBuildConfig from "./src/webpack/webpack.config.js";

export default () =>
{
    const buildConfig = cablesBuildConfig({
        "mode": "development",
        "entry": path.resolve("./schwarz/schwarz_city_circle.cables"),
        "output": {
            "path": path.resolve("./build"),
        },
        "options": {
            "minify": false,
            "combinejs": true,
            "index": false
        }
    });
    return buildConfig;
};
