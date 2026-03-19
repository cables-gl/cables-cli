import { CablesModule } from "./module.js";
import { CablesHeadlessRunner } from "./headless_runner.js";

/**
 * @typedef {ModuleOptions<HeadlessModuleOptions>} HeadlessModuleOptions
 *
 * @property {String} file
 */

export class CablesHeadless extends CablesModule
{

    static MODULE_OPTION_PATCH_FILE = "file";

    constructor(runningAsCli = false)
    {
        super(runningAsCli);
        /**
         * @type Array<CliOptionDefinition>
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
     * @return {String}
     */
    getCommandName()
    {
        return "headless";
    }

    /**
     *
     * @return {Boolean}
     */
    requireApiKey()
    {
        return false;
    }

    /**
     *
     * @param {ModuleOptions<HeadlessModuleOptions>} [options]
     * @return {Promise<ModuleRunResult>}
     */
    async run(options = {})
    {
        try {
            await super.run(options);
            const patchFile = this.getModuleOption(CablesHeadless.MODULE_OPTION_PATCH_FILE);
            if (patchFile)
            {
                const runner = new CablesHeadlessRunner(patchFile);
                return runner.run();
            }
        } catch (e)
        {
            this.log.error(e.message, e.cause);
            return this.getResult(false);
        }

    }


}
