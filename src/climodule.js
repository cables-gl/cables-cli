import process from "node:process";
import commandLineUsage from "command-line-usage";
import commandLineArgs from "command-line-args";
import { CablesCLI } from "../new.js";
import prompt from "prompt";
import homeConfig from "home-config";
import { Logger } from "./logger.js";
import { UsageError } from "./usage_error.js";

/**
 * @abstract
 */
export class CablesCLIModule
{
    static CABLES_URL = new URL("https://cables.gl");
    static CABLES_DEV_URL = new URL("https://dev.cables.gl");

    static MODULE_OPTION_COMMAND = "command";
    static MODULE_OPTION_API_KEY = "api-key";
    static MODULE_OPTION_BASE_URL = "url";
    static MODULE_OPTION_HELP = "help";
    static MODULE_OPTION_USE_DEV = "dev";

    static HOMECONFIG_OPTION_API_KEY = "apikey";

    constructor(runningAsCli = false)
    {
        this._cli = runningAsCli;
        this._log = new Logger(!this._cli);
        this._baseUrl = CablesCLIModule.CABLES_URL;

        this._moduleOptions = {};
        this._cliOptions = [];
        this._commandUsage = {};
        this._globalCliOptions = [
            {
                name: CablesCLIModule.MODULE_OPTION_BASE_URL,
                "description": "Specify URL of cables endpoint to export from (for local development)",
                type: String,
                "typeLabel": "URL",
            },
            {
                name: CablesCLIModule.MODULE_OPTION_API_KEY,
                "description": "Define apikey on the command line, overriding anything that might be in ~/.cablesrc",
                type: String,
            },
            {
                "name": CablesCLIModule.MODULE_OPTION_COMMAND,
                "defaultOption": true,
            },
            {
                "name": CablesCLIModule.MODULE_OPTION_HELP,
                "alias": "h",
                "type": Boolean,
            },
        ];
    }

    /**
     * @abstract
     */
    requireApiKey()
    {
        return false;
    }

    getUsageInfo()
    {
        const options = this.getModuleOptionDefinitions();
        const header = {
            "header": "Usage:",
            "content": "cables " + (this.getCommandName() || "<command>") + " [options]",
        };
        const localOptions = options.filter(
            (option) =>
            {
                return option.name !== CablesCLIModule.MODULE_OPTION_COMMAND && !this._globalCliOptions.find((o) => { return o.name === option.name;});
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
            "optionList": this._globalCliOptions.filter((option) => { return option.name !== CablesCLIModule.MODULE_OPTION_COMMAND;}),
        };


        return commandLineUsage([header, this._commandUsage, commandOptions, globalOptions]);
    }

    async initModuleOptions(options = {})
    {
        options = this.convertLibraryOptions(options);
        let moduleOptionDefinitions = this.getModuleOptionDefinitions();
        let moduleOptions = commandLineArgs(moduleOptionDefinitions, { stopAtFirstUnknown: true });
        moduleOptions = { ...options, ...moduleOptions };
        this._moduleOptions = moduleOptions;
        if (moduleOptions[CablesCLIModule.MODULE_OPTION_USE_DEV]) this._baseUrl = CablesCLIModule.CABLES_DEV_URL;
        if (moduleOptions[CablesCLIModule.MODULE_OPTION_BASE_URL]) this._baseUrl = new URL(moduleOptions[CablesCLIModule.MODULE_OPTION_BASE_URL]);
        if (this._baseUrl.hostname.includes("local"))
        {
            process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
        }
        if (moduleOptions[CablesCLIModule.MODULE_OPTION_COMMAND])
        {
            const command = this.getCommand(moduleOptions[CablesCLIModule.MODULE_OPTION_COMMAND]);
            if (command)
            {
                if (this.getCommandName() && moduleOptions[CablesCLIModule.MODULE_OPTION_HELP])
                {
                    this._log.info(this.getUsageInfo());
                }
                else
                {
                    if (this.requireApiKey())
                    {
                        if (!moduleOptions[CablesCLIModule.MODULE_OPTION_API_KEY])
                        {
                            const configFromFile = homeConfig.load(CablesCLI.CONFIG_FILENAME);
                            if (configFromFile.apikey) moduleOptions[CablesCLIModule.MODULE_OPTION_API_KEY] = configFromFile.apikey;
                        }
                        if (!moduleOptions[CablesCLIModule.MODULE_OPTION_API_KEY])
                        {
                            if (this._cli)
                            {
                                const result = await prompt.get(CablesCLIModule.MODULE_OPTION_API_KEY);
                                this._saveToHomeConfig(CablesCLIModule.HOMECONFIG_OPTION_API_KEY, result[CablesCLIModule.HOMECONFIG_OPTION_API_KEY]);
                                moduleOptions[CablesCLIModule.MODULE_OPTION_API_KEY] = result[CablesCLIModule.HOMECONFIG_OPTION_API_KEY];
                            }
                            if (!moduleOptions[CablesCLIModule.MODULE_OPTION_API_KEY])
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
                const commandNames = CablesCLI.commands.map((c) => { return c.name; });
                const message = "Unknown command '" + moduleOptions[CablesCLIModule.MODULE_OPTION_COMMAND] + "', use one of: " + commandNames.join(", ");
                throw new UsageError(message, true);
            }
        }
        else
        {
            throw new UsageError("No command given, use one of:" + CablesCLI.commands.map((c) => { return c.name; })
                .join(","), true);
        }
        return false;
    }

    async run(options = {})
    {
        await this.initModuleOptions(options);
        return this.getResult();
    }

    getResult(success = true, logEntries = [])
    {
        return {
            "success": success,
            "log": [...this._log.getEntries(), ...logEntries],
        };
    }

    /**
     * @abstract
     */
    getCommandName()
    {
        return "";
    }

    getModuleOptionDefinitions()
    {
        return this._cliOptions.concat(this._globalCliOptions);
    }

    getModuleOptions()
    {
        return this._moduleOptions;
    }

    getModuleOption(name)
    {
        return this._moduleOptions[name];
    }

    getCommand(name)
    {
        return CablesCLI.commands.find((c) => { return c.name === name;});
    }

    getApiKey()
    {
        return this.getModuleOption(CablesCLIModule.MODULE_OPTION_API_KEY);
    }

    _saveToHomeConfig(key, value)
    {
        if (this._cli)
        {
            const configFromFile = homeConfig.load(CablesCLI.CONFIG_FILENAME);
            configFromFile[key] = value;
            configFromFile.save();
            this._log.info(key, "saved in ~/" + CablesCLI.CONFIG_FILENAME);

        }
    }

    convertLibraryOptions(options = {})
    {
        const definitions = this.getModuleOptionDefinitions();
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
