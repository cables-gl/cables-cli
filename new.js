#! /usr/bin/env node
import { fileURLToPath } from "node:url";
import process from "node:process";
import homeConfig from "home-config";
import { CablesCLIExport } from "./src/export.js";
import { CablesCLIUpload } from "./src/upload.js";
import { CablesCLIHeadless } from "./src/headless.js";
import { CablesCLIModule } from "./src/climodule.js";

export class CablesCLI extends CablesCLIModule
{

    static CONFIG_FILENAME = ".cablesrc";

    static commands = [
        {
            "name": "export",
            "description": "Export patches from " + CablesCLIModule.CABLES_URL.hostname,
            "class": CablesCLIExport,
        },
        {
            "name": "upload",
            "description": "Upload assets to patches on " + CablesCLIModule.CABLES_URL.hostname,
            "class": CablesCLIUpload,
        },
        {
            "name": "headless",
            "description": "Run an exported patch on the command line",
            "class": CablesCLIHeadless,
        },
    ];

    constructor(runningAsCli = false)
    {
        super(runningAsCli);
        let content = "";
        CablesCLI.commands.forEach((command, i) =>
        {
            if (i > 0) content += "\n";
            content += command.name + "\t" + command.description;
        });
        this._commandUsage = {
            "header": "Commands",
            "content": content,
        };

    }

    getCommandName()
    {
        return "";
    }

    requireApiKey()
    {
        return false;
    }

    async run(options = {})
    {
        if (this._cli)
        {
            const configFromFile = homeConfig.load(CablesCLI.CONFIG_FILENAME);
            if (configFromFile.apikey) options[CablesCLIModule.MODULE_OPTION_API_KEY] = configFromFile.apikey;
        }
        await super.run(options);
        const commandParam = this.getModuleOption("command");
        if (commandParam)
        {
            const command = this.getCommand(commandParam);
            let cliModule = new command.class(this._cli);
            await cliModule.run(options);
        }
    }
}

const fromCli = process?.argv?.includes(fileURLToPath(import.meta.url));
const cli = new CablesCLI(fromCli);
if (fromCli)
{
    cli.run()
        .then(() =>
        {
            console.log("DONE");
        });
}
else
{
    console.info("running as a library");
}
