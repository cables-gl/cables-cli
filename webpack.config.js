import path from "path";
import { BundleAnalyzerPlugin } from "webpack-bundle-analyzer";
import { fileURLToPath } from "url";
import cablesBuildConfig from "./src/webpack/webpack.config.js";

export default () =>
{
    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const buildConfig = cablesBuildConfig({
        "mode": "production",
        "entry": "./c64",
        "output": {
            "path": path.resolve("./c64_build"),
        },
        "options": {
            "minify": false,
            "combinejs": false,
            "index": false,
            "analyze": {
                "path": "./reports"
            },
            "coreDir": "/Users/stephan/Projects/undev/cables/cables_dev/cables/",
            "devDir": "/Users/stephan/Projects/undev/cables/cables_dev/"
        },
        "plugins": {
            // "core": [new BundleAnalyzerPlugin({ "analyzerMode": "static", "openAnalyzer": false, "reportTitle": "cables core", "reportFilename": path.join(__dirname, "reports", "report_core.html") })],
            // "ops": [new BundleAnalyzerPlugin({ "analyzerMode": "static", "openAnalyzer": false, "reportTitle": "cables ops", "reportFilename": path.join(__dirname, "reports", "report_ops.html") })],
            // "assets": [new BundleAnalyzerPlugin({ "analyzerMode": "static", "openAnalyzer": false, "reportTitle": "cables assets", "reportFilename": path.join(__dirname, "reports", "report_assets.html") })],
            // "combine": [new BundleAnalyzerPlugin({ "analyzerMode": "static", "openAnalyzer": false, "reportTitle": "cables combined", "reportFilename": path.join(__dirname, "reports", "report_combine.html"), "bundleDir": "/Users/stephan/Projects/undev/cables/cables-cli/build/js" })],
            // "dependencies": [new BundleAnalyzerPlugin({ "analyzerMode": "static", "openAnalyzer": false, "reportTitle": "cables dependencies", "reportFilename": path.join(__dirname, "reports", "report_dependencies.html") })],
            // "files": [new BundleAnalyzerPlugin({ "analyzerMode": "static", "openAnalyzer": false, "reportTitle": "cables files", "reportFilename": path.join(__dirname, "reports", "report_files.html") })],
            // "html": [new BundleAnalyzerPlugin({ "analyzerMode": "static", "openAnalyzer": false, "reportTitle": "cables html", "reportFilename": path.join(__dirname, "reports", "report_html.html") })],
            // "patchjson": [new BundleAnalyzerPlugin({ "analyzerMode": "static", "openAnalyzer": false, "reportTitle": "cables json", "reportFilename": path.join(__dirname, "reports", "report_json.html") })],
            // "minify": [new BundleAnalyzerPlugin({ "analyzerMode": "static", "openAnalyzer": false, "reportTitle": "cables minify", "reportFilename": path.join(__dirname, "reports", "report_minify.html") })],
        },
        "overrides": {
            "core": {
                "mode": "production"
            },
            "ops": {},
            "assets": {},
            "combine": {},
            "dependencies": {},
            "files": {},
            "html": {},
            "patchjson": {},
            "minify": {}
        }
    });
    return buildConfig;
};
