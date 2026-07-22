import { CablesModule } from "./module.js";
import { CablesHeadlessRunner } from "./headless_runner.js";

/** @typedef {import("./module.js").ModuleOptions} ModuleOptions */
/** @typedef {import("./module.js").ModuleRunResult} ModuleRunResult */
/** @typedef {ModuleOptions & HeadlessOptionsData} HeadlessModuleOptions */
/** @typedef {ModuleRunResult} HeadlessModuleRunResult  */

/**
 * @typedef {object} HeadlessOptionsData
 * @property {string} file
 */

export class CablesHeadless extends CablesModule
{

    static MODULE_OPTION_PATCH_FILE = "file";

    constructor(runningAsCli = false)
    {
        super(runningAsCli);

        /**
         * @type Array<import("./module.js").CliOptionDefinition>
         * @private
         */
        this._cliOptions = [
            {
                "name": CablesHeadless.MODULE_OPTION_PATCH_FILE,
                "description": "Patchfile from a standalone project or export (.cables)",
                "type": String,
                "typeLabel": "{underline file}",
                "required": true,
            },
        ];
    }

    /**
     *
     * @returns {string}
     */
    getCommandName()
    {
        return "headless";
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
        await super.run(options);
        const patchFile = this.getModuleOption(CablesHeadless.MODULE_OPTION_PATCH_FILE);
        if (patchFile)
        {
            const runner = new CablesHeadlessRunner(patchFile);
            return runner.run();
        }
    }

}
