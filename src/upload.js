import path from "path";
import fs from "fs";
import { CablesCLIModule } from "./climodule.js";

export class CablesCLIUpload extends CablesCLIModule
{

    static MODULE_OPTION_PATCH_ID = "patch";
    static MODULE_OPTION_UPLOAD_FILES = "file";

    constructor(runningAsCli = false)
    {
        super(runningAsCli);
        this._cliOptions = [
            {
                "name": CablesCLIUpload.MODULE_OPTION_PATCH_ID,
                "alias": "p",
                "description": "Patch-Id of the patch on " + this._baseUrl.hostname,
                "type": String,
                "typeLabel": "{underline PATCHID}",
                "required": true,
            },
            {
                "name": CablesCLIUpload.MODULE_OPTION_UPLOAD_FILES,
                "description": "File(s) to upload to the defined patch",
                "type": String,
                "multiple": true,
                "typeLabel": "{underline files[]}",
                "required": true,
            },
        ];
    }

    getCommandName()
    {
        return "upload";
    }

    async run(options = {})
    {
        await super.run(options);
        try
        {
            const url = this.getUrl("/api/project/" + this.getModuleOption(CablesCLIUpload.MODULE_OPTION_PATCH_ID) + "/file");
            const filePaths = this.getFileLocations();

            const form = new FormData();
            let pos = 0;
            for (const filePath of filePaths)
            {
                const file = await fs.openAsBlob(filePath);
                form.append(String(pos), file, path.basename(filePath));
                pos++;
            }

            if (filePaths.length > 1)
            {
                this._log.info("Uploading", filePaths.length, " file(s) to", url.href, "...");
            }
            else
            {
                this._log.info("Uploading to", url.href, "...");

            }
            const reqOptions = {
                "method": "POST",
                "headers": { "apikey": this.getApiKey() },
                "body": form,
            };
            const response = await fetch(url, reqOptions);
            if (response.ok)
            {
                this._log.info("Success!");
            }
            else
            {
                const json = await response.json();
                this._log.error("ERROR", json.msg);
            }
        } catch (e)
        {
            this._log.error("ERROR", e.message);
        }
    }

    getUrl(path, params = {})
    {
        const url = new URL(path, this._baseUrl);
        Object.keys(params)
            .forEach((key) =>
            {
                url.searchParams.set(key, params[key]);
            });
        return url;
    }

    getFileLocations()
    {
        const givenLocations = this.getModuleOption(CablesCLIUpload.MODULE_OPTION_UPLOAD_FILES);
        const absoluteLocations = [];
        givenLocations.forEach((loc) =>
        {
            absoluteLocations.push(path.resolve(loc));
        });
        return absoluteLocations;
    }

    requireApiKey()
    {
        return true;
    }
}
