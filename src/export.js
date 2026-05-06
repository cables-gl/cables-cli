import { CablesModule } from "./module.js";
import path from "path";
import fs from "fs";
import process from "process";
import extract from "extract-zip";
import { UsageError } from "./usage_error.js";
import { HttpError } from "./http_error.js";
import { Cables } from "../index.js";

/** @typedef {import("./module.js").ModuleOptions} ModuleOptions */
/** @typedef {import("./module.js").ModuleRunResult} ModuleRunResult */
/** @typedef {ModuleOptions & ExportOptionsDaa} ExportModuleOptions */
/** @typedef {ModuleRunResult} ExportModuleRunResult  */

/**
 * @typedef {object} ExportOptionsDaa
 * @property {string} patch
 * @property {("html"|"patch"|"code")} [type="html"]
 * @property {string|null} [destination]
 * @property {boolean|null} [index=true]
 * @property {boolean|null} [extract=true]
 * @property {string|null} [jsonfilename]
 * @property {boolean|null} [combinejs=true]
 * @property {boolean|null} [dev=false]
 * @property {("auto"|"all"|"none")} [assets="auto"]
 * @property {boolean|null} [flat=false]
 * @property {boolean|null} [minify=true]
 * @property {boolean|null} [sourcemaps=false]
 * @property {boolean|null} [minifyglsl=false]
 */
export class CablesExport extends CablesModule
{
    static DEFAULT_DESTINATION = "patch";

    static MODULE_OPTION_PATCH_ID = "patch";
    static MODULE_OPTION_EXPORT_TYPE = "type";
    static MODULE_OPTION_DESTINATION = "destination";
    static MODULE_OPTION_INDEX_HTML = "index";
    static MODULE_OPTION_EXTRACT_ZIP = "extract";
    static MODULE_OPTION_JSON_FILENAME = "jsonfilename";
    static MODULE_OPTION_COMBINE_JS = "combinejs";
    static MODULE_OPTION_USE_DEV = "dev";
    static MODULE_OPTION_ASSET_EXPORT = "assets";
    static MODULE_OPTION_FLAT_EXPORT = "flat";
    static MODULE_OPTION_MINIFY = "minify";
    static MODULE_OPTION_SOURCEMAPS = "sourcemaps";
    static MODULE_OPTION_MINIFY_GLSL = "minifyglsl";
    static MODULE_OPTION_ALL_OPS = "allops";

    constructor(runningAsCli = false)
    {
        super(runningAsCli);

        /**
         * @type Array<import("./module.js").CliOptionDefinition>
         * @private
         */
        this._cliOptions = [
            {
                "name": CablesExport.MODULE_OPTION_PATCH_ID,
                "alias": "p",
                "description": "Patch-Id of the patch on " + this._baseUrl.hostname,
                "type": String,
                "typeLabel": "{underline PATCHID[]}",
                "multiple": true,
                "required": true,
            },
            {
                "name": CablesExport.MODULE_OPTION_EXPORT_TYPE,
                "alias": "t",
                "description": "Type of export",
                "type": String,
                "typeLabel": "<{underline html}|patch|code>",
                "defaultValue": "html",
            },
            {
                "name": CablesExport.MODULE_OPTION_DESTINATION,
                "alias": "d",
                "description": "Folder to download the patch to, can either be absolute or relative",
                "type": String,
                "typeLabel": "{underline dir}",
            },
            {
                "name": CablesExport.MODULE_OPTION_INDEX_HTML,
                "alias": "i",
                "description": "Will include index.html in the export.",
                "type": String,
                "defaultValue": "true",
            },
            {
                "name": CablesExport.MODULE_OPTION_EXTRACT_ZIP,
                "alias": "x",
                "description": "Extract the downloaded zip file",
                "type": String,
                "defaultValue": "true",
            },
            {
                "name": CablesExport.MODULE_OPTION_JSON_FILENAME,
                "alias": "j",
                "description": "Define the filename of the patch json file",
                "type": String,
                "typeLabel": "{underline file}",
            },
            {
                "name": CablesExport.MODULE_OPTION_COMBINE_JS,
                "alias": "c",
                "description": "Combine javascript and json into a single patch.js",
                "type": String,
                "defaultValue": "true",
            },
            {
                "name": CablesExport.MODULE_OPTION_USE_DEV,
                "alias": "D",
                "description": "Export from " + CablesModule.CABLES_DEV_URL,
                "type": Boolean,
            },
            {
                "name": CablesExport.MODULE_OPTION_ASSET_EXPORT,
                "alias": "a",
                "description": "Export assets of patch",
                "defaultValue": "auto",
                "type": String,
                "typeLabel": "<{underline auto}|all|none>",
            },
            {
                "name": CablesExport.MODULE_OPTION_FLAT_EXPORT,
                "alias": "f",
                "description": "Put js and assets into same directory as index.html (\"flat export\")",
                "type": Boolean,
            },
            {
                "name": CablesExport.MODULE_OPTION_MINIFY,
                "alias": "m",
                "description": "Minify code",
                "type": String,
                "defaultValue": "true",
            },
            {
                "name": CablesExport.MODULE_OPTION_SOURCEMAPS,
                "alias": "M",
                "description": "If code is minified, add sourcemaps to the export",
                "type": Boolean,
            },
            {
                "name": CablesExport.MODULE_OPTION_MINIFY_GLSL,
                "alias": "g",
                "description": "Minifies shader-code in .frag and .att attachments",
                "type": Boolean,
            },
            {
                "name": CablesExport.MODULE_OPTION_ALL_OPS,
                "description": "When exporting with type `patch`, also include core and extension ops",
                "type": Boolean
            }
        ];
    }

