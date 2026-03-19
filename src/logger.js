import path from "path";

/**
 * @typedef {Object} LoggerOptions
 * @property {("debug"|"verbose"|"info"|"warn"|"error")} [logLevel] only log messages above the specified level
 * @property {Boolean} [silent] do not output to console, write to entries array only
 */

/**
 * @typedef {Object} LogEntryContext
 * @property {String} line
 * @property {String} index
 * @property {String} clean
 * @property {String} stack
 */

/**
 * @typedef {Object} LogEntry
 * @property {("debug"|"verbose"|"info"|"warn"|"error")} level
 * @property {Date} date
 * @property {String} initiator filename of the initiating module
 * @property {LogEntryContext} context
 * @property {String} message
 */

/* eslint-disable no-console */
export class Logger
{
    /**
     *
     * @param {LoggerOptions} options
     */
    constructor(options = {})
    {
        this._logLevel = options.logLevel || "info";
        this._silent = options.silent || false;
        this._services = [];
        this._entries = [];

        this._levels = [
            "debug",
            "verbose",
            "info",
            "warn",
            "error",
            "uncaught"
        ];

        this._logLevelIndex = this._levels.findIndex((level) => { return level === this._logLevel; });

        // register console output, will include "verbose"
        this._services.push({
            "name": "console",
            "levels": ["debug", "verbose", "info", "warn", "error", "uncaught", "startTime", "endTime"],
            "log": this._logConsole.bind(this),
            "active": true
        });
    }

    get _initiator()
    {
        const initiator = this._getCallerFile();
        return initiator || "logger";
    }

    /**
     * ignore subsequent errors below the given level
     *
     * @param {("debug"|"verbose"|"info"|"warn"|"error")} logLevel
     */
    setLogLevel(logLevel) {
        if(!logLevel) return;
        if(!this._levels.includes(logLevel)) return;
        this._logLevel = logLevel;
        this._logLevelIndex = this._levels.findIndex((level) => { return level === this._logLevel; });
        this.debug("setting loglevel to ", logLevel, this._logLevelIndex);
    }

    debug(...args)
    {
        const level = "debug";
        if (this._logLevelFiltered(level)) return;
        const initiator = this._initiator;
        const context = this._getContext(args);
        const loggers = this._services.filter((s) => { return s.levels.includes(level); });
        loggers.forEach((l) =>
        {
            l.log(initiator, level, context, args);
        });
    }

    verbose(...args)
    {
        const level = "verbose";
        if (this._logLevelFiltered(level)) return;
        const initiator = this._initiator;
        const context = this._getContext(args);
        const loggers = this._services.filter((s) => { return s.levels.includes(level); });
        loggers.forEach((l) =>
        {
            l.log(initiator, level, context, args);
        });
    }

    info(...args)
    {
        const level = "info";
        if (this._logLevelFiltered(level)) return;
        const initiator = this._initiator;
        const context = this._getContext(args);
        const loggers = this._services.filter((s) => { return s.levels.includes(level); });
        loggers.forEach((l) =>
        {
            l.log(initiator, level, context, args);
        });
    }

    warn(...args)
    {
        const level = "warn";
        if (this._logLevelFiltered(level)) return;
        const initiator = this._initiator;
        const context = this._getContext(args);
        const loggers = this._services.filter((s) => { return s.levels.includes(level); });
        loggers.forEach((l) =>
        {
            l.log(initiator, level, context, args);
        });
    }

    error(...args)
    {
        const level = "error";
        if (this._logLevelFiltered(level)) return;
        const initiator = this._initiator;
        const context = this._getContext(args);
        const loggers = this._services.filter((s) => { return s.levels.includes(level); });
        loggers.forEach((l) =>
        {
            l.log(initiator, level, context, args);
        });
    }

    uncaught(...args)
    {
        const level = "error";
        if (this._logLevelFiltered(level)) return;
        const initiator = this._initiator;
        const context = this._getContext(args);
        const loggers = this._services.filter((s) => { return s.levels.includes(level); });
        loggers.forEach((l) =>
        {
            l.log(initiator, level, context, args);
        });
    }

    startTime(...args)
    {
        const initiator = this._initiator;
        const level = "startTime";
        const context = this._getContext(args);
        const loggers = this._services.filter((s) => { return s.levels.includes(level); });
        loggers.forEach((l) =>
        {
            l.log(initiator, level, context, args);
        });
    }

    endTime(...args)
    {
        const initiator = this._initiator;
        const level = "endTime";
        const context = this._getContext(args);
        const loggers = this._services.filter((s) => { return s.levels.includes(level); });
        loggers.forEach((l) =>
        {
            l.log(initiator, level, context, args);
        });
    }

    /**
     *
     * @return {Array<LogEntry>}
     */
    getEntries() {
        return this._entries;
    }

    _logConsole(initiator, level, context, args, dateFormat = "DD-MM-YYYY HH:mm:ss", shortFormat = false)
    {
        let dateTime = new Date();
        this._entries.push({
            "level": level,
            "date": dateTime,
            "initiator": initiator,
            "context": context,
            "message": args.join(" ")
        });
        if(this._silent) return;
        switch (level)
        {
        case "uncaught":
        case "error":
            console.error( ...args);
            break;
        case "warn":
            console.warn( ...args);
            break;
        case "info":
            console.info( ...args);
            break;
        case "verbose":
        case "debug":
            console.debug( ...args);
            break;
        case "startTime":
            console.time(...args);
            break;
        case "endTime":
            console.timeEnd(...args);
            break;
        default:
            console.log( ...args);
            break;
        }
    }


    /**
     *
     * @param {Array} loggerArguments
     * @return LogEntryContext
     * @private
     */
    _getContext(loggerArguments)
    {
        try
        {
            let err = new Error();
            if (loggerArguments)
            {
                for (let i = 0; i < loggerArguments.length; i++)
                {
                    const arg = loggerArguments[i];
                    if (arg.hasOwnProperty("stack"))
                    {
                        err = arg;
                        break;
                    }
                }
            }

            let line = err.stack.split("\n")[4];
            let index = line ? line.indexOf("at ") : "unknown";
            let clean = line ? line.slice(index + 2, line.length).trim() : "unknown";
            return {
                line,
                index,
                clean,
                "stack": err.stack
            };
        }
        catch (err) {}
    }

    _getCallerFile()
    {
        let originalFunc = Error.prepareStackTrace;

        let callerFile = null;
        let currentFileLine = null;
        try
        {
            let err = new Error();

            Error.prepareStackTrace = (_err, stack) => { return stack; };
            let currentFileName = err.stack.shift().getFileName();
            while (err.stack.length)
            {
                const stack = err.stack.shift();
                callerFile = stack.getFileName();
                currentFileLine = stack.getLineNumber();
                if (currentFileName !== callerFile && !callerFile.includes("logger.js")) break;
            }
        }
        catch (e) {}
        Error.prepareStackTrace = originalFunc;
        let result = "logger";
        if (callerFile)
        {
            result = path.basename(callerFile, ".js");
            if (currentFileLine) result += ":" + currentFileLine;
        }
        return result;
    }

    _logLevelFiltered(logLevel)
    {
        if (!logLevel) return false;
        if (this._logLevelIndex < 0) return false;
        const levelIndex = this._levels.findIndex((level) => { return level === logLevel; });
        if (levelIndex < 0) return false;
        return this._logLevelIndex > levelIndex;
    }
}
