import path from "path";
import md5File from "md5-file";
import fs from "fs";
import { CablesModule } from "./module.js";
import { HttpError } from "./http_error.js";
import { UsageError } from "./usage_error.js";

/**
 * @typedef {ModuleOptions<UploadModuleOptions>} UploadModuleOptions
 *
 * @property {String} patch
 * @property {String|Array} file
 * @property {Boolean} newonly
 */


/**
 * @typedef {ModuleRunResult<UploadModuleRunResult>} UploadModuleRunResult
 * @property {Boolean} success
 * @property {LogEntry} [error] last error with full information
 * @property {Array<LogEntry>} log array of lines logged during run
 * @property {Array<String>} skipped array of filenames skipped during upload
 */

export class CablesUpload extends CablesModule
{

    static MODULE_OPTION_PATCH_ID = "patch";
    static MODULE_OPTION_UPLOAD_FILES = "file";
    static MODULE_OPTION_NEW_ONLY = "newonly";

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
            {
                "name": CablesUpload.MODULE_OPTION_NEW_ONLY,
                "description": "Check MD5 of local files and upload new ones only",
                "type": Boolean,
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
     * @return Promise<UploadModuleRunResult>
     */
    async run(options = {})
    {
        try
        {
            await super.run(options);

            const patchId = this.getModuleOption(CablesUpload.MODULE_OPTION_PATCH_ID);
            const newOnly = this.getModuleOption(CablesUpload.MODULE_OPTION_NEW_ONLY);

            const givenFiles = this.getModuleOption(CablesUpload.MODULE_OPTION_UPLOAD_FILES);
            let uploadFiles = [];
            let skippedFiles = [];
            if (newOnly)
            {
                const md5Url = this._getUrl("/api/project/" + patchId + "/files?hashes=true");
                const md5Options = {
                    "method": "GET",
                    "headers": { "apikey": this.getApiKey() },
                };
                let md5response = {
                    "ok": false
                }
                try {
                    md5response = await fetch(md5Url, md5Options);
                }catch (e) {
                    // error is handled below in else case
                }
                if (md5response.ok && md5response.status === 200)
                {
                    const remoteFiles = await md5response.json();
                    const patchFiles = remoteFiles.filter((patchFile) => { return !patchFile.isReference && !patchFile.isLibrary;});
                    givenFiles.forEach((givenFile) =>
                    {
                        const baseName = path.basename(givenFile);
                        const localHash = md5File.sync(givenFile);
                        const remoteFile = patchFiles.find((patchFile) => { return patchFile.name === baseName;});
                        if (remoteFile && remoteFile.hash)
                        {
                            if (localHash !== remoteFile.hash)
                            {
                                uploadFiles.push(givenFile);
                            }
                            else
                            {
                                skippedFiles.push(givenFile);
                                this.log.info("Skipping upload of", remoteFile.name, "same hash");
                            }
                        }
                        else
                        {
                            uploadFiles.push(givenFile);
                        }
                    });
                }
                else
                {
                    this.log.warn("Failed to get list of md5 hashes, treating all uploads as new!");
                    uploadFiles = givenFiles;
                }
            }
            else
            {
                uploadFiles = givenFiles;
            }

            const url = this._getUrl("/api/project/" + patchId + "/file");

            const filePaths = this._getFileLocations(uploadFiles);
            if (givenFiles.length === 0)
            {
                throw new UsageError("No files to upload! Given file(s) were \"" + givenFiles.join(",") + "\"");
            }

            if(filePaths.length > 0) {
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
                    this.log.info("Uploading", filePaths[0].length, "to", url.href, "...");

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
                return this.getResult(true, [], skippedFiles);
            }else{
                return this.getResult(true, [], skippedFiles);
            }

        } catch (e)
        {
            this.log.error(e.message, e.cause ? e.cause : "");
            return this.getResult(false);
        }

    }

    /**
     *
     * @param {Boolean} success
     * @param {Array<LogEntry>} logEntries
     * @return UploadModuleRunResult
     */
    getResult(success = true, logEntries = [], skippedFiles = []) {
        const result = super.getResult(success, logEntries);
        if(skippedFiles && skippedFiles.length > 0) result.skipped = skippedFiles;
        return result;
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

    _getFileLocations(files = null)
    {
        const givenLocations = files || this.getModuleOption(CablesUpload.MODULE_OPTION_UPLOAD_FILES);
        const absoluteLocations = [];
        givenLocations.forEach((loc) =>
        {
            const givenLocation = loc.trim();
            if (givenLocation) absoluteLocations.push(path.resolve(loc));
        });
        return absoluteLocations;
    }


}
