# cables-cli

_Tool to export and download [cables](https://cables.gl) patches from the command line_

## Installation

Run `npm install`.  
Create an API key on [cables.gl/settings](https://cables.gl/settings) —> navigate to `API key` —> press `Generate`.
When you first start the tool it will show a prompt for the API key. Once entered your API key will be stored in `~/.cablesrc`.

## Run

To export and download a cables patch run:  
```
node index.js -e [CABLES PATCH ID]
```
You can find the patch ID by opening your patch in the cables editor – the last part of the URL is the patch ID, e.g.:

```
https://cables.gl/ui/#/project/5a7daa8b285c9aca0982bba2
—> 5a7daa8b285c9aca0982bba2 is the patch ID
```

## Further Infos

For more infos on the cables API see [cables API docs](https://docs.cables.gl/api/api.html).

