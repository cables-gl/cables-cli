import commandLineUsage from "command-line-usage";
import commandLineArgs from "command-line-args";
import { CablesCLI } from "../new.js";

/**
 * @abstract
 */
export class CablesCLIModule
{
    static CABLES_URL = new URL("https://cables.gl");
    static CABLES_DEV_URL = new URL("https://dev.cables.gl");

    static CLI_PARAM_COMMAND = "command";

    static CLI_PARAM_API_KEY = "api-key";
    static CLI_PARAM_BASE_URL = "url";
    static CLI_PARAM_HELP = "help";

    constructor()
    {
        this._baseUrl = CablesCLIModule.CABLES_URL;
        this._cliParameters = {};
        this._cliOptions = [];
        this._commandUsage = {};
        this._globalCliOptions = [
            {
                name: CablesCLIModule.CLI_PARAM_BASE_URL,
                "description": "Specify URL of cables endpoint to export from (for local development)",
                type: String,
                "typeLabel": "URL",
            },
            {
                name: CablesCLIModule.CLI_PARAM_API_KEY,
                "description": "Define apikey on the command line, overriding anything that might be in ~/.cablesrc",
                type: String,
            },
            {
                "name": CablesCLIModule.CLI_PARAM_COMMAND,
                "defaultOption": true,
            },
            {
                "name": CablesCLIModule.CLI_PARAM_HELP,
                "alias": "h",
                "type": Boolean,
            },
        ];
    }

    getUsageInfo()
    {
        const options = this.getParameterDefinitions();
        const header = {
            "header": "Usage:",
            "content": "cables " + (this.getCommandName() || "<command>") + " [options]",
        };
        const localOptions = options.filter(
            (option) => { return option.name !== CablesCLIModule.CLI_PARAM_COMMAND && !this._globalCliOptions.find((o) => { return o.name === option.name;});});
        let commandOptions = {};
        if (localOptions.length > 0)
        {
            commandOptions = {
                "header": "Options:",
                "optionList": localOptions,
            };
        }
        const globalOptions = {
            "header": "Global:",
            "optionList": this._globalCliOptions.filter((option) => { return option.name !== CablesCLIModule.CLI_PARAM_COMMAND;}),
        };


        return commandLineUsage([header, this._commandUsage, commandOptions, globalOptions]);
    }

    initCliParameters()
    {
        const cliParams = commandLineArgs(this.getParameterDefinitions(), { stopAtFirstUnknown: true });
        if(cliParams[CablesCLIModule.CABLES_DEV_URL]) this._baseUrl = this.CABLES_DEV_URL;
        if(cliParams[CablesCLIModule.CLI_PARAM_BASE_URL]) this._baseUrl = new URL(cliParams[CablesCLIModule.CLI_PARAM_BASE_URL]);
        if (cliParams[CablesCLIModule.CLI_PARAM_COMMAND])
        {
            const command = this.getCommand(cliParams[CablesCLIModule.CLI_PARAM_COMMAND]);
            if (command)
            {
                if (this.getCommandName() && cliParams[CablesCLIModule.CLI_PARAM_HELP])
                {
                    console.log(this.getUsageInfo());
                }
                else
                {
                    this._cliParameters = cliParams;
                }
            }
            else
            {
                console.log(this.getUsageInfo());
                if (!cliParams[CablesCLIModule.CLI_PARAM_HELP])
                {
                    console.error("Unknown command '" + cliParams[CablesCLIModule.CLI_PARAM_COMMAND] + "', use one of:", CablesCLI.commands.map((c) => { return c.name; }).join(","));
                }
            }
        }
        else
        {
            console.log(this.getUsageInfo());
            if (!cliParams[CablesCLIModule.CLI_PARAM_HELP])
            {
                console.error("No command given, use one of:", CablesCLI.commands.map((c) => { return c.name; }).join(","));
            }
        }
        return false;
    }

    run()
    {
        this.initCliParameters();
    }

    /**
     * @abstract
     */
    getCommandName()
    {
        return "";
    }

    getParameterDefinitions()
    {
        return this._cliOptions.concat(this._globalCliOptions);
    }

    getCliParameter(name)
    {
        return this._cliParameters[name];
    }


    getCommand(name)
    {
        return CablesCLI.commands.find((c) => { return c.name === name;});
    }

    getApiKey() {
        return this.getCliParameter("api-key");
    }
}
