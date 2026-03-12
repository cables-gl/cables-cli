import process from "node:process";
import commandLineUsage from "command-line-usage";
import commandLineArgs from "command-line-args";
import { Cables } from "../index.js";
import prompt from "prompt";
import { Logger } from "./logger.js";
import { UsageError } from "./usage_error.js";
import * as os from "node:os";
import path from "path";
import { parse, stringify } from "ini";
import fs from "fs";

/**
 * @template T
 * @typedef {Object} ModuleOptions
 * @property command
 * @property [apikey]
 * @property [url]
 * @property [help]
 * @property [dev]
 */

/**
 * @typedef {Object} ModuleRunResult
 * @property {Boolean} success
 * @property {Array<LogEntry>} log array of lines logged during run
 */

/**
 * @typedef {Object} CliOptionDefinition
 * @property {String} name
 * @property {Class} type
 * @property {String} [alias]
 * @property {String} [description]
 * @property {String} [typeLabel]
 * @property {Boolean} [multiple=false]
 * @property {Boolean} [required=false]
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

    /**
     *
     * @param {Boolean} [runningAsCli=false] are we running via cli or form a library, usually set automatically via context
     */
    constructor(runningAsCli = false)
    {
        this._cli = runningAsCli;
        this.log = new Logger(!this._cli);
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
                "name": CablesModule.MODULE_OPTION_COMMAND,
                "defaultOption": true,
            },
            {
                "name": CablesModule.MODULE_OPTION_HELP,
                "alias": "h",
                "type": Boolean,
            },
        ];
    }

    /**
     * @abstract
     * @return {Boolean}
     */
    requireApiKey()
    {
        return false;
    }

    /**
     * get usage output string for current context
     *
     * @return {String}
     */
    getUsageInfo()
    {
        const options = this._getModuleOptionDefinitions();
        const header = {
            "header": "Usage:",
            "content": "cables " + (this.getCommandName() || "<command>") + " [options]",
        };
        const localOptions = options.filter(
            (option) =>
            {
                return option.name !== CablesModule.MODULE_OPTION_COMMAND && !this._globalCliOptions.find((o) => { return o.name === option.name;});
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
            "optionList": this._globalCliOptions.filter((option) => { return option.name !== CablesModule.MODULE_OPTION_COMMAND;}),
        };

        return commandLineUsage([header, this._commandUsage, commandOptions, globalOptions]);
    }

    /**
     *
     * @param {ModuleOptions} options
     * @throws UsageError
     * @return {Promise<boolean>}
     */
    async initModuleOptions(options = {})
    {
        options = this._convertLibraryOptions(options);
        let moduleOptionDefinitions = this._getModuleOptionDefinitions();
        let moduleOptions = commandLineArgs(moduleOptionDefinitions, { stopAtFirstUnknown: true });
        moduleOptions = { ...options, ...moduleOptions };
        this._moduleOptions = moduleOptions;
        if (moduleOptions[CablesModule.MODULE_OPTION_USE_DEV]) this._baseUrl = CablesModule.CABLES_DEV_URL;
        if (moduleOptions[CablesModule.MODULE_OPTION_BASE_URL]) this._baseUrl = new URL(moduleOptions[CablesModule.MODULE_OPTION_BASE_URL]);
        if (this._baseUrl.hostname.includes("local"))
        {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        }
        if (moduleOptions[CablesModule.MODULE_OPTION_COMMAND])
        {
            const command = this.getCommand(moduleOptions[CablesModule.MODULE_OPTION_COMMAND]);
            if (command)
            {
                if (this.getCommandName() && moduleOptions[CablesModule.MODULE_OPTION_HELP])
                {
                    this.log.info(this.getUsageInfo());
                }
                else
                {
                    if (this.requireApiKey())
                    {
                        if (!moduleOptions[CablesModule.MODULE_OPTION_API_KEY])
                        {
                            if (this._localConfig.apikey) moduleOptions[CablesModule.MODULE_OPTION_API_KEY] = this._localConfig.apikey;
                        }
                        if (!moduleOptions[CablesModule.MODULE_OPTION_API_KEY])
                        {
                            if (this._cli)
                            {
                                const result = await prompt.get(CablesModule.MODULE_OPTION_API_KEY);
                                this._saveToLocalConfig(CablesModule.MODULE_OPTION_API_KEY, result[CablesModule.MODULE_OPTION_API_KEY]);
                                moduleOptions[CablesModule.MODULE_OPTION_API_KEY] = result[CablesModule.MODULE_OPTION_API_KEY];
                            }
                            if (!moduleOptions[CablesModule.MODULE_OPTION_API_KEY])
                            {
                                throw new UsageError("Cables API-Key is required to run command '" + command.name + "'");
                            }
                        }
                    }


                    const requiredOptions = moduleOptionDefinitions.filter((d) => { return d.required;});
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
                const commandNames = Cables.getCommands(true).map((c) => { return c.name; });
                const message = "Unknown command '" + moduleOptions[CablesModule.MODULE_OPTION_COMMAND] + "', use one of: " + commandNames.join(", ");
                throw new UsageError(message);
            }
        }
        else
        {
            const commandNames = Cables.getCommands(true).map((c) => { return c.name; });
            const message = "No command given, use one of: " + commandNames.join(",");
            throw new UsageError(message);
        }
    }

    /**
     * initialize and validate options, then run the cables module
     * @param {ModuleOptions} options
     * @return {Promise<ModuleRunResult>}
     */
    async run(options = {})
    {
        await this.initModuleOptions(options);
        return this.getResult();
    }

    /**
     *
     * @param {Boolean} success
     * @param {Array<LogEntry>} logEntries
     * @return ModuleRunResult
     */
    getResult(success = true, logEntries = [])
    {
        return {
            "success": success,
            "log": [...this.log.getEntries(), ...logEntries],
        };
    }

    /**
     * @abstract
     * @return {String}
     */
    getCommandName()
    {
        return "";
    }

    /**
     *
     * @return {ModuleOptions}
     */
    getModuleOptions()
    {
        return this._moduleOptions;
    }

    /**
     *
     * @param name
     * @return {*}
     */
    getModuleOption(name)
    {
        return this._moduleOptions[name];
    }

    /**
     *
     * @param name
     * @return {CommandDefinition}
     */
    getCommand(name)
    {
        return Cables.getCommands().find((c) => { return c.name === name;});
    }

    /**
     *
     * @return {String}
     */
    getApiKey()
    {
        return this.getModuleOption(CablesModule.MODULE_OPTION_API_KEY);
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
            if(rawFile) {
                configFromFile = parse(rawFile.toString());
            }
        } catch (e)
        {
            // configfile not found, return empty config
        }
        return configFromFile;
    }

    _saveToLocalConfig(key, value)
    {
        if (this._cli)
        {
            this._localConfig[key] = value;
            try
            {
                const iniText = stringify(this._localConfig);
                fs.writeFileSync(this._localConfigFileLocation, iniText);
                this.log.info(key, "saved in ~/" + CablesModule.CONFIG_FILENAME);
                this._localConfig = this._readLocalConfig();
            } catch (e)
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
                const definition = definitions.find((d) => { return d.name === optionKey;});
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
