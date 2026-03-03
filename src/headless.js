import { CablesCLIModule } from "./climodule.js";

export class CablesCLIHeadless extends CablesCLIModule
{

    constructor()
    {
        super();
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
}
