import { CablesCLIModule } from "./climodule.js";

export class CablesCLIExport extends CablesCLIModule
{
    constructor()
    {
        super();
        this._cliOptions = [
            {
                name: "export",
                alias: "e",
                "description": "Export patch, to use on a webserver",
                type: String,
                "typeLabel": "{underline PATCHID}"
            },
            {
                name: "code",
                alias: "C",
                "multiple": true,
                "description": "Export ops code for patch(es)",
                type: String,
                "typeLabel": "{underline PATCHID[]}"
            },
            {
                name: "patch",
                alias: "p",
                "description": "Export patch, to use in cables standalone",
                type: Boolean,
                "typeLabel": "{underline PATCHID}"
            },
            {
                name: "destination",
                alias: "d",
                "description": "Folder to download the patch to, can either be absolute or relative",
                type: String,
                "typeLabel": "{underline dir}"
            },
            {
                name: "no-index",
                alias: "i",
                "description": "Will not include/overwrite index.html in the export",
                type: Boolean,
            },
            {
                name: "no-extract",
                alias: "x",
                "description": "Do not extract the downloaded zip file",
                type: Boolean,
            },
            {
                name: "json-filename",
                alias: "j",
                "description": "Define the filename of the patch json file",
                type: String,
                "typeLabel": "{underline file}"
            },
            {
                name: "combine-js",
                alias: "c",
                "description": "Combine javascript and json into a single patch.js",
                type: Boolean,
            },
            {
                name: "dev",
                alias: "D",
                "description": "Export from dev.cables.gl",
                type: Boolean,
            },
            {
                name: "assets",
                alias: "a",
                "description": "Export assets of patch",
                "defaultValue": "auto",
                type: String,
                "typeLabel": "<auto|all|none>"
            },
            {
                name: "no-subdirs",
                alias: "f",
                "description": "Put js and assets into same directory as index.html (\"flat export\")",
                type: Boolean,
            },
            {
                name: "no-minify",
                alias: "m",
                "description": "Do not minify code",
                type: Boolean,
            },
            {
                name: "sourcemaps",
                alias: "M",
                "description": "If code is minified, add sourcemaps to the export",
                type: Boolean,
            },
            {
                name: "minify-glsl",
                alias: "g",
                "description": "Minifies shader-code in .frag and .att attachments",
                type: Boolean,
            },
        ];
    }

    run()
    {
        super.run();
    }

    getCommandName()
    {
        return "export";
    }
}
