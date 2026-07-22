import process from "node:process";
import commandLineUsage from "command-line-usage";
import commandLineArgs from "command-line-args";
import prompt from "prompt";
import * as os from "node:os";
import path from "path";
import { parse, stringify } from "ini";
import fs from "fs";
import { UsageError } from "./usage_error.js";
import { Logger } from "./logger.js";
import { Cables } from "../index.js";

/**
 * @typedef {Object} ModuleOptions
 * @property command
 * @property [apikey]
 * @property [url]
 * @property [help]
 * @property [dev]
 */

/**
 * @typedef {Object} ModuleRunResult
 * @property {boolean} success
 * @property {import("./logger").LogEntry} [error] last error with full information
 * @property {Array<import("./logger").LogEntry>} log array of lines logged during run
 */

/**
 * @typedef {Object} CliOptionDefinition
 * @property {string} name
 * @property {Class} type
 * @property {string} [alias]
 * @property {string} [description]
 * @property {string} [typeLabel]
 * @property {boolean} [multiple=false]
 * @property {boolean} [required=false]
 */

/**
 * @abstract
 */
export class CablesModule
{
    static CONFIG_FILENAME = ".cablesrc";

    static CABLES_URL = new URL("https://cables.gl");
    static CABLES_DEV_URL = new URL("https://dev.cables.gl");

    static MODULE_OPTION_COMMAND = "command";
    static MODULE_OPTION_API_KEY = "apikey";
    static MODULE_OPTION_BASE_URL = "url";
    static MODULE_OPTION_HELP = "help";
    static MODULE_OPTION_USE_DEV = "dev";
    static MODULE_OPTION_LOGLEVEL = "loglevel";

    /**
     *
     * @param {boolean} [runningAsCli=false] are we running via cli or form a library, usually set automatically via context
     */
    constructor(runningAsCli = false)
    {
        this._cli = runningAsCli;
        this.log = new Logger({ "silent": !this._cli });
        this._baseUrl = CablesModule.CABLES_URL;

        this._localConfigFileLocation = null;
        this._localConfig = {};
        if (runningAsCli)
        {
            this._localConfigFileLocation = path.join(os.homedir(), CablesModule.CONFIG_FILENAME);
            this._localConfig = this._readLocalConfig();
        }

        this._moduleOptions = {};
        this._commandUsage = {};

        /**
         * @type Array<CliOptionDefinition>
         * @private
         */
        this._cliOptions = [];

        /**
         * @type Array<CliOptionDefinition>
         * @private
         */
        this._globalCliOptions = [
            {
                "name": CablesModule.MODULE_OPTION_BASE_URL,
                "description": "Specify URL of cables endpoint to export from (for local development)",
                "type": String,
                "typeLabel": "URL",
            },
            {
                "name": CablesModule.MODULE_OPTION_API_KEY,
                "description": "Define apikey on the command line, overriding anything that might be in ~/.cablesrc",
                "type": String,
            },
            {
                "name": CablesModule.MODULE_OPTION_LOGLEVEL,
                "description": "Loglevel",
                "type": String,
                "typeLabel": "<debug|verbose|{underline info}|warn|error>",
            },
            {
                "name": CablesModule.MODULE_OPTION_HELP,
                "alias": "h",
                "type": Boolean,
            },
            {
                "name": CablesModule.MODULE_OPTION_COMMAND,
                "defaultOption": true,
            },

        ];
    }

    /**
     * @abstract
     * @returns {boolean}
     */
    requireApiKey()
    {
        return false;
    }

    /**
     * get usage output string for current context
     *
     * @returns {string}
     */
    getUsageInfo()
    {
        const options = this._getModuleOptionDefinitions();
        // eslint-disable-next-line no-restricted-syntax
        const cablesLogo = `                                     >>>  ___:_ _
       _ _:_______________ _____________ /   |\\\\   _ _______
          |  _           /\\\\\\\\_           \\\\    |\\\\\\\\.  _)     /\\\\       ______
    _____ | (/)        _/\\\\\\\\\\\\(_______    /    |\\\\\\\\| /    __/\\\\\\\\\\\\     /     /\\\\
   /   _/\\\\_      _    /_\\\\\\\\\\\\/_\\\\\\\\\\\\\\\\ _/   /     |\\\\\\\\|/     \\\\_\\\\\\\\\\\\/___ /     /\\\\\\\\\\\\
  /   /_\\\\\\\\|_     |\\\\     \\\\\\\\(    /\\\\ \\\\   /_    _:\\\\\\\\/__ /\\\\_/       /_\\\\   _/_\\\\\\\\/___
_/   /(     \\\\    |_\\\\     \\\\__  /_\\\\\\\\_)    \\\\         (_          /   \\\\          /\\\\
\\\\           _\\\\   \\\\___     _/             \\\\         /         /     \\\\_       /\\\\\\\\\\\\
 \\\\_________(    _|\\\\\\\\\\\\\\\\     \\\\_ ___________/   _    /_________/       /      /\\\\\\\\\\\\/
  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\|_____)\\\\\\\\\\\\        |\\\\\\\\\\\\\\\\\\\\/         (/)  /\\\\\\\\\\\\\\\\\\\\\\\\\\\\/                /_\\\\\\\\/
   \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_______:\\\\\\\\.\\\\/______________/\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\_________________(\\\\\\\\
 _|.._     \\\\\\\\\\\\\\\\\\\\\\\\\\\\)  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\| \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\/     \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
(_|||_)               \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\|  \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\/       \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\(
 ---|-->>`;

        const banner = {
            "content": cablesLogo,
            "raw": true
        };
        const header = {
            "header": "Usage:",
            "content": "cables " + (this.getCommandName() || "<command>") + " [options]",
        };
        const localOptions = options.filter(
            (option) =>
            {
                return option.name !== CablesModule.MODULE_OPTION_COMMAND && !this._globalCliOptions.find((o) => { return o.name === option.name; });
            });
        let commandOptions = {};
        if (localOptions.length > 0)
        {
            commandOptions = {
                "header": "Options:",
                "optionList": localOptions,
            };
        }
        const globalOptions = {
            "header": "Global Options:",
            "optionList": this._globalCliOptions.filter((option) => { return option.name !== CablesModule.MODULE_OPTION_COMMAND; }),
        };

        return commandLineUsage([banner, header, this._commandUsage, commandOptions, globalOptions]);
    }

