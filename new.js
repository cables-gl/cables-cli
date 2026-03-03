#! /usr/bin/env node
import { CablesCLIExport } from "./src/export.js";
import { CablesCLIUpload } from "./src/upload.js";
import { CablesCLIHeadless } from "./src/headless.js";
import { CablesCLIModule } from "./src/climodule.js";

export class CablesCLI extends CablesCLIModule
{

    static commands = [
        {
            "name": "export",
            "description": "Export patches from cables.gl",
            "class": CablesCLIExport,
        },
        {
            "name": "upload",
            "description": "Upload assets to patches on cables.gl",
            "class": CablesCLIUpload,
        },
        {
            "name": "headless",
            "description": "Run an exported patch on the command line",
            "class": CablesCLIHeadless,
        },
    ];

    constructor() {
        super();
        let content = "";
        CablesCLI.commands.forEach((command, i) => {
            if(i > 0) content += "\n";
            content += command.name + "\t" +  command.description;
        })
        this._commandUsage = {
            "header": "Commands",
            "content": content
        }
    }

    run() {
        super.run();
        const commandParam = this.getCliParameter("command");
        if(commandParam) {
            const command = this.getCommand(commandParam);
            let cliModule = new command.class;
            cliModule.run();
        }
    }

    getCommandName()
    {
        return "";
    }

    getUsageInfo()
    {
        const usageInfo =  super.getUsageInfo();
        usageInfo.p
        return usageInfo;
    }
}

const cli = new CablesCLI();
cli.run();
