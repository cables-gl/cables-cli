#! /usr/bin/env node
const path = require("path");
const process = require("process");
const commandLineArgs = require("command-line-args");
const fs = require("fs");
const basename = require("basename");
const prompt = require("prompt");
const extract = require("extract-zip");
const fetch = require("node-fetch");
const mkdirp = require("mkdirp");

const { load } = require("home-config");

class CablesCli
{

    constructor()
    {
        this._configFilename = ".cablesrc";

        this._baseUrl = "https://cables.gl";
        this._devUrl = "https://dev.cables.gl";

        this._assetExportOptions = [
            "auto",
            "all",
            "none",
        ];

        this._cmdOptions = [
            {
                name: "export",
                alias: "e",
                type: String,
            },
            {
                name: "code",
                alias: "C",
                type: String,
            },
            {
                name: "patch",
                alias: "p",
                type: Boolean,
            },
            {
                name: "src",
                alias: "s",
                type: String,
            },
            {
                name: "destination",
                alias: "d",
                type: String,
            },
            {
                name: "no-index",
                alias: "i",
                type: Boolean,
            },
            {
                name: "no-extract",
                alias: "x",
                type: Boolean,
            },
            {
                name: "json-filename",
                alias: "j",
                type: String,
            },
            {
                name: "combine-js",
                alias: "c",
                type: String,
            },
            {
                name: "dev",
                alias: "D",
                type: String,
            },
            {
                name: "hideMadeWithCables",
                alias: "h",
                type: String,
            },
            {
                name: "assets",
                alias: "a",
                type: String,
            },
            {
                name: "no-subdirs",
                alias: "f",
                type: Boolean,
            },
            {
                name: "no-minify",
                alias: "m",
                type: Boolean,
            },
            {
                name: "sourcemaps",
                alias: "M",
                type: Boolean,
            },
            {
                name: "minify-glsl",
                alias: "g",
                type: Boolean,
            },
            {
                name: "url",
                type: String,
            },
            {
                name: "api-key",
                type: String,
            },
        ];

        this._cfg = load(this._configFilename);

        if (this._isRunAsCli())
        {
            this._options = commandLineArgs(this._cmdOptions);

            if (this._options["api-key"])
            {
                this._cfg.apikey = this._options["api-key"];
            }

            if (this._options.dev !== undefined)
            {
                this._baseUrl = this._devUrl;
            }

            if (this._options.url) this._baseUrl = this._options.url;

            if (this._options.export || this._options.patch)
            {
                if (!this._isApiKeyDefined())
                {
                    console.error("NO CONFIG FOUND!");
                    console.info("paste your apikey:");

                    prompt.get(["apikey"], (err, result) =>
                    {
                        this._cfg.apikey = result.apikey;
                        this._cfg.save();
                        this._doExport(this._options);
                        console.info("api key saved in ~/" + this._configFilename);
                    });
                }
                else
                {
                    this._doExport(this._options);
                }
            }
            else if (this._options.code)
            {
                if (!this._isApiKeyDefined())
                {
                    console.error("NO CONFIG FOUND!");
                    console.info("paste your apikey:");

                    prompt.get(["apikey"], (err, result) =>
                    {
                        this._cfg.apikey = result.apikey;
                        this._cfg.save();
                        this._doCodeExport(this._options);
                        console.info("api key saved in ~/" + this._configFilename);
                    });
                }
                else
                {
                    this._doCodeExport(this._options);
                }
            }
            else
            {
                const errMessage = "neither --export nor --code defined with correct parameters";
                console.error(errMessage);
            }
        }
    }

    /**
     * Returns true if run directly via node,
     * returns false if required as module
     *
     */
    _isRunAsCli()
    {
        return require.main === module;
    }

    _download(uri, filename, callback)
    {
        fetch(uri, { "method": "HEAD" })
            .then((res) =>
            {
                console.debug("size:", Math.round(res.headers.get("content-length") / 1024) + "kb");
                fetch(uri, { "method": "GET" })
                    .then(x => x.arrayBuffer())
                    .then(x => fs.writeFile(filename, Buffer.from(x), callback));
            });
    };

