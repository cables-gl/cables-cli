import path from "path";
import fs from "fs";
import process from "process";
import extract from "extract-zip";
import { CablesModule } from "./module.js";
import { UsageError } from "./usage_error.js";
import { HttpError } from "./http_error.js";
import { Cables } from "../index.js";

/** @typedef {import("./module.js").ModuleOptions} ModuleOptions */
/** @typedef {import("./module.js").ModuleRunResult} ModuleRunResult */
/** @typedef {ModuleOptions & ExportOptionsData} ExportModuleOptions */
/** @typedef {ModuleRunResult} ExportModuleRunResult  */

/**
 * @typedef {object} ExportOptionsData
 * @property {string} patch
 * @property {("html"|"patch"|"code"|"headless")} [type="html"]
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
 * @property {boolean|null} [minifyglsl=true]
 * @property {boolean|null} [buildable=false]
 */
export class CablesExport extends CablesModule
{
    static DEFAULT_DESTINATION = "";

    static MODULE_OPTION_PATCH_ID = "patch";
    static MODULE_OPTION_EXPORT_TYPE = "type";
    static MODULE_OPTION_DESTINATION = "destination";
    static MODULE_OPTION_INDEX_HTML = "index";
    static MODULE_OPTION_NO_INDEX_HTML = "i";
    static MODULE_OPTION_EXTRACT_ZIP = "extract";
    static MODULE_OPTION_JSON_FILENAME = "jsonfilename";
    static MODULE_OPTION_COMBINE_JS = "combinejs";
    static MODULE_OPTION_ASSET_EXPORT = "assets";
    static MODULE_OPTION_FLAT_EXPORT = "flat";
    static MODULE_OPTION_MINIFY = "minify";
    static MODULE_OPTION_NO_MINIFY = "m";
    static MODULE_OPTION_SOURCEMAPS = "sourcemaps";
    static MODULE_OPTION_MINIFY_GLSL = "minifyglsl";
    static MODULE_OPTION_ALL_OPS = "allops";
    static MODULE_OPTION_BUILDABLE = "buildable";
    static MODULE_OPTION_CLEAN = "clean";

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
                "description": "Id of the patch",
                "type": String,
                "typeLabel": "{underline PATCHID[]}",
                "multiple": true,
                "defaultOption": true,
                "required": true,
            },
            {
                "name": CablesExport.MODULE_OPTION_EXPORT_TYPE,
                "alias": "t",
                "description": "Type of export (see more options below)",
                "type": String,
                "typeLabel": "<{underline html}|patch|code|headless>",
                "defaultValue": "html",
            },
            {
                "name": CablesExport.MODULE_OPTION_DESTINATION,
                "alias": "d",
                "description": "Folder to download the patch to, can either be absolute or relative",
                "type": String,
                "typeLabel": "{underline ./" + CablesExport.DEFAULT_DESTINATION + "}",
                "defaultValue": CablesExport.DEFAULT_DESTINATION
            },
            {
                "name": CablesExport.MODULE_OPTION_INDEX_HTML,
                "group": "html",
                "description": "Will include index.html in the export.",
                "type": String,
                "typeLabel": "<{underline true}|false>",
                "defaultValueBoolean": true
            },
            {
                "name": CablesExport.MODULE_OPTION_NO_INDEX_HTML,
                "group": "html",
                "alias": "i",
                "description": "Will exclude index.html in the export.",
                "type": Boolean,
                "defaultValue": false,
                "hidden": true
            },
            {
                "name": CablesExport.MODULE_OPTION_EXTRACT_ZIP,
                "alias": "x",
                "description": "Extract the downloaded zip file",
                "type": String,
                "typeLabel": "<{underline true}|false>",
                "defaultValueBoolean": true
            },
            {
                "name": CablesExport.MODULE_OPTION_JSON_FILENAME,
                "group": "html",
                "alias": "j",
                "description": "Define the filename of the patch json file",
                "type": String,
                "typeLabel": "{underline file}",
            },
            {
                "name": CablesExport.MODULE_OPTION_COMBINE_JS,
                "group": "html",
                "alias": "c",
                "description": "Combine javascript and json into a single patch.js",
                "type": String,
                "typeLabel": "<{underline true}|false>",
                "defaultValueBoolean": true
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
                "group": "html",
                "alias": "f",
                "description": "Put js and assets into same directory as index.html (\"flat export\")",
                "type": String,
                "typeLabel": "<true|{underline false}>",
                "defaultValueBoolean": false
            },
            {
                "name": CablesExport.MODULE_OPTION_MINIFY,
                "group": "html",
                "description": "Minify code",
                "type": String,
                "typeLabel": "<{underline true}|false>",
                "defaultValueBoolean": true
            },
            {
                "name": CablesExport.MODULE_OPTION_NO_MINIFY,
                "group": "html",
                "alias": "m",
                "description": "Do not minify code",
                "type": Boolean,
                "typeLabel": "<true,{underline false}>",
                "defaultValue": false,
                "hidden": true
            },
            {
                "name": CablesExport.MODULE_OPTION_SOURCEMAPS,
                "group": "html",
                "alias": "M",
                "description": "If code is minified, add sourcemaps to the export",
                "type": String,
                "typeLabel": "<true|{underline false}>",
                "defaultValueBoolean": false
            },
            {
                "name": CablesExport.MODULE_OPTION_MINIFY_GLSL,
                "group": ["html", "headless"],
                "alias": "g",
                "description": "Minifies shader-code in .frag and .att attachments",
                "type": String,
                "typeLabel": "<{underline true}|false>",
                "defaultValueBoolean": true
            },
            {
                "name": CablesExport.MODULE_OPTION_ALL_OPS,
                "group": "patch",
                "description": "When exporting with type `patch`, also include core and extension ops",
                "type": String,
                "typeLabel": "<true|{underline false}>",
                "defaultValueBoolean": false
            },
            {
                "name": CablesExport.MODULE_OPTION_BUILDABLE,
                "group": "patch",
                "description": "When exporting with type `patch`, include all ops, core and libs needed to build the patch",
                "type": String,
                "typeLabel": "<true|{underline false}>",
                "defaultValueBoolean": false
            },
            {
                "name": CablesExport.MODULE_OPTION_CLEAN,
                "description": "Remove destination folder before building",
                "type": Boolean,
                "defaultValue": false,
            }
        ];
    }

    /**
     *
     * @returns {Promise<ModuleRunResult>}
     */
    async runCommand()
    {
        const exportType = this.getModuleOption(CablesExport.MODULE_OPTION_EXPORT_TYPE);
        if (exportType === "code")
        {
            const patchIds = this.getModuleOption(CablesExport.MODULE_OPTION_PATCH_ID);
            const url = new URL("/api/projects/" + patchIds.join(",") + "/export_code", this._baseUrl);
            const reqOptions = {
                "method": "GET",
                "headers": { "apikey": this.getApiKey() },
            };
            this.log.info("requesting export...");
            this.log.info("downloading from", url.href, "...");
            const response = await fetch(url, reqOptions);
            if (response.ok && response.status === 200)
            {
                const data = await response.text();
                this.log.info("download finished... ");
                const finalDir = this._getDestinationDir();
                if (!fs.existsSync(finalDir)) await fs.promises.mkdir(finalDir, { "recursive": true });
                const finalFilename = path.join(finalDir, "ops.js");
                this.log.info("saving to " + finalFilename + "...");
                fs.writeFileSync(finalFilename, data);
            }
            else
            {
                let message = "";
                try
                {
                    const json = await response.json();
                    message = this.getHttpResponseErrorMessage(json, response.status);
                }
                catch (e)
                {
                    message = "failed to parse error response json: " + e;
                }
                throw new HttpError(message, response);
            }
        }
        else
        {
            const patchIds = this.getModuleOption(CablesExport.MODULE_OPTION_PATCH_ID);
            if (patchIds.length > 1)
            {
                throw new UsageError("Export type '" + exportType + "' does not support multiple patch-ids.");
            }
            if (this.getModuleOption(CablesExport.MODULE_OPTION_CLEAN))
            {
                const relativeCwd = path.relative(this._getDestinationDir(), process.cwd());
                if (!relativeCwd.startsWith("..") && !path.isAbsolute(relativeCwd))
                {
                    throw new UsageError("--" + CablesExport.MODULE_OPTION_CLEAN + " would remove the current working directory, use a subfolder as destination");
                }
            }
            const url = this._getExportUrl(patchIds[0]);
            const reqOptions = {
                "method": "GET",
                "headers": { "apikey": this.getApiKey() },
            };
            if (this._cli && process.stdout.isTTY) this._startSpinner();
            try
            {
                this._logStep("exporting", "requesting export from", url.href, "...");
                const response = await fetch(url, reqOptions);
                if (response.ok && response.status === 200)
                {
                    const json = await response.json();
                    if (json.log && Array.isArray(json.log))
                    {
                        const relevantEntries = json.log.filter((logEntry) => { return logEntry.level === "error"; });
                        relevantEntries.forEach((logEntry) =>
                        {
                            this._logStep(null, "\x1b[33m%s\x1b[0m", "[" + logEntry.level + "] " + logEntry.text);
                        });
                    }
                    let downloadUrl = new URL(json.urls.downloadUrl);
                    const tempFile = await this._downloadZip(downloadUrl);

                    let finalDir = this._getDestinationDir();
                    if (this.getModuleOption(CablesExport.MODULE_OPTION_CLEAN))
                    {
                        this._logStep("removing", "removing destination directory", finalDir);
                        await fs.promises.rm(finalDir, {
                            "recursive": true,
                            "force": true,
                        });
                    }

                    if (!fs.existsSync(finalDir)) await fs.promises.mkdir(finalDir, { "recursive": true });
                    if (this.getModuleOption(CablesExport.MODULE_OPTION_EXTRACT_ZIP))
                    {
                        this._logStep("extracting", "extracting to " + finalDir);
                        await extract(tempFile, { "dir": finalDir });
                        fs.unlinkSync(tempFile);
                    }
                    else
                    {
                        const finalFilename = path.join(finalDir, path.basename(json.urls.downloadUrl, path.extname(json.urls.downloadUrl))) + ".zip";
                        fs.renameSync(tempFile, finalFilename);
                        this._logStep(null, "download finished... ", finalFilename);
                    }
                }
                else
                {
                    let message = "";
                    try
                    {
                        const json = await response.json();
                        message = this.getHttpResponseErrorMessage(json, response.status);
                    }
                    catch (e)
                    {
                        message = "failed to parse error response json: " + e;
                    }
                    throw new HttpError(message, response);
                }
            }
            finally
            {
                this._stopSpinner();
            }
        }
        return this.getResult();

    }

    /**
     *
     * @returns {String}
     */
    getCommandName()
    {
        return Cables.COMMAND_NAME_EXPORT;
    }

    /**
     *
     * @returns {Object<String, String>}
     */
    getOptionGroups()
    {
        return {
            "html": "HTML export options (-t html):",
            "patch": "Patch export options (-t patch):",
            "headless": "Headless export options (-t headless):"
        };
    }

    /**
     *
     * @returns {String}
     */
    getCliExample()
    {
        return "cables export -p pQpie9";
    }

    /**
     *
     * @returns {boolean}
     */
    requireApiKey()
    {
        return true;
    }

    _getDestinationDir()
    {

        let finalDir = process.cwd();
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
        return finalDir;
    }

    _getExportUrl(patchId)
    {
        const exportType = this.getModuleOption(CablesExport.MODULE_OPTION_EXPORT_TYPE);
        const url = new URL("/api/project/" + patchId + "/export", this._baseUrl);
        url.searchParams.set("type", exportType);
        url.searchParams.set("combineJS", this.getModuleOption(CablesExport.MODULE_OPTION_COMBINE_JS));
        let removeIndexHtml = this.getModuleOption(CablesExport.MODULE_OPTION_INDEX_HTML) === false;
        if (!removeIndexHtml && this.getModuleOption(CablesExport.MODULE_OPTION_NO_INDEX_HTML)) removeIndexHtml = true;
        if (removeIndexHtml) url.searchParams.set("removeIndexHtml", "true");
        if (this.getModuleOption(CablesExport.MODULE_OPTION_JSON_FILENAME))
        {
            const givenName = this.getModuleOption(CablesExport.MODULE_OPTION_JSON_FILENAME);
            const jsonName = path.basename(givenName, path.extname(givenName));
            url.searchParams.set("jsonName", jsonName);
        }
        if (this.getModuleOption(CablesExport.MODULE_OPTION_FLAT_EXPORT)) url.searchParams.set("flat", "true");
        if (this.getModuleOption(CablesExport.MODULE_OPTION_SOURCEMAPS)) url.searchParams.set("sourcemaps", "true");

        let minifyCode = this.getModuleOption(CablesExport.MODULE_OPTION_MINIFY);
        if (this.getModuleOption(CablesExport.MODULE_OPTION_NO_MINIFY)) minifyCode = false;
        url.searchParams.set("minify", minifyCode);

        url.searchParams.set("minifyGlsl", this.getModuleOption(CablesExport.MODULE_OPTION_MINIFY_GLSL) !== false);

        if (exportType === "patch" && this.getModuleOption(CablesExport.MODULE_OPTION_ALL_OPS)) url.searchParams.set("allOps", "true");
        if (exportType === "patch" && this.getModuleOption(CablesExport.MODULE_OPTION_BUILDABLE)) url.searchParams.set("buildable", "true");

        if (this.getModuleOption(CablesExport.MODULE_OPTION_ASSET_EXPORT))
        {
            url.searchParams.set("assets", this.getModuleOption(CablesExport.MODULE_OPTION_ASSET_EXPORT));
        }
        return url;
    }

    _startSpinner()
    {
        const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
        let frame = 0;
        this._spinnerLabel = "";
        this._onSigint = () =>
        {
            this._stopSpinner();
            process.exit(130);
        };
        process.once("SIGINT", this._onSigint);
        process.stdout.write("\x1b[?25l");
        this._spinner = setInterval(() =>
        {
            process.stdout.write("\r\x1b[K" + frames[frame++ % frames.length] + " " + this._spinnerLabel + "...");
        }, 80);
    }

    _stopSpinner()
    {
        if (!this._spinner) return;
        clearInterval(this._spinner);
        this._spinner = null;
        process.removeListener("SIGINT", this._onSigint);
        process.stdout.write("\r\x1b[K\x1b[?25h");
    }

    /**
     * log a line above the spinner and change the spinner text
     * @param {String|null} label
     * @param {...any} args
     */
    _logStep(label, ...args)
    {
        if (this._spinner) process.stdout.write("\r\x1b[K");
        if (label) this._spinnerLabel = label;
        this.log.info(...args);
    }

    async _downloadZip(downloadUrl)
    {
        const tempFile = path.basename(downloadUrl.href, path.extname(downloadUrl.href)) + ".zip";
        const res = await fetch(downloadUrl, { "method": "HEAD" });
        const sizeKb = Math.round(res.headers.get("content-length") / 1024);
        const size = sizeKb >= 1024 ? (sizeKb / 1024).toFixed(2) + "MB" : sizeKb + "kb";
        this._logStep("downloading", "downloading", size, "from", downloadUrl.href, "...");
        const response = await fetch(downloadUrl, { "method": "GET" });
        if (!response.ok)
        {
            throw new HttpError("Failed to download export from " + downloadUrl.href + " (" + response.status + ")", response);
        }
        const data = await response.arrayBuffer();
        fs.writeFileSync(tempFile, Buffer.from(data));
        return tempFile;
    }
}
