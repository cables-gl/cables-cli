import { CablesModule } from "./module.js";
import { Cables } from "../index.js";
import webpackConfig from "./webpack/webpack.config.js";
import jsonfile from "jsonfile";
import webpack from "webpack";
import path from "path";
import process from "process";
import fs from "fs";

/** @typedef {import("./module.js").ModuleOptions} ModuleOptions */
/** @typedef {import("./module.js").ModuleRunResult} ModuleRunResult */
/** @typedef {ModuleOptions & BuildOptionsData} BuildModuleOptions */

/** @typedef {ModuleRunResult} BuildModuleRunResult  */

/**
 * @typedef {object} BuildOptionsData
 * @property {string} file
 */

/**
 * @typedef CablesBuildOptions
 * @property {string} buildMode
 * @property {boolean} combinejs
 * @property {boolean} flat
 * @property {boolean} minify
 * @property {boolean} sourcemaps
 * @property {boolean} minifyglsl
 * @property {boolean} clean
 */

export class CablesBuild extends CablesModule
{

    static DEFAULT_DESTINATION = "build";

    static MODULE_OPTION_PATCH_FILE = "file";
    static MODULE_OPTION_DESTINATION = "destination";
    static MODULE_OPTION_CLEAN = "clean";
    static MODULE_OPTION_COMBINE_JS = "combinejs";
    static MODULE_OPTION_MINIFY = "minify";
    static MODULE_OPTION_SOURCEMAPS = "sourcemaps";
    static MODULE_OPTION_MINIFY_GLSL = "minifyglsl";

    constructor(runningAsCli = false)
    {
        super(runningAsCli);
        /**
         * @type Array<import("./module.js").CliOptionDefinition>
         * @private
         */
        this._cliOptions = [
            {
                "name": CablesBuild.MODULE_OPTION_PATCH_FILE,
                "description": "Patchfile from a standalone project or export (.cables)",
                "type": String,
                "typeLabel": "{underline file}",
                "required": true,
            },
            {
                "name": CablesBuild.MODULE_OPTION_DESTINATION,
                "alias": "d",
                "description": "Folder to build the patch to, can either be absolute or relative",
                "type": String,
                "typeLabel": "{underline dir}",
            },
            {
                "name": CablesBuild.MODULE_OPTION_CLEAN,
                "description": "Remove destination folder before building",
                "type": Boolean,
                "defaultValue": false,
            },
            {
                "name": CablesBuild.MODULE_OPTION_COMBINE_JS,
                "alias": "c",
                "description": "Combine javascript and json into a single patch.js",
                "type": String,
                "defaultValue": "true",
            },
            {
                "name": CablesBuild.MODULE_OPTION_MINIFY,
                "alias": "m",
                "description": "Minify code",
                "type": String,
                "defaultValue": "true",
            },
            {
                "name": CablesBuild.MODULE_OPTION_SOURCEMAPS,
                "alias": "M",
                "description": "If code is minified, add sourcemaps to the build",
                "type": Boolean,
            },
            {
                "name": CablesBuild.MODULE_OPTION_MINIFY_GLSL,
                "alias": "g",
                "description": "Minifies shader-code in .frag and .att attachments",
                "type": Boolean,
            },
        ];
    }

    /**
     *
     * @returns {string}
     */
    getCommandName()
    {
        return Cables.COMMAND_NAME_BUILD;
    }

    /**
     *
     * @returns {boolean}
     */
    requireApiKey()
    {
        return false;
    }

    /**
     *
     * @param {HeadlessModuleOptions} [options]
     * @returns {Promise<ModuleRunResult>}
     */
    async run(options = {})
    {
        try
        {
            await super.run(options);
            const patchFile = this.getModuleOption(CablesBuild.MODULE_OPTION_PATCH_FILE);
            const patchJson = jsonfile.readFileSync(patchFile);
            const sourceDir = path.resolve(path.dirname(patchFile));
            let finalDir = null;
            const destination = this.getModuleOption(CablesBuild.MODULE_OPTION_DESTINATION);
            if (destination)
            {
                if (path.isAbsolute(destination))
                {
                    finalDir = destination;
                }
                else
                {
                    finalDir = path.normalize(path.join(process.cwd(), destination));
                }
            }
            else
            {
                finalDir = path.join(process.cwd(), CablesBuild.DEFAULT_DESTINATION);
            }

            let clean = this.getModuleOption(CablesBuild.MODULE_OPTION_CLEAN);
            if (clean)
            {
                this.log.info("removing destination directory", finalDir);
                fs.rmSync(finalDir, {
                    "recursive": true,
                    "force": true,
                });
            }
            else if (!fs.existsSync(finalDir))
            {
                clean = true;
            }

            /** @type {CablesBuildOptions} */
            const buildOptions = {
                buildMode: "development", // FIXME
                minify: this.getModuleOption(CablesBuild.MODULE_OPTION_MINIFY) === "true",
                sourcemaps: this.getModuleOption(CablesBuild.MODULE_OPTION_SOURCEMAPS) === "true",
                flat: false, // FIXME
                combinejs: this.getModuleOption(CablesBuild.MODULE_OPTION_COMBINE_JS) === "true",
                minifyglsl: this.getModuleOption(CablesBuild.MODULE_OPTION_MINIFY_GLSL) === "true",
                clean: clean
            }
            await this._runWebpack(patchJson, sourceDir, finalDir, buildOptions);
            return this.getResult(true);
        } catch (e)
        {
            const cause = e.cause?.message || e.cause;
            this.log.error(e.message, cause);
            return this.getResult(false);
        }

    }

    /**
     * @param {any} patchJson
     * @param {string} sourceDir
     * @param {string} targetDir
     * @param {CablesBuildOptions} options
     * @returns {Promise}
     */
    _runWebpack(patchJson, sourceDir, targetDir, options)
    {
        return new Promise((resolve, reject) =>
        {
            webpack(webpackConfig(this, patchJson, sourceDir, targetDir, options),
                (err, stats) =>
                {
                    if (err)
                    {
                        reject(err);
                    }
                    else
                    {
                        resolve(stats);
                    }
                });
        });
    }
}