    _doExport(options, onFinished, onError)
    {

        let queryParams = "";

        // check for no-index option, which omits the index file
        if (options["no-index"] !== undefined)
        {
            queryParams += "removeIndexHtml=1&";
        }

        if (options["hideMadeWithCables"] !== undefined)
        {
            queryParams += "hideMadeWithCables=true&";
        }

        if (options["combine-js"] !== undefined)
        {
            queryParams += "combineJS=true&";
        }

        if (options["no-subdirs"] !== undefined)
        {
            queryParams += "flat=true&";
        }

        if (options["no-minify"] !== undefined)
        {
            queryParams += "minify=false&";
        }

        if (options["sourcemaps"] !== undefined)
        {
            queryParams += "sourcemaps=true&";
        }

        if (options["minify-glsl"] !== undefined)
        {
            queryParams += "minifyGlsl=true&";
        }

        const assetExport = options["assets"];
        if (assetExport !== undefined && this._assetExportOptions.includes(assetExport))
        {
            queryParams += "assets=" + options["assets"] + "&";
        }
        else
        {
            queryParams += "assets=auto&";
        }

        // check for json filename option to specify the json filename
        let jsonFn = options["json-filename"];
        if (jsonFn)
        {
            jsonFn = this.stripExtension(jsonFn);
            queryParams += "jsonName=" + jsonFn + "&";
        }

        if (options.patch)
        {
            queryParams += "type=patch&";
        }

        let cablesUrl = this._baseUrl;
        const url = cablesUrl + "/api/project/" + options.export + "/export?" + queryParams;

        const callback = (response) =>
        {
            if (response.log && Array.isArray(response.log))
            {
                const relevantEntries = response.log.filter((logEntry) => { return !!logEntry.level;});
                relevantEntries.forEach((logEntry) =>
                {
                    console.info("\x1b[33m%s\x1b[0m", "[" + logEntry.level + "] " + logEntry.text);
                });
            }
            const tempFile = basename(response.path) + ".zip";
            this._download(cablesUrl + response.path, tempFile, () =>
            {
                console.info("download finished... ", tempFile);

                let finalDir = path.join(process.cwd(), basename(response.path));
                if (options.destination !== undefined)
                { // flag "-d" is set
                    if (options.destination && options.destination.length > 0)
                    { // folder name passed after flag
                        if (path.isAbsolute(options.destination))
                        {
                            finalDir = options.destination;
                        }
                        else
                        {
                            finalDir = path.normalize(path.join(process.cwd(), options.destination)); // use custom directory
                        }
                    }
                    else
                    {
                        finalDir = path.join(process.cwd(), "patch"); // use directory "patch"
                    }
                }

                if (!options["no-extract"])
                {
                    console.info("extracting to " + finalDir);
                    extract(tempFile, { dir: finalDir })
                        .then(() =>
                        {
                            console.info("finished...");
                            if (onFinished) onFinished(finalDir);
                            fs.unlinkSync(tempFile);
                        })
                        .catch((err) =>
                            {
                                console.error(err);
                                if (onError)
                                {
                                    onError(err);
                                }
                            },
                        );
                }
                else
                {
                    const finalFilename = finalDir + basename(response.path) + ".zip";
                    fs.rename(tempFile, finalFilename, () =>
                    {
                        if (onFinished) onFinished(finalFilename);
                    });
                }
            });

        };

        console.info("requesting export...");
        console.info("downloading from ", url, "...");

        this._doFetch(url, "json")
            .then(callback)
            .catch((errMessage) =>
            {
                if (onError) onError(errMessage);
            });
    }

    _doCodeExport(options, onFinished, onError)
    {
        let cablesUrl = this._baseUrl;
        const patchIds = options.code;
        const url = cablesUrl + "/api/projects/" + patchIds + "/export_code";

        const callback = (response) =>
        {
            console.info("download finished... ");
            let finalDir = process.cwd();
            if (options.destination !== undefined)
            { // flag "-d" is set
                if (options.destination && options.destination.length > 0)
                { // folder name passed after flag
                    if (path.isAbsolute(options.destination))
                    {
                        finalDir = options.destination;
                    }
                    else
                    {
                        finalDir = path.normalize(path.join(process.cwd(), options.destination)); // use custom directory
                    }
                }
                else
                {
                    finalDir = path.join(process.cwd(), "patch/js"); // use directory "patch"
                }
            }

            const finalFilename = path.join(finalDir, "/ops.js");
            console.info("saving to " + finalFilename + "...");
            mkdirp.sync(finalDir);
            fs.writeFileSync(finalFilename, response);
            console.info("finished...");
            if (onFinished) onFinished(finalFilename);
        };

        console.info("requesting export...");
        console.info("downloading from", url, "...");

        this._doFetch(url, "text")
            .then(callback)
            .catch((errMessage) =>
            {
                if (onError)
                {onError(errMessage);}
            });
    }

