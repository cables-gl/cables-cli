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
	];

const options = commandLineArgs(cmdOptions)


var download = function(uri, filename, callback)
{
	request.head(uri, function(err, res, body)
	{
		console.log('size:', Math.round(res.headers['content-length']/1024)+'kb');
		request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
	});
};

function doExport()
{
	if(options.export)
	{
		var reqOptions =
		{
			url: cablesUrl+'/api/project/'+options.export+'/export',
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
				var tempFile='./'+basename(info.path)+'.zip';

				console.log('downloading...')

				download(cablesUrl+info.path,tempFile,
					function()
					{
						console.log('download finished... ')

						var finalDir=__dirname+'/'+basename(info.path);
						console.log('extracting to '+finalDir);

						extract(tempFile, {dir: finalDir}, 
							function (err)
							{
								if(err)
								{
									console.log(err)
									return;
								}
						 		console.log('finished...');
						 		fs.unlinkSync(tempFile);
							});
					});
				
			}
			else
			{
				console.error("invalid response code");
				console.log(body);
			}
		}

		console.log('requesting export...')
		request(reqOptions, callback);
	}
	else
	{
		console.log("no command line parameters given");
	}	
}

//---------

var cfg = require('home-config').load(configFilename);

if(!cfg.apikey)
{
	console.log("NO CONFIG FOUND!");
	console.log("paste your apikey:");

	prompt.get(['apikey'], function (err, result)
	{
		cfg.apikey = result.apikey;
		cfg.save();
		doExport();
		console.log("api key saved in ~/"+configFilename);

	});
}
else
{
	doExport();
}


