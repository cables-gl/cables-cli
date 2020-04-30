

# cables-cli

_Command line tool to export and download [cables](https://cables.gl) patches from the command line_

```
             C   A   B   L   E   S   >>>  ___:_ _
       _ _:_______________ _____________ /   |\   _ _______
          |  _           /\\_           \    |\\.  _)     /\       ______         
    _____ | (/)        _/\\\(_______    /    |\\| /    __/\\\     /     /\    
   /   _/\_      _    /_\\\/_\\\\ _/   /     |\\|/     \_\\\/___ /     /\\\ 
  /   /_\\|_     |\     \\(    /\ \   /_    _:\\/__ /\_/       /_\   _/_\\/___
_/   /(     \    |_\     \__  /_\\_)    \         (_          /   \          /\
\           _\   \___     _/             \         /         /     \_       /\\\
 \_________(    _|\\\\     \_ ___________/   _    /_________/       /      /\\\/
  \\\\\\\\|_____)\\\        |\\\\\/         (/)  /\\\\\\\/                /_\\/
   \\\\\\\\\\\\\\\\\\_______:\\.\/______________/\\\\\\\\\_________________(\\ 
 _|.._     \\\\\\\)  \\\\\\\\\\| \\\\\\\\\\\\\\\\\\\/     \\\\\\\\\\\\\\\\\\\\
(_|||_)               \\\\\\\\\|  \\\\\\\\\\\\\\\\\/       \\\\\\\\\\\\\\\\\\( 
 ---|-->> 
```

## Installation

Run `npm install -g @cables/cables`.  
Create an API key on [cables.gl/settings](https://cables.gl/settings) —> navigate to `API key` —> press `Generate`.
When you first start the tool it will show a prompt for the API key. Once entered your API key will be stored in `~/.cablesrc`.

## Run

### Export

To export and download a cables patch into a specific directory  run:  
```shell
cables --export [CABLES PATCH ID] -d [DESTINATION]
```
You can find the patch ID by opening your patch in the cables editor – the last part of the URL is the patch ID, e.g.:

```shell
https://cables.gl/ui/#/project/5a7daa8b285c9aca0982bba2
—> 5a7daa8b285c9aca0982bba2 is the patch ID
```

Example:    

```shell
cables --export 5a7daa8b285c9aca0982bba2 -d 'my-patch'
```

**Please note:** Running the command will overwrite  everything in the `my-patch`-folder.

#### Arguments

- `-e` / `--export` `[PATCH ID]`: Export patch
- `-d` / `--destination` `[DESTINATION]`: Folder to download the patch to, can either be absolute or relative
- `-i` /  `--no-index` : Removes the _index.html_ file when set
- `-x` /  `--no-extract` : do not extract the downloaded zip file
- `-j` / `--json-filename` `[JSON FILENAME]` : Define the filename of the patch json file 
- `-c` / `--combine-js` : combine javascript and json into a single patch.js
- `-o` / `--old-browsers`: load a version made compatible with older browsers using babel
- `-a` / `--assets <auto|all|none>`: export assets of patch, defaults to "auto"

### Deploy to [netlify](https://www.netlify.com/)

Create an account on [netlify](https://www.netlify.com/), create a site by uploading a folder with a simple index.html.
Go to the new site's settings and copy the "API ID" (this is your [SITE ID]). Then run the following commands:
 
If you do this for the first time  cables-cli will ask you for your netlify-api-key,
create and copy one at/from ["User Settings > Applications"](https://app.netlify.com/user/applications).

Deploy the current directory to netlify:
```shell
cables --deploy netlify -d [SITE ID]
```

Deploy any directory to netlify (useful with webpack buildir or `cables --export -d`)
```shell
cables --deploy netlify -d [SITE ID] -s build/
```

**Please note:** Running the command will overwrite  everything in the netlify site. They version their deploys, though.

#### Arguments

- `--deploy` `netlify`: Deploy patch to netlify
- `-d` / `--destination` `[SITE ID]`: Netlify-Site API ID to upload the files to 
- `-s` /  `--src` `[DIRECTORY]`: which directory to send to netlify, defaults to current working directory

## Use as a module

Install as dependency:  

```
npm install --save @cables/cables
```

Export:  

```javascript
cables.export(options, onFinished, onError);
```

Simple Export Example:  

```javascript
var cables = require('@cables/cables');

cables.export({
  patchId: '5a4ea356429259dd579a0fea',
  destination: 'patch' 
}, onFinished, onError);

function onFinished() {
  console.log('Export finished!');
}

function onError(err) {
  console.log('There was an error exporting your patch :/');
}
```

Simple Deploy Example:

```javascript
var cables = require('@cables/cables');

cables.netlify({
  destination: 'YOURNETLIFYSITEID' 
}, onFinished, onError);

function onFinished() {
  console.log('Deploy finished!');
}

function onError(err) {
  console.log('There was an error deploying your patch :/');
}
```

Advanced Export Example:  

```javascript
var cables = require('@cables/cables');

cables.export({
  patchId: '5a4ea356429259dd579a0fea',
  destination: 'patch',
  noIndex: true,
  jsonFilename: 'my-patch' /* patch will be stored as my-patch.json */
}, onFinished, onError);

function onFinished(filename) {
  console.log('Export finished: '+filename);
}

function onError(err) {
  console.log('There was an error exporting your patch :/');
}
```

Use in package.json:
```json
{
  "scripts": {
      "patchup": "cables -c -i -d 'public' -e 5a4ea356429259dd579a0fea",
      "deploy": "cables --deploy netlify -d [SITE ID] -s public/"
  }
}
```

The project contains an example-package.json with `patchup` and `deploy` as predefined scripts.

## Further Infos

For more infos on the cables API see [cables API docs](https://docs.cables.gl/api/api.html).
