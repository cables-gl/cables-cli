import { CablesCLIModule } from "./climodule.js";
import { CablesHeadlessRunner } from "./headless_runner.js";

export class CablesCLIHeadless extends CablesCLIModule
{

    static MODULE_OPTION_PATCH_FILE = "file";

    constructor(runningAsCli = false)
    {
        super(runningAsCli);
        this._cliOptions = [
            {
                "name": CablesCLIHeadless.MODULE_OPTION_PATCH_FILE,
                "description": "Patchfile from a standalone project or export (.cables)",
                "type": String,
                "typeLabel": "{underline file}",
                "required": true,
            },
        ];
    }

    async run(options = {})
    {
        await super.run(options);
        try {
            const patchFile = this.getModuleOption(CablesCLIHeadless.MODULE_OPTION_PATCH_FILE);
            if (patchFile)
            {
                const runner = new CablesHeadlessRunner(patchFile);
                await runner.run();
            }
        }catch (e) {
            this._log.error("ERROR", e.message);
        }
    }

    getCommandName()
    {
        return "headless";
    }

    requireApiKey()
    {
        return false;
    }
}
