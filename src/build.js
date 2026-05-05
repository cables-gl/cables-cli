import { CablesModule } from "./module.js";
import { Cables } from "../index.js";
import webpackConfig from "./webpack/webpack.config.js";
import jsonfile from "jsonfile";
import webpack from "webpack";
import path from "path";
import process from "process";

/** @typedef {import("./module.js").ModuleOptions} ModuleOptions */
/** @typedef {import("./module.js").ModuleRunResult} ModuleRunResult */
/** @typedef {ModuleOptions & BuildOptionsData} BuildModuleOptions */

/** @typedef {ModuleRunResult} BuildModuleRunResult  */

/**
 * @typedef {object} BuildOptionsData
 * @property {string} file
 */

export class CablesBuild extends CablesModule
{

    static DEFAULT_DESTINATION = "build";

    static MODULE_OPTION_PATCH_FILE = "file";
    static MODULE_OPTION_DESTINATION = "destination";

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

            const isLiveBuild = true;
            const buildInfo = {};
            const minify = isLiveBuild;
            const analyze = false;
            const sourceMap = isLiveBuild;
            await this._runWebpack(patchJson, sourceDir, finalDir, isLiveBuild, buildInfo, minify, analyze, sourceMap);
            return this.getResult(true);
        } catch (e)
        {
            console.log("ERRRRRRR", e);
            const cause = e.cause?.message || e.cause;
            this.log.error(e.message, cause);
            return this.getResult(false);
        }

    }

    _runWebpack(patchJson, sourceDir, finalDir) {
        return new Promise((resolve, reject) => {
            webpack(webpackConfig(patchJson, sourceDir, finalDir), (err, stats) => {
                if(err) {
                    reject(err);
                }else{
                    resolve(stats);
                }
            })
        })
    }
}
