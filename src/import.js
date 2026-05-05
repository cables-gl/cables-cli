import { CablesModule } from "./module.js";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { HttpError } from "./http_error.js";
import { ApiError } from "./api_error.js";
import { Cables } from "../index.js";

/** @typedef {import("./module.js").ModuleOptions} ModuleOptions */
/** @typedef {import("./module.js").ModuleRunResult} ModuleRunResult */
/** @typedef {ModuleOptions & ImportOptionsData} ImportModuleOptions */
/** @typedef {ModuleRunResult} ImportModuleRunResult  */

/**
 * @typedef {object} ImportOptionsData
 * @property {string} patch
 * @property {boolean|null} [dev=false]
 * @property {boolean|null} [convert=false]
 * @property {string} dir
 */
export class CablesImport extends CablesModule
{
    static MODULE_OPTION_USE_DEV = "dev";
    static MODULE_OPTION_CONVERT_OPS = "convert";
    static MODULE_OPTION_PATCH_DIR = "dir";

    constructor(runningAsCli = false)
    {
        super(runningAsCli);

        /**
         * @type Array<import("./module.js").CliOptionDefinition>
         * @private
         */
        this._cliOptions = [
            {
                "name": CablesImport.MODULE_OPTION_PATCH_DIR,
                "alias": "d",
                "description": "Folder with the patch to be imported",
                "type": String,
                "typeLabel": "{underline dir}",
                "required": true,
            },
            {
                "name": CablesImport.MODULE_OPTION_CONVERT_OPS,
                "description": "Import team- and user-ops as new ops",
                "type": String,
                "typeLabel": "<{underline html}|patch|code>",
                "defaultValue": false,
            }
        ];
    }
    /**
     *
     * @param {ExportModuleOptions} [options]
     * @returns {Promise<ImportModuleRunResult>}
     */
    async run(options = {})
    {
        try
        {
            await super.run(options);
            const zipFile = './patch.zip';
            const patchDir = this.getModuleOption(CablesImport.MODULE_OPTION_PATCH_DIR);
            await this._createPatchZip(patchDir, zipFile);
            const result = await this._uploadZip(zipFile);
            if(result && result.data?.projectId) {
                this.log.info("Success, imported projecturl:", this._baseUrl + "/p/" + result.data.projectId)
            }
            return this.getResult();

        } catch (e)
        {
            const cause = e.cause?.message || e.cause;
            this.log.error(e.message, cause);
            return this.getResult(false);
        }

    }

    /**
     *
     * @returns {string}
     */
    getCommandName()
    {
        return Cables.COMMAND_NAME_IMPORT;
    }

    /**
     *
     * @returns {boolean}
     */
    requireApiKey()
    {
        return true;
    }

    _getImportUrl()
    {
        const url = new URL("/api/project/import/zip", this._baseUrl.toString());
        if (this.getModuleOption(CablesImport.MODULE_OPTION_CONVERT_OPS)) url.searchParams.set("convertOps", "true");
        return url;
    }

    async _createPatchZip(sourceDir, targetZip) {
        return new Promise((resolve, reject) => {
            const output = fs.createWriteStream(targetZip);
            const archive = archiver('zip', {
                zlib: { level: 0 } // Sets the compression level.
            });

            output.on("close", () => {
                this.log.debug(archive.pointer() + ' total bytes');
                this.log.debug('archiver has been finalized and the output file descriptor has closed.');
                resolve(this.getResult(true));
            });

            output.on("error", (err) => {
                this.log.error("Error during creation of zip", targetZip, err);
                reject(this.getResult(false));
            });

            // good practice to catch warnings (ie stat failures and other non-blocking errors)
            archive.on('warning', (err) => {
                if (err.code === 'ENOENT') {
                    this.log.warn(err);
                } else {
                    this.log.error(err);
                    reject(this.getResult(false));
                }
            });

            // good practice to catch this error explicitly
            archive.on('error', (err) => {
                this.log.error(err);
                reject(this.getResult(false));
            });

            // pipe archive data to the file
            archive.pipe(output);

            // append files from a sub-directory, putting its contents at the root of archive
            archive.directory(sourceDir, "");

            // finalize the archive (ie we are done appending files but streams have to finish yet)
            // 'close', 'end' or 'finish' may be fired right after calling this method so register to them beforehand
            archive.finalize();
        });
    }

    async _uploadZip(zipPath)
    {
        const url = this._getImportUrl();
        const form = new FormData();
        let pos = 0;
        const file = await fs.openAsBlob(zipPath, { "type": "application/zip" });
        form.append(String(pos), file, path.basename(zipPath));

        this.log.info("Uploading to", url.href, "...");
        const reqOptions = {
            "method": "POST",
            "headers": { "apikey": this.getApiKey() },
            "body": form,
        };
        const response = await fetch(url, reqOptions);
        if (response.ok && response.status === 200)
        {
            const json = await response.json();
            if(json.data?.problems && Object.values(json.data.problems).length > 0) {
                Object.values(json.data.problems).forEach((problem) => {
                    this.log.error(problem)
                })
                throw new ApiError("Import error", response, Object.values(json.data.problems));
            }
            return json;
        }
        else
        {
            const json = await response.json();
            const msg = this.getHttpResponseErrorMessage(json, response.status);
            throw new HttpError(msg, response);
        }
    }
}
