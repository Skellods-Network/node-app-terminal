'use strict';

(function () {
    
    var u = require('util');
    var EventEmitter = require('events').EventEmitter;
    module.exports = function () {
        
        EventEmitter.call(this);
    };

    u.inherits(module.exports, EventEmitter);

    var me = module.exports;

	var readline = require('readline');
    var crypto = require('crypto');
    var path = require('path');

    var nml = require('node-mod-load');
    var defer = require('promise-defer');
    var tk = require('terminal-kit').terminal;
    var tm = require('terminal-menu');
	var colors = require('colors/safe');

	// vars
	var _isInitialized = false;
	var _promInit = defer();
    var _libs = nml.libs;
	var _rl; // readline interface
	var _lastMark = null; // a mark will enable a second party to query if some other function has printed text in between. This is useful for workflows which spam warnings and hints, but depend on input from a third party.
	var _fixedCursorMemory = false;
	var _promptString = '> ';

    nml.addDir(__dirname + path.sep + 'modules').then(_promInit.resolve, _promInit.reject);
	
	/**
	 * Generate random string
	 * 
	 * @param $length integer
	 * @param $chars string
	 *   Pool of characters to use.
	 *   If you have one character more often than another, the probability of it occuring will increase in the same amount
	 * @result string
	 */
	var _randomString = function f_SFFM_randomString($length, $chars) {
		$chars = $chars || 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890';
		
		var rand = crypto.randomBytes($length);
		var cl = $chars.length;
		var r = '';
		var i = 0;
		while (i < $length) {
			
			r += $chars[rand[i] % cl];
			i++;
		}
		
		return r;
	};


    /**
     * Only until we can use ES6 proxies
     */
	var _getTERM
    = me.getTERM = function() {

	    return tk;
    };

    //TODO: Rewrite this whole mess :/
    var _getInterface
    = me.getInterface = function() {

        return _rl;
    };

	/**
	 * TODO: Untested!!!
	 */
	var _newMenu
	= me.newMenu
    = me.prototype.newMenu = function f_newMenu() {

        return tm.apply(arguments);
    };
		
	/**
	 * Clear terminal
	 */
	me.cls = me.clear = me.prototype.cls = me.prototype.clear = tk.clear;
	
	/**
	 * Init terminal with prompt
	 * @param $prompt
	 *   Default: '> '
	 * @result Promise
	 */
	var _init 
    = me.prototype.init = function f_init($prompt) {
        
        if (_isInitialized) {
            
            return _rl;
        }
        
        let self = this;
		if ($prompt) {
			
            _promptString = $prompt;
		}
		
        _rl = readline.createInterface({
            
            input: process.stdin,
            output: process.stdout,
            //completer: completer // TODO
        });
        
        _rl.setPrompt(_promptString);

        _rl.on('line', function ($line) {
            
            (function () {
            
                self.emit('line', $line);
            }).apply(me, [$line]);
        });
        
		// We are initialized as soon as all modules have been loaded
        // promInit contains a promise which is resolved/rejected as soon as the modules have been loaded into Node-Mod-Load
        return _promInit.promise.then(function ($res) {
			
			_isInitialized = true;
			_rl.prompt(false);
			
			// enrich terminal with widgets and more from modules
			self.newTask = _libs.task.newTask;
			
			return Promise.resolve($res);
		}, function ($err) {
			
			return Promise.reject($err);
		});
    };
	
	/**
	 * Prompt for the love of Haruhi
	 * @param $preserveCursor boolean
	 *   Default: false
	 */
	var _prompt 
    = me.prototype.prompt = function f_prompt($preserveCursor) {
        
        if (_isInitialized) {
            
            _rl.prompt($preserveCursor);
        }
    };
	
	/**
	 * The current cursor position in memory will be kept as long as the position guard is not dropped
	 * This enables appending to a line in a synchronous workflow
	 */
	var _guardPositionMemory 
    = me.guardPositionMemory
    = me.prototype.guardPositionMemory = function f_log_guardPositionMemory() {
        
        _fixedCursorMemory = true;
    };

	/**
	 * Dropping the position guard will resume storing the last cursor position
	 */
    var _dropGuardPositionMemory 
    = me.dropGuardPositionMemory
    = me.prototype.dropGuardPositionMemory = function f_log_dropGuardPositionMemory() {
        
        _fixedCursorMemory = false;
    };
	
	var __isInitialized 
    = me.prototype.isInitialized = function f_isInitialized() {
        
        return _isInitialized;
    };
	
	/**
	 * Query if the given mark is the last mark which has written to the terminal
	 */
	var _stillCurrent 
    = me.stillCurrent
    = me.prototype.stillCurrent = function f_stillCurrent($mark) {

        return $mark === _lastMark;
    };
	
	var _setMark = function ($mark) {
		
		if (!$mark) {
			
            $mark = _randomString(8);
		}
		
		_lastMark = $mark;
	};
	
	/**
	 * Write regular text
	 * @param $str String
	 * @param $mark mixed
	 *   Default: random string
	 */
	var _write 
    = me.write 
    = me.prototype.write = function f_write($str, $mark) {
        
        _setMark($mark);
        if (_isInitialized) {
                
            // Clear line so no prompt will be visible
            //_rl.write('\u001B[2K'); // <- old implementation
			tk.eraseLine();
                
            // Move cursor to position 0 of line
            //_rl.write('\u001B[' + _promptString.length + 'D'); // <- old implementation
			tk.column(0);
        }
            
		tk($str);
		tk.saveCursor();
        tk('\n');
		
        _prompt(true);
    };
	
	/**
     * Appends a string to the previous line of the console
     * 
     * @param $str
     *   String to append
     */
    var _append 
    = me.append
    = me.prototype.append = function f_log_append($str) {
        
		tk.restoreCursor();
		tk($str);
		tk.saveCursor();
		tk('\n');
    };
    
	/**
     * Write hint to console
     * 
     * @param string $str
	 * @param $mark mixed
	 *   Default: random string
     */
    var _writeHint 
    = me.writeHint
    = me.prototype.writeHint = function ($str, $mark) {
        $str = typeof $str !== 'undefined' ? $str : '';
        
		_write(colors.grey('HINT: ' + $str), $mark);
    };
	
    /**
     * Write note to console and to log
     *
     * @param string $str
	 * @param $mark mixed
	 *   Default: random string
     */
    var _writeNote 
    = me.writeNote 
    = me.prototype.writeNote = function ($str, $mark) {
		$str = typeof $str !== 'undefined' ? $str : '';
        
		_write(colors.bold($str), $mark);
    };
    
    /**
     * Write warning to console and to log
     *
     * @param string $str
	 * @param $mark mixed
	 *   Default: random string
     */
    var _writeWarning 
    = me.writeWarning 
    = me.prototype.writeWarning = function ($str, $mark) {
		$str = typeof $str !== 'undefined' ? $str : '';
        
		_write(colors.yellow.bold('WARNING: ' + $str), $mark);
    };
    
    /**
     * Write error to console and to log
     *
     * @param string $str
	 * @param $mark mixed
	 *   Default: random string
     */
    var _writeError 
    = me.writeError 
    = me.prototype.writeError = function ($str, $mark) {
		$str = typeof $str !== 'undefined' ? $str : '';
        
		_write(colors.red.bold('ERROR: ' + $str), $mark);
    };
    
    /**
     * Write fatal error to console and to log
     *
     * @param string $str
	 * @param $mark mixed
	 *   Default: random string
     */
    var _writeCritical 
	= me.writeFatal
	= me.writeFatalError
    = me.writeCritical 
    = me.prototype.writeFatal 
    = me.prototype.writeFatalError 
    = me.prototype.writeCritical = function ($str, $mark) {
    $str = typeof $str !== 'undefined' ? $str : '';
        
		_write(colors.red.bold('FATAL ERROR: ' + $str), $mark);
    };
})();
