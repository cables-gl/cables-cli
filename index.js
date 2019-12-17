#! /usr/bin/env node
const path = require('path');
const process = require('process');
const commandLineArgs = require('command-line-args');
const request = require('request');
const fs = require('fs');
const basename = require('basename');
const prompt = require('prompt');
const extract = require('extract-zip');
const NetlifyAPI = require('netlify');


const configFilename = '.cablesrc';


const cmdOptions =
  [
    { name: 'export', alias: 'e', type: String },
    { name: 'deploy', type: String },
    { name: 'src', alias: 's', type: String },
    { name: 'destination', alias: 'd', type: String },
    { name: 'no-index', alias: 'i', type: Boolean },
    { name: 'no-extract', alias: 'x', type: Boolean },
    { name: 'json-filename', alias: 'j', type: String },
    { name: 'combine-js', alias: 'c', type: String },
    { name: 'old-browsers', alias: 'o', type: String },
    { name: 'dev', alias: 'D', type: String }
  ];

const options = commandLineArgs(cmdOptions);

/**
 * Returns true if run directly via node,
 * returns false if required as module
 */
function isRunAsCli() {
  return require.main === module;
}

const download = function(uri, filename, callback) {
  request.head(uri, function(err, res) {
    console.log('size:', Math.round(res.headers['content-length'] / 1024) + 'kb');
    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
};

function doNetlifyDeploy(options, onFinishe, onError) {
  if (!options.destination) {
    const errMsg = 'no netlifly siteid given as destination';
    console.log(errMsg);
    if (onError) {
      onError(errMsg);
    }
  } else {
    let srcDir = process.cwd();
    if (options.src) {
      srcDir = options.src;
    } else {
      console.info('no source directory given, deploying current working directory');
    }
    const client = new NetlifyAPI(cfg.netlifykey);
    client.deploy(options.destination, srcDir).then((result) => {
      console.log(`deployed ${srcDir} to ${result.deploy.ssl_url}`);
    }).catch((err) => {
      console.error('error during deploy', err);
      if (onError) {
        onError(err);
      }
    });
  }
}

function doExport(options, onFinished, onError) {

  let queryParams = '';

  // check for no-index option, which omits the index file
  if (options['no-index'] !== undefined) {
    queryParams += 'removeIndexHtml=1&';
  }

  if (options['combine-js'] !== undefined) {
    queryParams += 'combineJS=true&';
  }

  if (options['old-browsers'] !== undefined) {
    queryParams += 'compatibility=old&';
  }

  // check for json filename option to specify the json filename
  let jsonFn = options['json-filename'];
  if (jsonFn) {
    jsonFn = stripExtension(jsonFn);
    queryParams += 'jsonName=' + jsonFn + '&';
  }

  let cablesUrl = 'https://cables.gl';
  if (options['dev'] !== undefined) {
    cablesUrl = 'https://dev.cables.gl';
  }

  const url = cablesUrl + '/api/project/' + options.export + '/export?' + queryParams;

  const reqOptions =
    {
      url: url,
      headers:
        {
          'apikey': cfg.apikey
        }
    };

  function callback(error, response, body) {
    if (!error && response.statusCode === 200) {
      const info = JSON.parse(body);
      const tempFile = basename(info.path) + '.zip';

      console.log(`downloading from ${url}...`);

      download(cablesUrl + info.path, tempFile,
        function() {
          console.log('download finished... ', tempFile);

          let finalDir = path.join(process.cwd(), basename(info.path));
          if (options.destination !== undefined) { // flag "-d" is set
            if (options.destination && options.destination.length > 0) { // folder name passed after flag
              if (path.isAbsolute(options.destination)) {
                finalDir = options.destination;
              } else {
                finalDir = path.normalize(path.join(process.cwd(), options.destination)); // use custom directory
              }
            } else {
              finalDir = path.join(process.cwd(), 'patch'); // use directory 'patch'
            }
          }


          if (!options['no-extract']) {
            console.log('extracting to ' + finalDir);

            extract(tempFile, { dir: finalDir },
              function(err) {
                if (err) {
                  console.log(err);
                  if (onError) {
                    onError(err);
                  }
                  return;
                }
                console.log('finished...');
                if (onFinished) onFinished(finalDir);
                fs.unlinkSync(tempFile);
              });

          } else {
            const finalFilename = finalDir + basename(info.path) + '.zip';
            fs.rename(tempFile, finalFilename, function() {
              if (onFinished) onFinished(finalFilename);
            });
          }

        });

    } else {
      const errMessage = 'invalid response code';
      console.error(errMessage);
      console.log(body);
      if (onError) {
        onError(errMessage);
      }
    }
  }

  console.log('requesting export...');
  request(reqOptions, callback);

}

//---------

const cfg = require('home-config').load(configFilename);

if (isRunAsCli()) {
  if (options.deploy) {
    if (options.deploy === 'netlify') {
      if (!isNetlifyKeyDefined()) {
        console.log('NO CONFIG NETLIFY CONFIG FOUND!');
        console.log('paste your apikey:');
        prompt.get(['netlifykey'], function(err, result) {
          cfg.netlifykey = result.netlifykey;
          cfg.save();
          console.log('api key saved in ~/' + configFilename);
          doNetlifyDeploy(options);
        });
      } else {
        doNetlifyDeploy(options);
      }
    } else {
      const errMessage = 'no destination for deploy given or unknown destination';
      console.error(errMessage);
    }
  } else if (options.export) {
    if (!isApiKeyDefined()) {
      console.log('NO CONFIG FOUND!');
      console.log('paste your apikey:');

      prompt.get(['apikey'], function(err, result) {
        cfg.apikey = result.apikey;
        cfg.save();
        doExport(options);
        console.log('api key saved in ~/' + configFilename);
      });
    } else {
      doExport(options);
    }
  } else {
    const errMessage = 'neither --export not --deploy defined with correct parameters';
    console.error(errMessage);
  }
}

/**
 * Removes the file-extension from a file, e.g. 'foo.json' -> `foo`
 * @param {string} filename - The filename to strip the extension from
 * @returns {string|undefined} - The filename without extension or undefined if filename is undefined
 */
function stripExtension(filename) {
  if (filename) {
    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex > -1 && lastDotIndex < filename.length - 1) {
      return filename.substring(0, lastDotIndex);
    }
    return filename;
  }
}

/**
 * Checks if the api key was found in the config file
 */
function isApiKeyDefined() {
  return cfg && cfg.apikey;
}

/**
 * Checks if the netlify api key was found in the config file
 */
function isNetlifyKeyDefined() {
  return cfg && cfg.netlifykey;
}

function doNetlifyDeployWithParams(options, onFinished, onError) {
  if(!options || !options.destination) {
    const errMessage = 'no options set!';
    if (onError) {
      onError(errMessage);
    }
    return;
  }
  if(options.netlifykey) {
    cfg.netlifykey = options.netlifykey;
  }

  if (!cfg.netlifykey) {
    if (onError) {
      onError('API key needed!');
    }
    return;
  }
  options.deploy = 'netlify'; // bring it in the same format as the cli-arguments
  doNetlifyDeploy(options, onFinished, onError);
}

function doExportWithParams(options, onFinished, onError) {
  if (!options || !options.patchId) {
    const errMessage = 'no options set!';
    if (onError) {
      onError(errMessage);
    }
    return;
  }
  if (options.apiKey) {
    cfg.apikey = options.apiKey;
  }

  options['no-extract'] = options.noExtract;

  if (options.noIndex) {
    options['no-index'] = options.noIndex;
  }
  if (options.jsonFilename) {
    options['json-filename'] = options.jsonFilename;
  }
  if (!cfg.apikey) {
    if (onError) {
      onError('API key needed!');
    }
    return;
  }
  options.export = options.patchId; // bring it in the same format as the cli-arguments
  doExport(options, onFinished, onError);
}

module.exports = {
  export: doExportWithParams,
  netlify: doNetlifyDeployWithParams
};
