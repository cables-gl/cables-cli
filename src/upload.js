import { CablesCLIModule } from "./climodule.js";

export class CablesCLIUpload extends CablesCLIModule {

    constructor() {
        super();
        this._cliOptions = [
            {
                "name": "upload",
                "description": "something",
                "type": String,
                "multiple": true,
                "typeLabel": "{underline file[]}",
            },
        ];
    }
    getCommandName()
    {
        return "upload";
    }
}
