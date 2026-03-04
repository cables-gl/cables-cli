import { CablesCLIModule } from "./climodule.js";

export class CablesCLIHeadless extends CablesCLIModule
{

    constructor(runningAsCli = false)
    {
        super(runningAsCli);
        this._cliOptions = [
            {
                "name": "headless",
                "description": "something",
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
