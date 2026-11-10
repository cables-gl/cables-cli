# cables-cli

[npm.org](https://www.npmjs.com/package/@cables/cables)

_Command line tool to export and download [cables](https://cables.gl) patches from the command line_

```
   _ ____       ________  ___________             ______      ______
._(//   /   ___)\_     /(_\___      /(___        /     /     /     /
|     _/___)\ _  /        _  /          /______)/    _/(___ /     /(_____..___
|_    \/      / _         /_/    _/   _//      /    _)     / ____        ||  //
 /          _/  /        /_\     \    \(      /     \    _/   _ /       _||_/
/___________)__/        __________\____________\______       \\/________)diP
- ------------/________/------------------------------\_______\------------- -

```

## Installation

Run `npm install -g @cables/cables`

Create an API key on [cables.gl/settings](https://cables.gl/settings#apikey) —> navigate to `API key` —> press `Generate`.
When you first start the tool it will show a prompt for the API key. Once entered your API key will be stored
in `~/.cablesrc`.

## Usage on command line

To get an overview about different commands and general usage run:

```shell
cables --help
```

For options of a specific command (e.g. export) run:

```shell
cables export --help
```

Global options for all the commands below are:

-   `--url` `[URL]` Specify base URL of cables api to use (e.g. for local development)
-   `--apikey` `[string]` Define apikey on the command line, overriding anything that might be in ~/.cablesrc
-   `--loglevel` `<debug|verbose|info|warn|error>` log level
-   `-h`/`--help` Show usage info about current command

### Export

To export and download a cables patch into a specific directory run:

```shell
cables export -d [DESTINATION] -p [PATCHID]
```

You can find the patch ID by opening your patch in the cables editor – the last part of the URL is the patch ID, e.g.:

```shell
https://cables.gl/edit/pQpie9
—> pQpie9 is the patch ID
```

Example:

```shell
cables export -d "my-patch" -p pQpie9
```

**IMPORTANT:** Running this command will overwrite everything in the `my-patch`-folder.

Additional options to configure your export are available via:

```shell
cables export --help
```

#### Export Code (`--type code`) Example:

If you just need the op-code of one or more patches you created, you can
use the `--type code` option and provide a comma-separated list of patch-ids to
download `ops.js` with all code included.

This is helpful, when you want to add multiple patches to one page. Download
the patches individually (do NOT use `--combinejs`). Then load libs and `cables.min.js`
as provided in the individual `index.html` and swap out `ops.js` with this download.

```shell
cables export --type code --combinejs false -d "public" -p pQpie9
```

#### Export Headless (`--type headless`) Example:

To run cables patches in headless-mode on the command like, check the [documentation](https://cables.gl/docs/4_export_embed/dev_embed/export_headless/export_headless) and then run:

```shell
cables export --type headless -d "headlesspatch" -p JXIgAA
cd headlesspatch
npm install
node run
```

### Import

To import a cables patch (e.g. a backup or a patch created in [cables standalone](https://cables.gl/standalone)) run:

```shell
cables import -d patch_export
```

**IMPORTANT:** In this example `./patch_export/` needs a file ending in `.cables` as you would get from an export with `--type patch`.

On successful import this will create a new patch on cables.gl and tell you the new URL.

Additional options to configure your import are available via:

```shell
cables import --help
```

### Upload

To upload assets to an existing cables patch run:

```shell
cables upload --file myfile.txt -p pQpie9
```

To upload multiple files run:

```shell
cables upload --file myfile.txt myfile2.json -p pQpie9
```

**IMPORTANT:** This will update/overwrite existing files with the same filename.

Additional options to configure your upload are available via:

```shell
cables upload --help
```

## Usage as a module

Install as development dependency:

```shell
npm install --save-dev @cables/cables
```

Export:

```javascript
import { Cables } from "@cables/cables";
const cables = new Cables();
await cables.export(options);
```

Simple Export Example:

```javascript
import { Cables } from "@cables/cables";

const cables = new Cables();
cables
    .export({
        patch: "pQpie9",
        destination: "public",
    })
    .then(() => {
        console.log("Export finished!");
    })
    .catch((err) => {
        console.log("There was an error exporting your patch :/", err.message);
    });
```

On failure the promise rejects with the error. `err.result.log` contains everything logged during the run.

### Arguments/options when using as a module

When using cables-cli as a module, you usually pass the options to the call, e.g. `cables.export({...})`.  
If you run your script from the command line, you can also pass any of the cables-cli arguments
(e.g. `--apikey`) to it. These override the options set in your code and fill in options your code doesn't set.

This makes it easy to keep e.g. API keys out of your repository:

```javascript
// export.js
import { Cables } from "@cables/cables";

const cables = new Cables();
await cables.export({ patch: "pQpie9", destination: "public" });
```

```shell
node export.js --apikey [APIKEY] -d dist
```

Arguments cables-cli doesn't know are ignored, so your script can still have its own flags.

## Usage in package.json:

```json
{
    "scripts": {
        "patchup": "cables export -p pQpie9 -d 'public' --index false",
        "code": "cables export -p pQpie9 --type code -d 'public'"
    }
}
```
