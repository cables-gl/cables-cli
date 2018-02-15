

# cables-cli

_Tool to export and download [cables](https://cables.gl) patches from the command line_

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

To export and download a cables patch into a specific directory  run:  
```shell
cables -e [CABLES PATCH ID] -d [DESTINATION]
```
You can find the patch ID by opening your patch in the cables editor – the last part of the URL is the patch ID, e.g.:

```shell
https://cables.gl/ui/#/project/5a7daa8b285c9aca0982bba2
—> 5a7daa8b285c9aca0982bba2 is the patch ID
```

Example:    

```shell
cables -e 5a7daa8b285c9aca0982bba2 -d 'my-patch'
```

Please note: Running the command will overwrite  everything in the `my-patch`-folder.

## Arguments

- `-e [PATCH ID]`: Export patch
- `-d [DESTINATION]`: Folder to download the patch to, can either be absolute or relative

## Use as a module

Install as dependency:  

```
npm install --save @cables/cables
```

Export:  

```javascript
cables.export(options, onFinished, onError);
```

Example:  

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

## Further Infos

For more infos on the cables API see [cables API docs](https://docs.cables.gl/api/api.html).