    /**
     *
     * @param {ModuleOptions} options
     * @throws UsageError
     * @returns {Promise<boolean>}
     */
    async initModule(options = {})
    {
        options = this._convertLibraryOptions(options);
        let moduleOptionDefinitions = this._getModuleOptionDefinitions();
        let moduleOptions = commandLineArgs(moduleOptionDefinitions, { "stopAtFirstUnknown": true });

        moduleOptions = { ...moduleOptions, ...options };
        if (options.command) moduleOptions.command = options.command;
        this._moduleOptions = moduleOptions;

        if (moduleOptions[CablesModule.MODULE_OPTION_LOGLEVEL]) this.log.setLogLevel(moduleOptions[CablesModule.MODULE_OPTION_LOGLEVEL]);
        if (moduleOptions[CablesModule.MODULE_OPTION_USE_DEV]) this._baseUrl = CablesModule.CABLES_DEV_URL;
        if (moduleOptions[CablesModule.MODULE_OPTION_BASE_URL]) this._baseUrl = new URL(moduleOptions[CablesModule.MODULE_OPTION_BASE_URL]);
        if (this._baseUrl.hostname.includes("local"))
        {
            // add this to suppress the warning for self-signed certificates when run locally
            const originalEmit = process.emit;
            process.emit = (name, ...args) =>
            {
                const data = args[0];
                if (name === "warning" && typeof data === "object" && data.message && data.message.includes("NODE_TLS_REJECT_UNAUTHORIZED"))
                {
                    this.log.verbose(data.message);
                    return;
                }
                return originalEmit.apply(process, args);
            };
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        }
        if (moduleOptions[CablesModule.MODULE_OPTION_COMMAND])
        {
            const command = this.getCommand(moduleOptions[CablesModule.MODULE_OPTION_COMMAND]);
            if (command)
            {
                if (this.getCommandName() && moduleOptions[CablesModule.MODULE_OPTION_HELP])
                {
                    throw new UsageError(this.getUsageInfo());
                }
                else
                {
                    await this.assureApiKey(moduleOptions, this._baseUrl);
                    const requiredOptions = moduleOptionDefinitions.filter((d) => { return d.required; });
                    requiredOptions.forEach((ro) =>
                    {
                        if (!moduleOptions[ro.name])
                        {
                            let message = "MISSING: " + ro.description + ", use " + (this._cli ? "--" + ro.name : ro.name);
                            throw new UsageError(message);
                        }
                    });
                }
            }
            else
            {
                const commandNames = Cables.getCommands(true)
                    .map((c) => { return c.name; });
                const message = "Unknown command '" + moduleOptions[CablesModule.MODULE_OPTION_COMMAND] + "', use one of: " + commandNames.join(", ");
                throw new UsageError(message);
            }
        }
        else
        {
            const commandNames = Cables.getCommands(true)
                .map((c) => { return c.name; });
            const message = "No command given, use one of: " + commandNames.join(",");
            throw new UsageError(message);
        }
    }

    /**
     * initialize and validate options, then run the cables module
     * @param {ModuleOptions} options
     * @returns {Promise<ModuleRunResult>}
     */
    async run(options = {})
    {
        await this.initModule(options);
        return this.getResult();
    }

    /**
     *
     * @param {boolean} success
     * @param {Array<import("./logger").LogEntry>} logEntries
     * @returns {ModuleRunResult}
     */
    getResult(success = true, logEntries = [])
    {
        const log = [...this.log.getEntries(), ...logEntries];
        const result = { "success": success };
        if (success === false)
        {
            result.error = log[log.length - 1];
        }
        result.log = log;
        return result;
    }

