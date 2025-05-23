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

## Run

### Export

To export and download a cables patch into a specific directory run:

```shell
cables --export [CABLES PATCH ID] -d [DESTINATION]
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

**Please note:** Running the command will overwrite everything in the `my-patch`-folder.

#### Arguments

- `-e` / `--export` `[PATCH ID]`: Export patch, to use on a webserver
- `-C` / `--code` `[PATCH ID],[PATCH ID],[PATCH ID]`: Export ops code for patch(es)
- `-p` / `--patch` `[PATCH ID]`: Export patch, to use in [cables standalone](https://cables.gl/standalone)
- `-d` / `--destination` `[DESTINATION]`: Folder to download the patch to, can either be absolute or relative
- `-g` / `--minify-glsl` : Minifies shader-code in `.frag` and `.att` attachments
- `-i` / `--no-index` : will not include/overwrite _index.html_ in the export
- `-x` / `--no-extract` : do not extract the downloaded zip file
- `-j` / `--json-filename` `[JSON FILENAME]` : Define the filename of the patch json file
- `-c` / `--combine-js` : combine javascript and json into a single patch.js
- `-a` / `--assets <auto|all|none>`: export assets of patch, defaults to "auto"
- `-f` / `--no-subdirs`: put js and assets into same directory as `index.html` ("flat export")
- `-m` / `--no-minify`: do not minify code
- `-M` / `--sourcemaps`: if code is minified, add sourcemaps to the export
- `-D` / `--dev`: export from dev server
- `--api-key`: define apikey on the command line, overriding anything that might be in `~/.cablesrc`

## Use as a module

Install as dependency:

```shell
npm install --save @cables/cables
```

Export:

```javascript
const cables = require("@cables/cables");
cables.export(options, onFinished, onError);
```

Simple Export Example:

```javascript
const cables = require("@cables/cables");

cables.export({
    "patchId": "pQpie9",
    "destination": "patch"
}, onFinished, onError);

function onFinished()
{
    console.log("Export finished!");
}

function onError(err)
{
    console.log("There was an error exporting your patch :/");
}
```

Advanced Export Example:

```javascript
const cables = require("@cables/cables");

cables.export({
    "patchId": "pQpie9",
    "destination": "patch",
    "noIndex": true,
    "jsonFilename": "my-patch" /* patch will be stored as my-patch.json */
}, onFinished, onError);

function onFinished(filename)
{
    console.log("Export finished: " + filename);
}

function onError(err)
{
    console.log("There was an error exporting your patch :/");
}
```

Export Code (`-C`) Example:

If you just need the op-code of one or more patches you created, you can
use the `-C` option and provide a comma-seperated list of patch-ids to
download `ops.js` with all code included.

This is helpful, when you want to add multiple patches to one page. Download
the patches individually (do NOT use `--combine-js`), load libs and `cables.min.js`
as provided in the individual `index.html` and swap out `ops.js` with this download.

```shell
cables -C -d "public" pQpie9
```

```javascript
var cables = require("@cables/cables");

cables.code({
    "code": "one,two,thee",
    "destination": "patch"
}, onFinished, onError);

function onFinished()
{
    console.log("Export finished!");
}

function onError(err)
{
    console.log("There was an error exporting your patch :/");
}
```

Use in package.json:

```json
{
    "scripts": {
        "patchup": "cables -c -i -d 'public' -e pQpie9",
        "code": "cables -C -d 'public' pQpie9"
    }
}
```

## Further Infos

For more infos on the cables API see [cables API docs](https://cables.gl/docs/9_1_communication/api/api).
