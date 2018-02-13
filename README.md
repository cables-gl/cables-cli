# cables-cli

_Tool to export and download a [cables](https://cables.gl) patch from the command line_

## Installation

Run `npm install`.  
Create an API key on [cables.gl/settings](https://cables.gl/settings) —> navigate to `API key` —> press `Generate`.
When you first start the tool it will show a prompt for the API key. Once entered your API key will be stored in `~/.cablesrc`.

## Run

To export and download a cables patch run:  
```
node index.js -e [CABLES PROJECT ID]
```
## Further Infos

For more infos on the cables API see [cables API docs](https://docs.cables.gl/api/api.html).