    /**
     *
     * @param {ExportModuleOptions} [options]
     * @returns {Promise<ModuleRunResult>}
     */
    async run(options = {})
    {
        try
        {
            await super.run(options);

            const exportType = this.getModuleOption(CablesExport.MODULE_OPTION_EXPORT_TYPE);

            switch (exportType)
            {
            case "code":
                break;
            default:
                const patchIds = this.getModuleOption(CablesExport.MODULE_OPTION_PATCH_ID);
                if (patchIds.length > 1)
                {
                    throw new UsageError("Export type '" + exportType + "' does not support multiple patch-ids.");
                }
                const url = this._getExportUrl(patchIds[0]);
                const reqOptions = {
                    "method": "GET",
                    "headers": { "apikey": this.getApiKey() },
                };
                this.log.info("requesting export...");
                this.log.info("downloading from", url.href, "...");
                const response = await fetch(url, reqOptions);
                if (response.ok)
                {
                    const json = await response.json();
                    if (json.log && Array.isArray(json.log))
                    {
                        const relevantEntries = json.log.filter((logEntry) => { return logEntry.level === "error";});
                        relevantEntries.forEach((logEntry) =>
                        {
                            this.log.info("\x1b[33m%s\x1b[0m", "[" + logEntry.level + "] " + logEntry.text);
                        });
                    }
                    let downloadUrl = new URL(json.urls.downloadUrl);
                    const tempFile = await this._downloadZip(downloadUrl);
                    this.log.info("download finished... ", tempFile);

                    let finalDir = path.join(process.cwd(), path.basename(json.urls.downloadUrl));
                    const destination = this.getModuleOption(CablesExport.MODULE_OPTION_DESTINATION);
                    if (destination)
                    {
                        if (path.isAbsolute(destination))
                        {
                            finalDir = destination;
                        }
                        else
                        {
                            finalDir = path.normalize(path.join(process.cwd(), destination));
                        }
                    }
                    else
                    {
                        finalDir = path.join(process.cwd(), CablesExport.DEFAULT_DESTINATION);
                    }

                    if (this.getModuleOption(CablesExport.MODULE_OPTION_EXTRACT_ZIP))
                    {
                        this.log.info("extracting to " + finalDir);
                        await extract(tempFile, { dir: finalDir });
                        fs.unlinkSync(tempFile);
                    }
                    else
                    {
                        const finalFilename = finalDir + path.basename(json.urls.downloadUrl, path.extname(json.urls.downloadUrl)) + ".zip";
                        fs.renameSync(tempFile, finalFilename);
                    }
                }
                else
                {
                    let message = "";
                    try
                    {
                        message = await response.json();
                        message = message.msg;
                    } catch (e)
                    {
                        message = "failed to parse error response json: " + e;
                    }
                    throw new HttpError(message, response);
                }
                break;
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
        return Cables.COMMAND_NAME_EXPORT;
    }

    /**
     *
     * @returns {boolean}
     */
    requireApiKey()
    {
        return true;
    }

    _getExportUrl(patchId)
    {
        const exportType = this.getModuleOption(CablesExport.MODULE_OPTION_EXPORT_TYPE);
        const url = new URL("/api/project/" + patchId + "/export", this._baseUrl);
        url.searchParams.set("type", exportType);
        url.searchParams.set("combineJS", this.getModuleOption(CablesExport.MODULE_OPTION_COMBINE_JS));
        if (this.getModuleOption(CablesExport.MODULE_OPTION_USE_DEV)) url.searchParams.set("dev", "true");
        if (this.getModuleOption(CablesExport.MODULE_OPTION_INDEX_HTML) === "false") url.searchParams.set("removeIndexHtml", "true");
        if (this.getModuleOption(CablesExport.MODULE_OPTION_JSON_FILENAME))
        {
            const givenName = this.getModuleOption(CablesExport.MODULE_OPTION_JSON_FILENAME);
            const jsonName = path.basename(givenName, path.extname(givenName));
            url.searchParams.set("jsonFilename", jsonName);
        }
        if (this.getModuleOption(CablesExport.MODULE_OPTION_FLAT_EXPORT)) url.searchParams.set("flat", "true");
        if (this.getModuleOption(CablesExport.MODULE_OPTION_SOURCEMAPS)) url.searchParams.set("sourcemaps", "true");

        url.searchParams.set("minify", this.getModuleOption(CablesExport.MODULE_OPTION_MINIFY));

        if (this.getModuleOption(CablesExport.MODULE_OPTION_MINIFY_GLSL)) url.searchParams.set("minifyGlsl", "true");
        console.log("options", this.getModuleOptions());
        if (exportType === "patch" && this.getModuleOption(CablesExport.MODULE_OPTION_ALL_OPS)) url.searchParams.set("allOps", "true");

        if (this.getModuleOption(CablesExport.MODULE_OPTION_ASSET_EXPORT))
        {
            url.searchParams.set("assets", this.getModuleOption(CablesExport.MODULE_OPTION_ASSET_EXPORT));
        }
        if (this.getModuleOption(CablesExport.MODULE_OPTION_ASSET_EXPORT))
        {
            url.searchParams.set("assets", this.getModuleOption(CablesExport.MODULE_OPTION_ASSET_EXPORT));

        }
        return url;
    }

    async _downloadZip(downloadUrl)
    {
        const tempFile = path.basename(downloadUrl.href, path.extname(downloadUrl.href)) + ".zip";
        const res = await fetch(downloadUrl, { "method": "HEAD" });
        this.log.info("size:", Math.round(res.headers.get("content-length") / 1024) + "kb");
        let x = await fetch(downloadUrl, { "method": "GET" });
        x = await x.arrayBuffer();
        fs.writeFileSync(tempFile, Buffer.from(x));
        return tempFile;
    }
}
