'use strict';

var colors = require('colors/safe');
var libs = require('node-mod-load').libs;

var index = require('../index.js');

var me = module.exports;


GLOBAL.TASK_RESULT_PENDING = colors.gray.bold('PENDING...');
GLOBAL.TASK_RESULT_OK = colors.green.bold('OK');
GLOBAL.TASK_RESULT_WARNING = colors.yellow.bold('WARNING');
GLOBAL.TASK_RESULT_ERROR = colors.red.bold('ERROR');


me.newTask = function ($name) {
    
    var rxRemoveEscapes = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;
    var mark = 'task_' + $name;

    index.write(colors.bold('\n' + $name + '...'), mark);
    return {
        
        _startTime: process.hrtime()[1],

        end: function f_commandline_newTask_end($result) {
            
            var time = (process.hrtime()[1] - this._startTime) / 1000000 |0;
            var rl = time.toString().length + $name.replace(rxRemoveEscapes, '').length + $result.replace(rxRemoveEscapes, '').length + 9;
            var l = process.stdout.columns - rl;
            var stillCurrent = index.stillCurrent(mark);
            if (stillCurrent) {

                l -= (time.toString().length + 1);
            }

            var i = 0;
            var space = '';
            while (i < l) {
                
                space += ' ';
                i++;
            }
            
            if (!stillCurrent) {
                
                index.write($name + ': ' + time + 'ms' + space + '[ ' + $result + ' ]', mark + '_end');
            }
            else {
                
                index.append(' ' + time + 'ms' + space + '[ ' + $result + ' ]', mark + '_end');
            }
            
        },

        interim: function f_commandline_newTask_interim($result, $message) {
            
            var star = '*';
            switch ($result) {

                case TASK_RESULT_PENDING: {
                    
                    star = ' ';
                    break;
                }
                
                case TASK_RESULT_OK: {

                    star = colors.green.bold(star);
                    break;
                }

                case TASK_RESULT_WARNING: {
                    
                    star = colors.yellow.bold(star);
                    break;
                }

                case TASK_RESULT_ERROR: {
                    
                    star = colors.red.bold(star);
                    break;
                }
            }
            
            var rl = $name.replace(rxRemoveEscapes, '').length + 1;
            var l = 30 - rl;
            var i = 0;
            var space = '';
            while (i < l) {
                
                space += ' ';
                i++;
            }

            if (!index.stillCurrent(mark) && !index.stillCurrent(mark + '_interim')) {

                index.write(colors.cyan.bold('┌') + $name, mark);
                index.write(colors.cyan.bold('└┤') + ' ' + star + ' ' + $message, mark + '_interim');
            }
            else {

                index.write(colors.cyan.bold(' │') + ' ' + star + ' ' + $message, mark + '_interim');
            }
            
        },
    };
};
