/**
 * CoffeeScript compiler
 */

'use strict';

var fs          = require('fs'),
	path        = require('path'),
	exec        = require('child_process').exec,
	coffee      = require('coffee-script'),
	notifier    = require('../notifier.js'),
	appConfig   = require('../appConfig.js').getAppConfig(),
	util        = require('../util.js');

/**
 * compile coffee file
 * @param  {Object} file    compile file object
 * @param  {Function} success compile success calback
 * @param  {Function} fail    compile fail callback
 */
function coffeeCompile(file, success, fail) {
	var filePath = file.src,
		output = file.output,
		javascript;

	var settings = file.settings;
	for (var k in appConfig.coffeescript) {
		if (!settings.hasOwnProperty(k)) {
			settings[k] = appConfig.coffeescript[k];
		}
	}

	//compile file by system command
	if (appConfig.systemCommand.coffeescript) {
		compileBySystemCommand({
			filePath:  filePath,
			output: output,
			settings: settings
		}, success, fail);
		return false;
	}

	//read code
	fs.readFile(filePath, 'utf8', function(rErr, code) {
		if(rErr) {
			if (fail) fail();
			notifier.throwError(rErr.message);
			return false;
		}

		try{
			javascript = coffee.compile(code, {
				bare: settings.bare,
				lint: settings.lint
			});
			//write output
			fs.writeFile(output, javascript, 'utf8', function(wErr) {
				if(wErr) {
					if (fail) fail();
					notifier.throwError(wErr.message);
				} else {
					if (success) success();
				}
			});
		} catch (err) {
			//compile error
			if (fail) fail();
			notifier.throwError(err.message, file.src);
		}
	});
}

/**
 * compile file by system command
 * @param  {Object} options compile options
 */
function compileBySystemCommand (options, success, fail) {
	var filePath = options.filePath,
		output = options.output,
		argv = [];

	argv.push('-c');

	if (options.settings.bare) {
		argv.push('-b');
	}

	if (options.settings.lint) {
		argv.push('-l');	
	}

	argv.push('"' + filePath.replace(/\\/g, '/') + '"');

	exec('coffee ' + argv.join(' '), {timeout: 5000}, function(error, stdout, stderr){
		if (error !== null) {
			if (fail) fail();
			notifier.throwError(stderr, filePath);
		} else {
			//move the result js file to output path
			if (path.dirname(filePath) === path.dirname(output)) {
				if (path.basename(filePath, '.coffee') !== path.basename(output, '.js')) {
					moveResutToOutput();
				} else {
					if (success) success();
				}
			} else {
				moveResutToOutput();
			}
		}
	});

	//move file
	function  moveResutToOutput () {
		var result = path.dirname(filePath) + path.sep + path.basename(filePath, '.coffee') + '.js';

		fs.rename(result, output, function (err) {
			if (err) {
				if (fail) fail();
				notifier.throwError(err.message, filePath);
			} else {
				if (success) success();
			}
		});
	}

}

module.exports = coffeeCompile;