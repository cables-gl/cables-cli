import { CablesCLIModule } from "./climodule.js";
import path from "path";
import fs from "fs";
import process from "process";
import extract from "extract-zip";

export class CablesCLIExport extends CablesCLIModule
{
    static DEFAULT_DESTINATION = "patch";

    static MODULE_OPTION_PATCH_ID = "patch";
    static MODULE_OPTION_EXPORT_TYPE = "type";
    static MODULE_OPTION_DESTINATION = "destination";
    static MODULE_OPTION_INDEX_HTML = "index";
    static MODULE_OPTION_EXTRACT_ZIP = "extract";
    static MODULE_OPTION_JSON_FILENAME = "json-filename";
    static MODULE_OPTION_COMBINE_JS = "combine-js";
    static MODULE_OPTION_USE_DEV = "dev";
    static MODULE_OPTION_ASSET_EXPORT = "assets";
    static MODULE_OPTION_FLAT_EXPORT = "flat";
    static MODULE_OPTION_MINIFY = "minify";
    static MODULE_OPTION_SOURCEMAPS = "sourcemaps";
    static MODULE_OPTION_MINIFY_GLSL = "minify-glsl";

    constructor(runningAsCli = false)
    {
        super(runningAsCli);
        this._cliOptions = [
            {
                "name": CablesCLIExport.MODULE_OPTION_PATCH_ID,
                "alias": "p",
                "description": "Patch-Id of the patch on " + this._baseUrl.hostname,
                "type": String,
                "typeLabel": "{underline PATCHID[]}",
                "multiple": true,
                "required": true,
            },
            {
                "name": CablesCLIExport.MODULE_OPTION_EXPORT_TYPE,
                "alias": "t",
                "description": "Type of export",
                "type": String,
                "typeLabel": "<{underline html}|patch|code>",
                "defaultValue": "html",
            },
            {
                "name": CablesCLIExport.MODULE_OPTION_DESTINATION,
                "alias": "d",
                "description": "Folder to download the patch to, can either be absolute or relative",
                "type": String,
                "typeLabel": "{underline dir}",
            },
            {
                "name": CablesCLIExport.MODULE_OPTION_INDEX_HTML,
                "alias": "i",
                "description": "Will include/overwrite index.html in the export",
                "type": Boolean,
                "defaultValue": true,
            },
            {
                "name": CablesCLIExport.MODULE_OPTION_EXTRACT_ZIP,
                "alias": "x",
                "description": "Extract the downloaded zip file",
                "type": Boolean,
                "defaultValue": true,
            },
            {
                "name": CablesCLIExport.MODULE_OPTION_JSON_FILENAME,
                "alias": "j",
                "description": "Define the filename of the patch json file",
                "type": String,
                "typeLabel": "{underline file}",
            },
            {
                "name": CablesCLIExport.MODULE_OPTION_COMBINE_JS,
                "alias": "c",
                "description": "Combine javascript and json into a single patch.js",
                "type": Boolean,
                "defaultValue": true,
            },
            {
                "name": CablesCLIExport.MODULE_OPTION_USE_DEV,
                "alias": "D",
                "description": "Export from " + CablesCLIModule.CABLES_DEV_URL,
                "type": Boolean,
            },
            {
                "name": CablesCLIExport.MODULE_OPTION_ASSET_EXPORT,
                "alias": "a",
                "description": "Export assets of patch",
                "defaultValue": "auto",
                "type": String,
                "typeLabel": "<{underline auto}|all|none>",
            },
            {
                "name": CablesCLIExport.MODULE_OPTION_FLAT_EXPORT,
                "alias": "f",
                "description": "Put js and assets into same directory as index.html (\"flat export\")",
                "type": Boolean,
            },
            {
                "name": CablesCLIExport.MODULE_OPTION_MINIFY,
                "alias": "m",
                "description": "Minify code",
                "type": Boolean,
                "defaultValue": true,
            },
            {
                "name": CablesCLIExport.MODULE_OPTION_SOURCEMAPS,
                "alias": "M",
                "description": "If code is minified, add sourcemaps to the export",
                "type": Boolean,
            },
            {
                "name": CablesCLIExport.MODULE_OPTION_MINIFY_GLSL,
                "alias": "g",
                "description": "Minifies shader-code in .frag and .att attachments",
                "type": Boolean,
            },
        ];
    }

