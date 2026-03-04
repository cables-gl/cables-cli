import { CablesCLIModule } from "./climodule.js";

export class CablesCLIHeadless extends CablesCLIModule
{

    constructor(runningAsCli = false)
    {
        super(runningAsCli);
        this._cliOptions = [
            {
                "name": "headless",
                "description": "Patchfile from a standalone project or export (.cables)",
                "type": String,
                "typeLabel": "{underline file}",
            },
        ];
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
