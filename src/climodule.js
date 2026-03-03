import commandLineUsage from "command-line-usage";
import commandLineArgs from "command-line-args";
import { CablesCLI } from "../new.js";

/**
 * @abstract
 */
export class CablesCLIModule
{
    constructor()
    {
        this._cliParameters = {};
        this._cliOptions = [];
        this._commandUsage = {};
    }

    getUsageInfo()
    {
        const options = this.getParameterDefinitions();
        const header = {
            "header": "Usage:",
            "content": "cables " + (this.getCommandName() || "<command>") + " [options]",
        };
        const footer = {
            header: "Options",
            optionList: options.filter((option) => { return option.name !== "command";}),
        };
        return commandLineUsage([header, this._commandUsage, footer]);
    }

    initCliParameters()
    {
        const cliParams = commandLineArgs(this.getParameterDefinitions(), { stopAtFirstUnknown: true });
        if (cliParams.command)
        {
            const command = this.getCommand(cliParams.command);
            if (command)
            {
                if (this.getCommandName() && cliParams.help)
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
                if (!cliParams.help)
                {
                    console.error("Unknown command '" + cliParams.command + "', use one of:", CablesCLI.commands.map((c) => { return c.name; })
                        .join(","));
                }
            }
        }
        else
        {
            console.log(this.getUsageInfo());
            if (!cliParams.help)
            {
                console.error("No command given, use one of:", CablesCLI.commands.map((c) => { return c.name; })
                    .join(","));
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
        const parameterDefinitions = [
            {
                "name": "command",
                "defaultOption": true,
            },
            {
                "name": "help",
                "alias": "h",
                "type": Boolean,
            },
        ];
        return this._cliOptions.concat(parameterDefinitions);
    }

    getCliParameter(name)
    {
        return this._cliParameters[name];
    }


    getCommand(name)
    {
        return CablesCLI.commands.find((c) => { return c.name === name;});
    }
}
