import { CablesModule } from "./module.js";
import { CablesHeadlessRunner } from "./headless_runner.js";
import { Cables } from "../index.js";

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
        return Cables.COMMAND_NAME_HEADLESS;
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
            const patchFile = this.getModuleOption(CablesHeadless.MODULE_OPTION_PATCH_FILE);
            if (patchFile)
            {
                const runner = new CablesHeadlessRunner(patchFile);
                return runner.run();
            }
        }
        catch (e)
        {
            const cause = e.cause?.message || e.cause;
            this.log.error(e.message, cause);
            return this.getResult(false);
        }

    }

}