    async run(options)
    {
        await super.run(options);
        try
        {
            const exportType = this.getModuleOption(CablesCLIExport.MODULE_OPTION_EXPORT_TYPE);
            switch (exportType)
            {
            case "code":
                break;
            default:
                const patchIds = this.getModuleOption(CablesCLIExport.MODULE_OPTION_PATCH_ID);
                if (patchIds.length > 1)
                {
                    this._log.error("Export type '" + exportType + "' does not support multiple patch-ids.");
                    return;
                }
                const url = this.getExportUrl(patchIds[0]);
                const reqOptions = {
                    "method": "GET",
                    "headers": { "apikey": this.getApiKey() },
                };
                this._log.info("requesting export...");
                this._log.info("downloading from ", url.href, "...");
                const response = await fetch(url, reqOptions);
                if (response.ok)
                {
                    const json = await response.json();
                    if (json.log && Array.isArray(json.log))
                    {
                        const relevantEntries = json.log.filter((logEntry) => { return logEntry.level === "error";});
                        relevantEntries.forEach((logEntry) =>
                        {
                            this._log.info("\x1b[33m%s\x1b[0m", "[" + logEntry.level + "] " + logEntry.text);
                        });
                    }
                    let downloadUrl = new URL(json.urls.downloadUrl);
                    const tempFile = await this._downloadZip(downloadUrl);
                    this._log.info("download finished... ", tempFile);

                    let finalDir = path.join(process.cwd(), path.basename(json.urls.downloadUrl));
                    const destination = this.getModuleOption(CablesCLIExport.MODULE_OPTION_DESTINATION);
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
                        finalDir = path.join(process.cwd(), CablesCLIExport.DEFAULT_DESTINATION);
                    }

                    if (this.getModuleOption(CablesCLIExport.MODULE_OPTION_EXTRACT_ZIP))
                    {
                        this._log.info("extracting to " + finalDir);
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
                    const json = await response.json();
                    this._log.error("ERROR", json.msg);
                }
                break;
            }
        } catch (e)
        {
            this._log.error("ERROR", e.message);
        }
    }

    getCommandName()
    {
        return;
        "export";
    }

    requireApiKey()
    {
        return true;
    }

    getExportUrl(patchId)
    {
        const url = new URL("/api/project/" + patchId + "/export", this._baseUrl);
        url.searchParams.set("type", this.getModuleOption(CablesCLIExport.MODULE_OPTION_EXPORT_TYPE));
        if (this.getModuleOption(CablesCLIExport.MODULE_OPTION_COMBINE_JS)) url.searchParams.set("combineJs", "true");
        if (!this.getModuleOption(CablesCLIExport.MODULE_OPTION_EXTRACT_ZIP)) url.searchParams.set("noExtract", "true");
        if (this.getModuleOption(CablesCLIExport.MODULE_OPTION_USE_DEV)) url.searchParams.set("dev", "true");
        if (!this.getModuleOption(CablesCLIExport.MODULE_OPTION_INDEX_HTML)) url.searchParams.set("noIndex", "true");
        if (this.getModuleOption(CablesCLIExport.MODULE_OPTION_JSON_FILENAME))
        {
            const givenName = this.getModuleOption(CablesCLIExport.MODULE_OPTION_JSON_FILENAME);
            const jsonName = path.basename(givenName, path.extname(givenName));
            url.searchParams.set("jsonFilename", jsonName);
        }
        if (this.getModuleOption(CablesCLIExport.MODULE_OPTION_FLAT_EXPORT)) url.searchParams.set("noSubdirs", "true");
        if (this.getModuleOption(CablesCLIExport.MODULE_OPTION_SOURCEMAPS)) url.searchParams.set("sourcemaps", "true");
        if (!this.getModuleOption(CablesCLIExport.MODULE_OPTION_MINIFY)) url.searchParams.set("noMinify", "true");
        if (this.getModuleOption(CablesCLIExport.MODULE_OPTION_MINIFY_GLSL)) url.searchParams.set("minifyGlsl", "true");
        if (this.getModuleOption(CablesCLIExport.MODULE_OPTION_ASSET_EXPORT))
        {
            url.searchParams.set("assets", this.getModuleOption(CablesCLIExport.MODULE_OPTION_ASSET_EXPORT));
        }
        if (this.getModuleOption(CablesCLIExport.MODULE_OPTION_ASSET_EXPORT))
        {
            url.searchParams.set("assets", this.getModuleOption(CablesCLIExport.MODULE_OPTION_ASSET_EXPORT));

        }
        return url;
    }

    async _downloadZip(downloadUrl)
    {
        const tempFile = path.basename(downloadUrl.href, path.extname(downloadUrl.href)) + ".zip";
        const res = await fetch(downloadUrl, { "method": "HEAD" });
        this._log.debug("size:", Math.round(res.headers.get("content-length") / 1024) + "kb");
        let x = await fetch(downloadUrl, { "method": "GET" });
        x = await x.arrayBuffer();
        fs.writeFileSync(tempFile, Buffer.from(x));
        return tempFile;
    }
}