    /**
     * @abstract
     * @returns {string}
     */
    getCommandName()
    {
        return "";
    }

    /**
     *
     * @returns {ModuleOptions}
     */
    getModuleOptions()
    {
        return this._moduleOptions;
    }

    /**
     *
     * @param name
     * @returns {*}
     */
    getModuleOption(name)
    {
        return this._moduleOptions[name];
    }

    /**
     *
     * @param name
     * @returns {CommandDefinition}
     */
    getCommand(name)
    {
        return Cables.getCommands()
            .find((c) => { return c.name === name; });
    }

    /**
     *
     * @returns {string}
     */
    getApiKey()
    {
        return this.getModuleOption(CablesModule.MODULE_OPTION_API_KEY);
    }

    /**
     *
     * @param {ModuleOptions} moduleOptions
     * @param {URL} url
     * @returns {Promise<void>}
     */
    async assureApiKey(moduleOptions, url)
    {
        if (!this.requireApiKey()) return;
        if (!moduleOptions[CablesModule.MODULE_OPTION_API_KEY])
        {
            if (this._localConfig[url.hostname]) moduleOptions[CablesModule.MODULE_OPTION_API_KEY] = this._localConfig[url.hostname];
        }
        if (!moduleOptions[CablesModule.MODULE_OPTION_API_KEY])
        {
            if (this._cli)
            {
                const promptSchema = {
                    "properties": {
                        "apikey": {
                            "type": "string",
                            "description": "API-Key for " + url.hostname,
                            "required": true
                        }
                    }
                };
                const result = await prompt.get(promptSchema);
                this._saveToLocalConfig(url.hostname, result[CablesModule.MODULE_OPTION_API_KEY]);
                moduleOptions[CablesModule.MODULE_OPTION_API_KEY] = result[CablesModule.MODULE_OPTION_API_KEY];
            }
            if (!moduleOptions[CablesModule.MODULE_OPTION_API_KEY])
            {
                throw new UsageError("Cables API-Key is required to run command '" + this.getCommandName() + "'");
            }
        }
    }

    getHttpResponseErrorMessage(responseJson, responseStatus)
    {
        if (responseStatus !== 200)
        {
            let errMessage;
            let errorText = "";
            try
            {
                const errorJson = responseJson;
                errorText = errorJson.msg || JSON.stringify(errorJson);
            }
            catch (e)
            {
                errorText = responseJson;
                // use text, see above
            }
            switch (responseStatus)
            {
            case 400:
                errMessage = "Bad request: " + errorText;
                break;
            case 403:
            case 401:
                errMessage = "Insufficient rights for " + this.getCommandName();
                if (errorText && errorText === "ERR_INVALID_APIKEY")
                {
                    errMessage += ": invalid apikey";
                }
                break;
            case 404:
                errMessage = "Unknown patch, check patchid: " + this._moduleOptions.patch + " (" + this._moduleOptions.url + "/" + this._moduleOptions.patch + ")";
                break;
            case 413:
                errMessage = "Over " + this.getCommandName() + " quota";
                break;
            case 500:
                errMessage = "Unknown server-error, maybe try again...";
                break;
            default:
                errMessage = "Invalid response:";
                errMessage += "code: " + responseStatus + "\n";
                errMessage += "body: " + errorText;
                break;
            }
            return errMessage;
        }
    }

    _getModuleOptionDefinitions()
    {
        return this._cliOptions.concat(this._globalCliOptions);
    }

    _readLocalConfig()
    {
        let configFromFile = {};
        try
        {
            const rawFile = fs.readFileSync(this._localConfigFileLocation);
            if (rawFile)
            {
                configFromFile = parse(rawFile.toString());
            }
        }
        catch (e)
        {
            // configfile not found, return empty config
        }
        return configFromFile;
    }

    _saveToLocalConfig(key, value)
    {
        if (this._cli)
        {
            delete this._localConfig[CablesModule.MODULE_OPTION_API_KEY]; // old format
            delete this._localConfig["api-key"]; // old format
            this._localConfig[key] = value;
            try
            {
                const iniText = stringify(this._localConfig);
                fs.writeFileSync(this._localConfigFileLocation, iniText);
                this.log.info(key, "saved in ~/" + CablesModule.CONFIG_FILENAME);
                this._localConfig = this._readLocalConfig();
            }
            catch (e)
            {
                throw new UsageError("failed to save " + key + " to " + this._localConfigFileLocation);
            }
        }
    }

    _convertLibraryOptions(options = {})
    {
        const definitions = this._getModuleOptionDefinitions();
        Object.keys(options)
            .forEach((optionKey) =>
            {
                const value = options[optionKey];
                const definition = definitions.find((d) => { return d.name === optionKey; });
                if (definition)
                {
                    if (definition.multiple)
                    {
                        if (!Array.isArray(value))
                        {
                            options[optionKey] = [value];
                        }
                    }
                }
            });
        return options;
    }
}