    async _doFetch(url, format)
    {
        if (url.includes("local"))
        {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        }

        const reqOptions = { headers: { "apikey": this._cfg.apikey } };
        const response = await fetch(url, reqOptions);

        if (!response.ok || response.status !== 200)
        {
            let errMessage;
            switch (response.status)
            {
            case 500:
                errMessage = "unknown error, maybe try again";
                break;
            case 404:
                errMessage = "unknown project, check patchid: " + this._options.code;
                break;
            case 403:
                errMessage = "insufficient rights for project export, or over quota\n";
                errMessage += "code: " + response.status + "\n";
                errMessage += "body: " + await response.text();
                break;
            case 401:
                errMessage = "insufficient rights for project export\n";
                errMessage += "code: " + response.status + "\n";
                errMessage += "body: " + await response.text();
                break;
            case 400:
                errMessage = "invalid api key";
                break;
            default:
                errMessage = "invalid response\n";
                errMessage += "code: " + response.status + "\n";
                errMessage += "body: " + await response.text();
                break;
            }
            console.error("ERROR:", errMessage, reqOptions);
            throw new Error(errMessage);
        }

        let data = "";
        if (format === "json")
        {
            data = await response.json();
        }
        else
        {
            data = await response.text();
        }
        return data;
    }

    /**
     * Removes the file-extension from a file, e.g. "foo.json" -> `foo`
     * @param {string} filename - The filename to strip the extension from
     * @returns {string|undefined} - The filename without extension or undefined if filename is undefined
     */
    stripExtension(filename)
    {
        if (filename)
        {
            const lastDotIndex = filename.lastIndexOf(".");
            if (lastDotIndex > -1 && lastDotIndex < filename.length - 1)
            {
                return filename.substring(0, lastDotIndex);
            }
            return filename;
        }
    }

    /**
     * Checks if the api key was found in the config file
     */
    _isApiKeyDefined()
    {
        return this._cfg && this._cfg.apikey;
    }

    export(options, onFinished, onError)
    {
        if (!options || !options.patchId)
        {
            const errMessage = "no options set!";
            if (onError)
            {
                onError(errMessage);
            }
            return;
        }
        if (options.apiKey)
        {
            this._cfg.apikey = options.apiKey;
        }

        options["combine-js"] = options.combineJs;
        options["no-extract"] = options.noExtract;

        if (options.dev)
        {
            options["dev"] = options.dev;
        }
        if (options.noIndex)
        {
            options["no-index"] = options.noIndex;
        }
        if (options.hideMadeWithCables)
        {
            options["hideMadeWithCables"] = options.hideMadeWithCables;
        }
        if (options.jsonFilename)
        {
            options["json-filename"] = options.jsonFilename;
        }

        if (options.noSubdirs)
        {
            options["no-subdirs"] = options.noSubdirs;
        }

        if (options.sourcemaps)
        {
            options["sourcemaps"] = options.sourcemaps;
        }

        if (options.noMinify)
        {
            options["no-minify"] = options.noMinify;
        }

        if (options.minifyGlsl)
        {
            options["minify-glsl"] = options.minifyGlsl;
        }

        if (options.assets && this._assetExportOptions.includes(options.assets))
        {
            options["assets"] = options.assets;
        }
        else
        {
            options["assets"] = "auto";
        }

        if (!this._cfg.apikey)
        {
            if (onError)
            {
                onError("API key needed!");
            }
            return;
        }
        options.export = options.patchId; // bring it in the same format as the cli-arguments
        this._doExport(options, onFinished, onError);
    }

    code(options, onFinished, onError)
    {
        if (!options || !options.patchId)
        {
            const errMessage = "no options set!";
            if (onError)
            {
                onError(errMessage);
            }
            return;
        }
        if (options.apiKey)
        {
            this._cfg.apikey = options.apiKey;
        }

        if (options.dev)
        {
            options["dev"] = options.dev;
        }

        if (!this._cfg.apikey)
        {
            if (onError)
            {
                onError("API key needed!");
            }
            return;
        }
        options.code = options.patchId; // bring it in the same format as the cli-arguments
        this._doCodeExport(options, onFinished, onError);
    }
}

class CliExport
{
    constructor()
    {
        this._cli = new CablesCli();
    }

    export(options, onFinished, onError)
    {
        return this._cli.export(options, onFinished, onError);
    }

    code(options, onFinished, onError)
    {
        return this._cli.code(options, onFinished, onError);
    }
}

module.exports = new CliExport();
