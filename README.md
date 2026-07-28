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

- `--url` `[URL]` Specify base URL of cables api to use (e.g. for local development)
- `--apikey` `[string]` Define apikey on the command line, overriding anything that might be in ~/.cablesrc
- `--loglevel` `<debug|verbose|info|warn|error>` log level
- `-h`/`--help` Show usage info about current command

### Export

To export and download a cables patch into a specific directory run:

```shell
cables export -p [PATCHID] -d [DESTINATION]
```

You can find the patch ID by opening your patch in the cables editor – the last part of the URL is the patch ID, e.g.:

```shell
https://cables.gl/edit/pQpie9
—> pQpie9 is the patch ID
```

Example:

```shell
cables --export pQpie9 -d "my-patch"
```

**IMPORTANT:** Running this command will overwrite everything in the `my-patch`-folder.

Additional options to configure your export are available via:

```shell
cables export --help
```

#### Export Code (`--type code`) Example:

If you just need the op-code of one or more patches you created, you can
use the `--type code` option and provide a comma-seperated list of patch-ids to
download `ops.js` with all code included.

This is helpful, when you want to add multiple patches to one page. Download
the patches individually (do NOT use `--combinejs`). Then load libs and `cables.min.js`
as provided in the individual `index.html` and swap out `ops.js` with this download.

```shell
cables export -p pQpie9 --combinejs false -d "public"
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
cables upload -p pQpie9 --file myfile.txt
```

To upload multiple files run:

```shell
cables upload -p pQpie9 --file myfile.txt myfile2.json
```

**IMPORTANT:** This will update/overwrite existing files with the same filename.

Additional options to configure your upload are available via:

```shell
cables import --help
```

## Usage as a module

Install as develoment dependency:

```shell
npm install --save-dev @cables/cables
```

Export:

```javascript
import { Cables } from "@cables/cables";
await cables.export(options);
```

Simple Export Example:

```javascript
import { Cables } from "@cables/cables";

cables.export(
    {
        "patch": "pQpie9",
        "destination": "patch",
    }
).then(()) => {
    console.log("Export finished!");
}.catch((err) => {
    console.log("There was an error exporting your patch :/");
});
```

## Usage in package.json:

```json
{
    "scripts": {
        "patchup": "cables -p pQpie9 -d 'public' --index false",
        "code": "cables -p pQpie9 --type code -d 'public'"
    }
}
```
