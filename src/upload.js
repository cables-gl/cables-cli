import path from "path";
import fs from "fs";
import { CablesModule } from "./module.js";
import { HttpError } from "./http_error.js";
import { UsageError } from "./usage_error.js";

/**
 * @typedef {ModuleOptions<UploadModuleOptions>} UploadModuleOptions
 *
 * @property {String} patch
 * @property {String|Array} file
 */

export class CablesUpload extends CablesModule
{

    static MODULE_OPTION_PATCH_ID = "patch";
    static MODULE_OPTION_UPLOAD_FILES = "file";

    constructor(runningAsCli = false)
    {
        super(runningAsCli);

        /**
         * @type Array<CliOptionDefinition>
         * @private
         */
        this._cliOptions = [
            {
                "name": CablesUpload.MODULE_OPTION_PATCH_ID,
                "alias": "p",
                "description": "Patch-Id of the patch on " + this._baseUrl.hostname,
                "type": String,
                "typeLabel": "{underline PATCHID}",
                "required": true,
            },
            {
                "name": CablesUpload.MODULE_OPTION_UPLOAD_FILES,
                "description": "File(s) to upload to the defined patch",
                "type": String,
                "multiple": true,
                "typeLabel": "{underline files[]}",
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
        return "upload";
    }

    /**
     *
     * @return {Boolean}
     */
    requireApiKey()
    {
        return true;
    }

    /**
     * @param {ModuleOptions<UploadModuleOptions>} [options]
     * @return Promise<ModuleRunResult>
     */
    async run(options = {})
    {
        try
        {
            await super.run(options);

            const givenFiles = this.getModuleOption(CablesUpload.MODULE_OPTION_UPLOAD_FILES);
            const url = this._getUrl("/api/project/" + this.getModuleOption(CablesUpload.MODULE_OPTION_PATCH_ID) + "/file");
            const filePaths = this._getFileLocations();
            if (filePaths.length === 0)
            {
                throw new UsageError("No files given for upload! given file(s) were \"" + givenFiles.join(",") + "\"");
            }

            const form = new FormData();
            let pos = 0;
            for (const filePath of filePaths)
            {
                if (filePath)
                {
                    const file = await fs.openAsBlob(filePath);
                    form.append(String(pos), file, path.basename(filePath));
                    pos++;
                }
            }

            if (filePaths.length > 1)
            {
                this.log.info("Uploading", filePaths.length, " file(s) to", url.href, "...");
            }
            else
            {
                this.log.info("Uploading to", url.href, "...");

            }
            const reqOptions = {
                "method": "POST",
                "headers": { "apikey": this.getApiKey() },
                "body": form,
            };
            const response = await fetch(url, reqOptions);
            if (response.ok && response.status === 200)
            {
                this.log.info("Success!");
            }
            else
            {
                const json = await response.json();
                const msg = this.getHttpResponseErrorMessage(json, response.status);
                throw new HttpError(msg, response);
            }
            return this.getResult();
        } catch (e)
        {
            this.log.error(e.message, e.cause);
            return this.getResult(false);
        }

    }

    _getUrl(path, params = {})
    {
        const url = new URL(path, this._baseUrl);
        Object.keys(params)
            .forEach((key) =>
            {
                url.searchParams.set(key, params[key]);
            });
        return url;
    }

    _getFileLocations()
    {
        const givenLocations = this.getModuleOption(CablesUpload.MODULE_OPTION_UPLOAD_FILES);
        const absoluteLocations = [];
        givenLocations.forEach((loc) =>
        {
            const givenLocation = loc.trim();
            if (givenLocation) absoluteLocations.push(path.resolve(loc));
        });
        return absoluteLocations;
    }


}
