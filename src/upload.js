import { CablesCLIModule } from "./climodule.js";

export class CablesCLIUpload extends CablesCLIModule {

    static CLI_PARAM_PATCH_ID = "patch";
    static CLI_PARAM_UPLOAD_FILES = "files";

    constructor() {
        super();
        this._cliOptions = [
            {
                name: CablesCLIUpload.CLI_PARAM_PATCH_ID,
                alias: "p",
                "description": "Patch-Id of the patch on " + this._baseUrl.hostname,
                type: String,
                "typeLabel": "{underline PATCHID}"
            },
            {
                "name": CablesCLIUpload.CLI_PARAM_UPLOAD_FILES,
                "description": "Files to upload to the defined patch",
                "type": String,
                "multiple": true,
                "typeLabel": "{underline files[]}",
            },
        ];
    }

    getCommandName()
    {
        return "upload";
    }

    run()
    {
        super.run();
        console.log(this.getCliParameter(CablesCLIModule.CLI_PARAM_BASE_URL), this.getCliParameter(CablesCLIUpload.CLI_PARAM_PATCH_ID),this.getCliParameter(CablesCLIUpload.CLI_PARAM_UPLOAD_FILES), this.getApiKey())
    }
}
