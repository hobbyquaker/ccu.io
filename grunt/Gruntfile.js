// To use this file in WebStorm, right click on the file name in the Project Panel (normally left) and select "Open Grunt Console"

/** @namespace __dirname */

module.exports = function(grunt) {

    var srcDir = __dirname + "/../";
    var dstDir = __dirname + "/../delivery/";
    var pkg    = grunt.file.readJSON('package.json');
    var iocore = grunt.file.readJSON('../io-core.json');

    // Project configuration.
    grunt.initConfig({
        pkg: pkg,
        clean: {
            all: ['.build', '.debian-pi-control', '.debian-pi-ready', '.windows-ready'],
            'debian-pi-control': ['.debian-pi-ready/DEBIAN'],
            'debian-pi-control-sysroot': ['.debian-pi-ready/sysroot']
        },
        replace: {
            core: {
                options: {
                    patterns: [
                        {
                            match: /settings\.version = "[\.0-9]*";/g,
                            replacement: 'settings.version = "'+iocore.version+'";'
                        }
                    ]
                },
                files: [
                    {
                        expand:  true,
                        flatten: true,
                        src:     [srcDir + 'ccu.io.js'],
                        dest:    '.build/'
                    }
                ]
            },
            'debian-pi-version': {
                options: {
                    force: true,
                    patterns: [
                        {
                            match: 'version',
                            replacement: iocore.version
                        },
                        {
                            match: 'architecture',
                            replacement: '<%= grunt.task.current.args[2] %>'
                        },
                        {
                            match: "size",
                            replacement: '<%= grunt.task.current.args[0] %>'
                        },
                        {
                            match: "user",
                            replacement: '<%= grunt.task.current.args[1] %>'
                        }
                    ]
                },
                files: [
                    {
                        expand:  true,
                        flatten: true,
                        src:     ['debian-pi/control/*'],
                        dest:    '.debian-pi-control/control/'
                    },
                    {
                        expand:  true,
                        flatten: true,
                        src:     ['debian-pi/redeb.sh'],
                        dest:    '.debian-pi-ready/'
                    },
                    {
                        expand:  true,
                        flatten: true,
                        src:     ['debian-pi/etc/init.d/ccu.io.sh'],
                        dest:    '.debian-pi-control/'
                    }
                ]
            },
            windowsVersion: {
                options: {
                    force: true,
                    patterns: [
                        {
                            match: 'version',
                            replacement: iocore.version
                        }
                    ]
                },
                files: [
                    {
                        expand:  true,
                        flatten: true,
                        src:     ['windows/ccu.io.iss'],
                        dest:    '.windows-ready/'
                    }
                ]
            }
        },
        copy: {
            static: {
                files: [
                    {
                        expand: true,
                        cwd: srcDir,
                        src: [
                            'cert/*',
                            'doc/*',
                            'node_modules/**/*',
                            'scripts/*',
                            'regascripts/*',
                            'www/ccu.io/**/*',
                            'www/lib/**/*',
                            'www/index.html',
                            '*.json',
                            '*.js',
                            'adapter/**/*',
                            '!scripts/*.js',
                            '!adapter/sonos/cache/*',
                            '!adapter/*.zip',
                            '!ccu.io.js',
                            '!speech.js'],
                        dest: '.build/'
                    }
                ]
            },
            'debian-pi': {
                files: [
                    {
                        expand: true,
                        cwd: '.build',
                        src: ['**/*', '!node_modules/node-windows/**/*', '!node_modules/optimist/**/*', '!node_modules/wordwrap/**/*'],
                        dest: '.debian-pi-ready/sysroot/opt/ccu.io/'
                    },
                    {
                        expand: true,
                        cwd: '.debian-pi-control/control',
                        src: ['**/*'],
                        dest: '.debian-pi-ready/DEBIAN/'
                    },
                    {
                        expand: true,
                        cwd: '.debian-pi-control/',
                        src: ['ccu.io.sh'],
                        dest: '.debian-pi-ready/sysroot/etc/init.d/'
                    }
                ]
            },
            windows: {
                files: [
                    {
                        expand: true,
                        cwd: 'windows',
                        src: ['*.js', 'v0*/**/*', '*.ico', '*.bat', '!restart_ccu_io.bat'],
                        dest: '.windows-ready/'
                    },
                    {
                        expand: true,
                        cwd: '.build',
                        src: ['**/*'],
                        dest: '.windows-ready/data/'
                    }
                    ,
                    {
                        expand: true,
                        cwd: 'windows',
                        src: ['restart_ccu_io.bat'],
                        dest: '.windows-ready/data/'
                    }                ]
            }
        },
        // Javascript code styler
        jscs: {
            all: {
                src: [ "../*.js",
                    //"../scripts/*.js",
                    //"../adapter/**/*.js",
                    "Gruntfile.js"
                ],
                options: {
                    force: true,
                    "requireCurlyBraces": ["if","else","for","while","do","try","catch","case","default"],
                    "requireSpaceAfterKeywords": ["if","else","for","while","do","switch","return","try","catch"],
//                    "requireSpaceBeforeBlockStatements": true,
                    "requireParenthesesAroundIIFE": true,
                    "requireSpacesInFunctionExpression": {"beforeOpeningRoundBrace": true, "beforeOpeningCurlyBrace": true },
                    "requireSpacesInAnonymousFunctionExpression": {"beforeOpeningRoundBrace": true, "beforeOpeningCurlyBrace": true},
                    "requireSpacesInNamedFunctionExpression": {"beforeOpeningRoundBrace": true, "beforeOpeningCurlyBrace": true},
                    "requireSpacesInFunctionDeclaration": {"beforeOpeningRoundBrace": true, "beforeOpeningCurlyBrace": true},
                    "disallowMultipleVarDecl": true,
                    "requireBlocksOnNewline": true,
                    "disallowEmptyBlocks": true,
                    "disallowSpacesInsideObjectBrackets": true,
                    "disallowSpacesInsideArrayBrackets": true,
                    "disallowSpaceAfterObjectKeys": true,
                    "requireCommaBeforeLineBreak": true,
                    //"requireAlignedObjectValues": "all",
                    "requireOperatorBeforeLineBreak": ["?", "+", "-", "/","*", "=", "==", "===", "!=", "!==", ">", ">=", "<","<="],
                    "disallowLeftStickedOperators": ["?", "+", "-", "/", "*", "=", "==", "===", "!=", "!==", ">", ">=", "<", "<="],
                    "requireRightStickedOperators": ["!"],
                    "disallowRightStickedOperators": ["?", "+", "/", "*", ":", "=", "==", "===", "!=", "!==", ">", ">=", "<", "<="],
                    "requireLeftStickedOperators": [","],
                    "disallowSpaceAfterPrefixUnaryOperators": ["++", "--", "+", "-", "~", "!"],
                    "disallowSpaceBeforePostfixUnaryOperators": ["++", "--"],
                    "requireSpaceBeforeBinaryOperators": ["+","-","/","*","=","==","===","!=","!=="],
                    "requireSpaceAfterBinaryOperators": ["+", "-", "/", "*", "=", "==", "===", "!=", "!=="],
                    //"validateIndentation": 4,
                    //"validateQuoteMarks": { "mark": "\"", "escape": true },
                    "disallowMixedSpacesAndTabs": true,
                    "disallowKeywordsOnNewLine": true

                }
            }
        },
        // Lint
        jshint: {
            options: {
                force:true
            },
            all: [ "../*.js",
                "../scripts/*.js",
                "../adapter/**/*.js",
                "Gruntfile.js",
                '!../speech.js',
                '!../adapter/rpi/node_modules/**/*.js']
        },
        compress: {
            main: {
                options: {
                    archive: dstDir + 'ccu.io.' + iocore.version + '.zip'
                },
                files: [
                    {expand: true, src: ['**'],  dest: '/', cwd:'.build/'}
                ]
            },
            adapter: {
                options: {
                    archive: dstDir + '<%= grunt.task.current.args[1] %>'
                },
                files: [
                    {expand: true, src: ['**'],  dest: '/', cwd: srcDir + 'adapter/<%= grunt.task.current.args[0] %>/'}
                ]
            },
            'debian-pi-control': {
                options: {
                    archive: '.debian-pi-ready/control.tar.gz'
                },
                files: [
                    {
                        expand: true,
                        src: ['**/*'],
                        dest: '/',
                        cwd: '.debian-pi-control/control/'
                    }
                ]
            },
            'debian-pi-data': {
                options: {
                    archive: '.debian-pi-ready/data.tar.gz'
                },
                files: [
                    {
                        expand: true,
                        src: ['**/*'],
                        dest: '/',
                        cwd: '.debian-pi-ready/sysroot/'
                    }
                ]
            }
        },
        command : {
            makeWindowsMSI: {
               // type : 'bat',
                cmd  :'"'+__dirname+'\\windows\\InnoSetup5\\ISCC.exe" "'+__dirname+'\\.windows-ready\\ccu.io.iss" > "'+__dirname+'\\.windows-ready\\setup.log"'
            }
        }
    });

    grunt.registerTask('makeEmptyDirs', function () {
        grunt.file.mkdir('.build/log');
        grunt.file.mkdir('.build/datastore');
        grunt.file.mkdir('.build/tmp');
    });


    var writeVersions = {
        name: "writeVersions",
        list: [
            'replace:core'
        ]
    };

    var gruntTasks = [
        'grunt-replace',
        'grunt-contrib-clean',
        'grunt-contrib-concat',
        'grunt-contrib-copy',
        'grunt-contrib-compress',
        'grunt-contrib-commands',
        'grunt-contrib-jshint',
        'grunt-jscs-checker',
        'grunt-zip'
    ];
    var i;

    for (i in gruntTasks) {
        grunt.loadNpmTasks(gruntTasks[i]);
    }

    grunt.registerTask('debian-pi-packet', function () {
        // Calculate size of directory
        var fs = require('fs'),
            path = require('path');

        function readDirSize(item) {
            var stats = fs.lstatSync(item);
            var total = stats.size;

            if (stats.isDirectory()) {
                var list = fs.readdirSync(item);
                for (var i = 0; i < list.length; i++) {
                    total += readDirSize(path.join(item, list[i]));
                }
                return total;
            }
            else {
                return total;
            }
        }

        var size = readDirSize('.build');

        grunt.task.run([
            'clean:debian-pi-control',
            'replace:debian-pi-version:' + (Math.round(size / 1024) + 8) + ':pi:armhf', // Settings for raspbian
            'copy:debian-pi',
            'compress:debian-pi-data',
            'clean:debian-pi-control-sysroot'
        ]);
        console.log('========= Copy .debian-pi-ready directory to Raspbery PI and start "sudo bash redeb.sh" =============');
    });

    grunt.registerTask('windows-msi', function () {
         if (/^win/.test(process.platform)) {
             grunt.task.run([
                 'copy:windows',
                 'replace:windowsVersion',
                 'command:makeWindowsMSI'
             ]);
             console.log('========= Please wait a little (ca 1 min). The msi file will be created in ccu.io/delivery directory after the grunt is finished.');
             console.log('========= you can start batch file .windows-ready\\createSetup.bat manually');
             // Sometimes command:makeWindowsMSI does not work, you can start batch file manually
             grunt.file.write(__dirname + '\\.windows-ready\\createSetup.bat', '"' + __dirname + '\\windows\\InnoSetup5\\ISCC.exe" "' + __dirname + '\\.windows-ready\\ccu.io.iss"');
         } else {
            console.log('Cannot create windows setup, while host is not windows');
         }
    });

    grunt.registerTask('default', [
//        'jshint',
//        'jscs',
        'clean:all',
        'replace:core',
        'makeEmptyDirs',
        'copy:static',
        'compress:main',
        'debian-pi-packet',
        'windows-msi'
    ]);
};