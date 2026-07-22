#! /usr/bin/env node
import { pathToFileURL } from "node:url";
import process from "node:process";
import fs from "fs";
import { CablesExport } from "./src/export.js";
import { CablesImport } from "./src/import.js";
import { CablesUpload } from "./src/upload.js";
import { CablesHeadless } from "./src/headless.js";
import { CablesModule } from "./src/module.js";
import { UsageError } from "./src/usage_error.js";

/**
 * @typedef CommandDefinition
 *
 * @property {string} name
 * @property {string} description
 * @property {CablesModule} class
 * @property {boolean} [visible]
 */

const runningAsCli = (() =>
{
    if (!process?.argv[1]) return false;
    const thisUrl = new URL(import.meta.url);
    const argv1Real = fs.realpathSync(process.argv[1]); // resolve .bin/cables -> .../index.js
    const argv1Url = pathToFileURL(argv1Real);
    return thisUrl.href === argv1Url.href; // true only when invoked via that bin/script
})();

export class Cables extends CablesModule
{

    static COMMAND_NAME_EXPORT = "export";
    static COMMAND_NAME_IMPORT = "import";
    static COMMAND_NAME_UPLOAD = "upload";
    static COMMAND_NAME_HEADLESS = "headless";

    /**
     *
     * @type {Array<CommandDefinition>}
     */
    static commands = [
        {
            "name": Cables.COMMAND_NAME_EXPORT,
            "description": "Export patches from " + CablesModule.CABLES_URL.hostname,
            "class": CablesExport,
        },
        {
            "name": Cables.COMMAND_NAME_IMPORT,
            "description": "Import patches to " + CablesModule.CABLES_URL.hostname,
            "class": CablesImport,
        },
        {
            "name": Cables.COMMAND_NAME_UPLOAD,
            "description": "Upload assets to patches on " + CablesModule.CABLES_URL.hostname,
            "class": CablesUpload,
        },
        {
            "name": Cables.COMMAND_NAME_HEADLESS,
            "description": "Run an exported patch on the command line",
            "class": CablesHeadless,
            "visible": false,
        },
    ];

    /**
     *
     * @param {boolean} [visibleOnly=false]
     * @returns {Array<CommandDefinition>}
     */
    static getCommands(visibleOnly = false)
    {
        let commands = Cables.commands;
        if (visibleOnly) commands = commands.filter((command) => { return command.visible !== false; });
        return commands;
    }

    constructor(asCli = false)
    {
        super(asCli);
        let content = "";
        Cables.getCommands(true).forEach((command, i) =>
        {
            if (i > 0) content += "\n";
            content += command.name + "\t" + command.description;
        });
        this._commandUsage = {
            "header": "Commands",
            "content": content,
        };
    }

    /**
     *
     * @returns {string}
     */
    getCommandName()
    {
        return "";
    }

    /**
     *
     * @returns {boolean}
     */
    requireApiKey()
    {
        return false;
    }

    /**
     * run raw command, use: export, upload, import methods instead. otherwise define `command` in options
     *
     * @param {import("./src/module.js").ModuleOptions} [options]
     * @returns {Promise<import("./src/module.js").ModuleRunResult>}
     */
    async run(options = {})
    {
        await super.run(options);
        const commandParam = this.getModuleOption(CablesModule.MODULE_OPTION_COMMAND);
        if (commandParam)
        {
            const command = this.getCommand(commandParam);
            let cliModule = new command.class(this._cli);
            return cliModule.run(options);
        }
    }

    /**
     * export cables patch
     *
     * @param {import("./src/export.js").ExportModuleOptions} [options]
     * @returns {Promise<import("./src/export.js").ExportModuleRunResult>}
     */
    async export(options = {})
    {
        options.command = Cables.COMMAND_NAME_EXPORT;
        return this.run(options);
    }

    /** import cables patch
     *
     * @param {import("./src/import.js").ImportModuleOptions} [options]
     * @returns {Promise<import("./src/import.js").ImportModuleRunResult>}
     */
    async import(options = {})
    {
        options.command = Cables.COMMAND_NAME_IMPORT;
        return this.run(options);
    }

    /**
     * upload assets to cables patch
     *
     * @param {import("./src/upload.js").UploadModuleOptions} [options]
     * @returns {Promise<import("./src/upload.js").UploadModuleRunResult>}
     */
    async upload(options = {})
    {
        options.command = Cables.COMMAND_NAME_UPLOAD;
        return this.run(options);
    }

    /**
     *
     * run exported cables patch headless
     *
     * @param {import("./src/headless.js").HeadlessModuleOptions} [options]
     * @returns {Promise<import("./src/headless.js").HeadlessModuleRunResult>}
     */
    async headless(options = {})
    {
        options.command = Cables.COMMAND_NAME_HEADLESS;
        return this.run(options);
    }
}

if (runningAsCli)
{
    const cli = new Cables(runningAsCli);
    cli.run().catch((e) =>
    {
        const help = cli.getModuleOption(Cables.MODULE_OPTION_HELP);
        if (e instanceof UsageError)
        {
            cli.log.info(cli.getUsageInfo());
        }
        if (!help) cli.log.error(e.toString());
    });
}
