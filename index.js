#! /usr/bin/env node
const path = require('path');
const process = require('process');
const commandLineArgs = require('command-line-args')
const request = require('request');
const fs = require('fs');
const basename = require('basename');
const prompt = require('prompt');
const extract = require('extract-zip')


const configFilename='.cablesrc';
const cablesUrl='https://cables.gl';


const cmdOptions = 
	[
		{ name: 'export', alias: 'e', type: String },
		{ name: 'destination', alias: 'd', type: String },
		{ name: 'no-index', alias: 'i', type: Boolean },
		{ name: 'no-extract', alias: 'x', type: Boolean },
		{ name: 'json-filename', alias: 'j', type: String },
	];

const options = commandLineArgs(cmdOptions)

/**
 * Returns true if run directly via node,
 * returns false if required as module
 */
function isRunAsCli() {
	return require.main === module;
}


var download = function(uri, filename, callback)
{
	request.head(uri, function(err, res, body)
	{
		console.log('size:', Math.round(res.headers['content-length']/1024)+'kb');
		request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
	});
};

function doExport(options, onFinished, onError)
{
	if(options.export)
	{
		var queryParams = '';

		// check for no-index option, which omits the index file
		if(options['no-index'] !== undefined) {
			queryParams += 'removeIndexHtml=1&';
		}

		// check for json filename option to specify the json filename
		var jsonFn = options['json-filename'];
		if(jsonFn) {
			jsonFn = stripExtension(jsonFn);
			queryParams += 'jsonName=' + jsonFn + '&';
		}

		var url = cablesUrl + '/api/project/' + options.export + '/export?' + queryParams;

		var reqOptions =
		{
			url: url,
			headers:
			{
				'apikey': cfg.apikey
			}
		};

		function callback(error, response, body)
		{
			if (!error && response.statusCode == 200)
			{
				var info = JSON.parse(body);
				var tempFile=basename(info.path)+'.zip';

				console.log('downloading...')

				download(cablesUrl+info.path,tempFile,
					function()
					{
						console.log('download finished... ',tempFile);

						var finalDir = path.join(process.cwd(), basename(info.path));
						if(options.destination !== undefined) { // flag "-d" is set
							if(options.destination && options.destination.length > 0) { // folder name passed after flag
								if(path.isAbsolute(options.destination)) {
									finalDir = options.destination;
								} else {
									finalDir = path.normalize(path.join(process.cwd(), options.destination)); // use custom directory
								}
							} else {
								finalDir = path.join(process.cwd(), 'patch'); // use directory 'patch'
							}
						}


						if(!options['no-extract'])
						{
							console.log('extracting to '+finalDir);

							extract(tempFile, {dir: finalDir}, 
								function (err)
								{
									if(err)
									{
										console.log(err)
										if(onError) { onError(err); }
										return;
									}
									 console.log('finished...');
									 if(onFinished) onFinished();
									 fs.unlinkSync(tempFile);
								});
	
						}
						else
						{
							fs.rename(tempFile, finalDir, function()
							{
								if(onFinished) onFinished();
							});
						}

					});
				
			}
			else
			{
				var errMessage = 'invalid response code';
				console.error(errMessage);
				console.log(body);
				if(onError) { onError(errMessage); }
			}
		}

		console.log('requesting export...')
		request(reqOptions, callback);
	}
	else
	{
		var errMessage = 'no command line parameters given';
		console.log(errMessage);
		if(onError) { onError(errMessage); }
	}	
}

//---------

var cfg = require('home-config').load(configFilename);

if(isRunAsCli()) {
	if(!isApiKeyDefined()) {
		console.log("NO CONFIG FOUND!");
		console.log("paste your apikey:");
	
		prompt.get(['apikey'], function (err, result) {
			cfg.apikey = result.apikey;
			cfg.save();
			doExport(options);
			console.log("api key saved in ~/"+configFilename);
	
		});
	} else {
		doExport(options);
	}
}

/**
 * Removes the file-extension from a file, e.g. 'foo.json' -> `foo`
 * @param {string} filename - The filename to strip the extension from
 * @returns {string|undefined} - The filename without extension or undefined if filename is undefined
 */
function stripExtension(filename) {
		if(filename) {
			var lastDotIndex = filename.lastIndexOf('.');
			if(lastDotIndex > -1 && lastDotIndex < filename.length-1) {
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

function doExportWithParams(options, onFinished, onError) {
	if(!options || !options.patchId) {
		var errMessage = 'no options set!';
		if(onError) { onError(errMessage); }
		return;
	}
	if(options.apiKey) {
		cfg.apikey = options.apiKey;
	}

	options['no-extract'] = options.noExtract;

	if(options.noIndex) {
		options['no-index'] = options.noIndex;
	}
	if(options.jsonFilename) {
		options['json-filename'] = options.jsonFilename;
	}
	if(!cfg.apikey) {
		if(onError) { onError('API key needed!') };
		return;
	}
	options.export = options.patchId; // bring it in the same format as the cli-arguments
	doExport(options, onFinished, onError);
}

module.exports = {
	export: doExportWithParams
};