#! /usr/bin/env node
import {pathToFileURL} from "node:url";
import process from "node:process";
import fs from "fs";
import {CablesCLIExport} from "./src/export.js";
import {CablesCLIUpload} from "./src/upload.js";
import {CablesCLIHeadless} from "./src/headless.js";
import {CablesCLIModule} from "./src/climodule.js";
import {UsageError} from "./src/usage_error.js";

export class CablesCLI extends CablesCLIModule {

    static COMMAND_NAME_EXPORT = "export";
    static COMMAND_NAME_UPLOAD = "upload";
    static COMMAND_NAME_HEADLESS = "headless";

    static commands = [
        {
            "name": CablesCLI.COMMAND_NAME_EXPORT,
            "description": "Export patches from " + CablesCLIModule.CABLES_URL.hostname,
            "class": CablesCLIExport,
        },
        {
            "name": CablesCLI.COMMAND_NAME_UPLOAD,
            "description": "Upload assets to patches on " + CablesCLIModule.CABLES_URL.hostname,
            "class": CablesCLIUpload,
        },
        {
            "name": CablesCLI.COMMAND_NAME_HEADLESS,
            "description": "Run an exported patch on the command line",
            "class": CablesCLIHeadless,
        },
    ];

    constructor(runningAsCli = false) {
        super(runningAsCli);
        let content = "";
        CablesCLI.commands.forEach((command, i) => {
            if (i > 0) content += "\n";
            content += command.name + "\t" + command.description;
        });
        this._commandUsage = {
            "header": "Commands",
            "content": content,
        };

    }

    getCommandName() {
        return "";
    }

    requireApiKey() {
        return false;
    }

    async run(options = {}) {
        await super.run(options);
        const commandParam = this.getModuleOption(CablesCLIModule.MODULE_OPTION_COMMAND);
        if (commandParam) {
            const command = this.getCommand(commandParam);
            let cliModule = new command.class(this._cli);
            return cliModule.run(options);
        }
    }

    async export(options = {}) {
        options.command = CablesCLI.COMMAND_NAME_EXPORT;
        return this.run(options);
    }

    async upload(options = {}) {
        options.command = CablesCLI.COMMAND_NAME_UPLOAD;
        return this.run(options);
    }

    async headless(options = {}) {
        options.command = CablesCLI.COMMAND_NAME_HEADLESS;
        return this.run(options);
    }
}

const runningAsCli = (() => {
    if (!process?.argv[1]) return false;
    const thisUrl = new URL(import.meta.url);
    const argv1Real = fs.realpathSync(process.argv[1]);       // resolve .bin/cables -> .../index.js
    const argv1Url = pathToFileURL(argv1Real);
    return thisUrl.href === argv1Url.href;                 // true only when invoked via that bin/script
})();

const cli = new CablesCLI(runningAsCli);
if (runningAsCli) {
    cli.run()
        .then((result) => {
            cli._log.info("success", result.success);
        })
        .catch((e) => {
            const help = cli.getModuleOption(CablesCLI.MODULE_OPTION_HELP);
            if (e instanceof UsageError) {
                cli._log.info(cli.getUsageInfo());
            }
            if (!help) cli._log.error(e.toString());
        });
}
