/**
 *      CCU.IO Back up solution
 *      01'2014 Bluefox
 *
 *      Version 0.1
 *
 * Create backup of all important files and folders.
 * Following elements will be backed up:
 *  - datastore (All)
 *  - scripts (All)
 *  - logs (Optional, actually not)
 *  - dashui/img (all except devices, mfd, back)
 *  - dashui/css/dashui-user.css
 *
 */
var logger    = require(__dirname+'/logger.js'),
    fs        = require('fs'),
    gzip      = require('tar.gz'),
    ncp       = require('ncp').ncp;

var targetFolder = __dirname + '/tmp';

var iCopied = 0;
var zipFile = null;
var socket  = null;
var task    = 'backup';

var deleteFolderRecursive = function(path) {
    if( fs.existsSync(path) ) {
        fs.readdirSync(path).forEach(function(file,index){
            var curPath = path + '/' + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
                deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

var isTriggered = null;

function copyFile (source, destination, trigger) {
    if (trigger !== undefined) {
        isTriggered = trigger;
    }
    iCopied++;
    ncp (source, destination, function (err) {
        iCopied--;
        if (err) {
            logger.error('Cannot copy file ' + source + ' to ' + destination);
        }

        if (!iCopied && (isTriggered === null || isTriggered)) {
            var gz = new gzip ();
            gz.compress(targetFolder+'/' + task, zipFile, function(err) {
                if (!err) {
                    logger.info('create-' + task+ ' file ' + zipFile + ' created');
                }
                else{
                    logger.info('create-' + task + ' file ' + zipFile + ' created');
                }
                // Remove directory
                deleteFolderRecursive(targetFolder+'/'+task);
                if (process && process.send) {
                    // Signal to ccu.io.js the file name
                    process.send (zipFile.replace (__dirname + '/www', ''));
                }
                logger.info('create-' + task + ' file ' + zipFile.replace (__dirname + '/www', '') + '');
                
                setTimeout (function () {process.exit()}, 1000);
            });
        }
    });
}

function copyDirectory (source, destination, exceptionFolders, trigger) {
    var list = fs.readdirSync (source);
    var exceptions = exceptionFolders ? exceptionFolders.split(',') : [];

    try {
        var stat = fs.lstatSync(destination);
        if (!stat) {
            fs.mkdirSync (destination);
        }
    }
    catch (e) {
        fs.mkdirSync (destination);
    }

    for (var i = 0, len = list.length; i < len; i++) {
        if (exceptions.indexOf (list[i]) != -1) {
            continue;
        }
        stat = fs.lstatSync (source+'/'+list[i]);

        if (stat.isDirectory()) {
            copyDirectory (source+'/'+list[i], destination + '/'+list[i], trigger);
        }
        else {
            copyFile (source+'/'+list[i], destination + '/'+list[i], trigger);
        }
    }
}

// delete all .tar.gz in 'www'
function clearWWW () {
    var list = fs.readdirSync (__dirname + '/www');

    for (var i = 0, len = list.length; i < len; i++) {
        if (list[i].indexOf ('.tar.gz') != -1) {
            fs.unlink (__dirname + '/www/' +list[i] );
        }
    }
}

function getCurrentDate (d) {
    d = d || new Date ();
    var year  = d.getFullYear();
    var month = d.getMonth()+1;
    var day   = d.getDate();
    if (month < 10) month = '0' + month;
    if (day < 10)   day   = '0' + day;
    return year + '_' + month + '_' + day;
}

function createBackup (isLog, zipFileName) {
    clearWWW ();

    zipFile = zipFileName || __dirname + '/www/'+getCurrentDate()+'_ccu_io_' + task + '.tar.gz';
    try {
        var stat = fs.lstatSync(zipFile);
        if (stat) {
            fs.unlink (zipFile);
        }
    }
    catch (e) {
    }
    var bckDir = targetFolder+'/' + task;
    // Remove directory
    deleteFolderRecursive (bckDir);
    fs.mkdirSync (bckDir);
    copyDirectory (__dirname + '/datastore', bckDir + '/datastore', '.gitignore');
    copyDirectory (__dirname + '/scripts',   bckDir + '/scripts', '.gitignore');
    if (isLog) {
        copyDirectory (__dirname + '/log', bckDir + '/log', 'ccu.io.log,.gitignore');
    }
    fs.mkdirSync (bckDir + '/www');
    fs.mkdirSync (bckDir + '/www/dashui');
    fs.mkdirSync (bckDir + '/www/dashui/css');
    fs.mkdirSync (bckDir + '/www/dashui/img');
    copyDirectory (__dirname + '/www/dashui/img', bckDir + '/www/dashui/img', 'devices,mfd,back', false);
    copyFile (__dirname + '/www/dashui/css/dashui-user.css', bckDir + '/www/dashui/css/dashui-user.css', true);
}

function applyBackup (zipFileName) {
    if (!zipFileName) {
        logger.error ('apply-backup  file does not exist: "' + zipFileName + '"');
        return;
    }
    if (zipFileName.indexOf ('/') == -1 && zipFileName.indexOf ('\\') == -1) {
        zipFileName = __dirname + '/www/' + zipFileName;
    }

    try {
        var stats = fs.lstatSync(zipFileName);

        if (!stats) {
            logger.error ('apply-backup  file does not exist: ' + zipFileName);
            return;
        }
    }
    catch (e) {
        logger.error ('apply-backup  file does not exist: ' + zipFileName);
        return;
    }

    // Remove directory
    deleteFolderRecursive (targetFolder);
    var gz = new gzip ();
    gz.extract(zipFileName, targetFolder, function(err) {
        if (err) {
            logger.error('apply-backup  cannot unzip: ' + err);
            return;
        }
        logger.info('apply-backup  unzip done, start coping');

        ncp(targetFolder + '/'+ task, __dirname, function (err) {
            if (err) {
                logger.error(err);
                return;
            }

            setTimeout(function () {
                // Ordner im tmp Verzeichnis löschen
                logger.info('apply-backup  delete tmp folder '+targetFolder);
                deleteFolderRecursive(targetFolder+'/' + task);
                logger.info('apply-backup  done');
                //process.exit(0);
                fs.unlink (zipFileName);
            }, 2000);
        });
    });
}

function randomNumber(len) {
    var num = "";
    for (var t = 0; t < len; t++) {
        num += Math.round(Math.random() * 10).toString();
    }
    return num;
}

//Process: [{\"datetime\":\"2014-06-08 13:53:53\",\"number\":\"134567890\"},{\"datetime\":\"2014-06-07 16:33:06\",\"number\":\"077777777777\"}]
function anonymizeNumber1(jsonObj) {
    var data = null;
    try {
        data = JSON.parse(jsonObj);
    } catch (e) {

    }
    if (data) {
        for (var i = 0; i < data.length; i++) {
            if (data[i].number && data[i].number != 'Unbekannt') {
                data[i].number = randomNumber(data[i].number.length);
            }
        }
    }
    return JSON.stringify(data);
}

// Process: "MISSED/25.04.14 17:07:41/01766666666/0;IN/11.04.14 15:10:24/0725555555/3;IN/11.04.14 15:09:49/07444444444/3"
function anonymizeNumber2(str) {
    var data = str.split(';');
    for (var i = 0; i < data.length; i++) {
        var objs = data[i].split('/');
        objs[2] = randomNumber(objs[2].length);
        data[i] = objs.join('/');
    }
    return data.join(';');
}

// Process: "<table class=\"callListTable\"><tr class='callListTableLine1'><td class='callListTableType'><img src='img/callinfailed.png' style='width:32px;height:32px' /></td><td class='callListTableImg'><img src='img/call.png' style='width:32px;height:32px' /></td><td class='callListTableTime'>25.04.14 17:07:41</td><td class='callListTableName'>Person2 Handy</td><td class='callListTableDuration'/></tr><tr class='callListTableLine0'><td class='callListTableType'><img src='img/callin.png' style='width:32px;height:32px' /></td><td class='callListTableImg'><img src='img/call.png' style='width:32px;height:32px' /></td><td class='callListTableTime'>11.04.14 15:10:24</td><td class='callListTableName'>Person3</td><td class='callListTableDuration'>00:03</td></tr></table>"
function anonymizeNumber3(str) {
    var data = str.split("<td class='callListTableName'>");
    for (var i = 1; i < data.length; i++) {
        var pos = data[i].indexOf('</td>');
        if (pos != -1) {
            data[i] = randomNumber(pos) + data[i].substring(pos);
        }
    }
    return data.join("<td class='callListTableName'>");
}

function createSnapshot (isNotAnonymized, zipFileName) {
    var settings  = require(__dirname + '/settings.js');
    var io        = require('socket.io-client');

    task = 'snapshot';

    clearWWW ();

    zipFile = zipFileName || __dirname + '/www/'+getCurrentDate()+'_dashui_io_' + task + '.tar.gz';
    try {
        var stat = fs.lstatSync(zipFile);
        if (stat) {
            fs.unlinkSync(zipFile);
        }
    }
    catch (e) {
    }
    var bckDir = targetFolder + '/' + task;
    // Remove directory
    deleteFolderRecursive(bckDir);
    fs.mkdirSync(bckDir);

    var socket;
    if (settings.ioListenPort) {
        socket = io.connect('127.0.0.1', {
            port: settings.ioListenPort
        });
    } else if (settings.ioListenPortSsl) {
        socket = io.connect('127.0.0.1', {
            port: settings.ioListenPortSsl,
            secure: true
        });
    } else {
        return;
    }
    var localData = {};
    var errors = [];

    socket.on('connect', function () {
        socket.emit('getDatapoints', function(data) {
            localData.uiState = {};
            for (var dp in data) {
                localData.uiState['_' + dp] = { Value: data[dp][0], Timestamp: data[dp][1], Certain: data[dp][2], LastChange: data[dp][3]};
            }

            socket.emit('getObjects', function(obj) {
                localData.metaObjects = obj;

                if (!isNotAnonymized) {
                    try {
                        // Anonimyze address
                        for (var i in localData.metaObjects) {
                            if (localData.metaObjects[i]["Address"]) {
                                localData.metaObjects[i]["Address"] = 'ZZZ';
                            }
                        }
                        // Remove tel numbers
                        if (localData.uiState['_74000']) {
                            localData.uiState['_74000'].Value = anonymizeNumber1(localData.uiState['_74000'].Value);
                        }
                        if (localData.uiState['_74001']) {
                            localData.uiState['_74001'].Value = anonymizeNumber1(localData.uiState['_74001'].Value);
                        }
                        if (localData.uiState['_74002']) {
                            localData.uiState['_74002'].Value = anonymizeNumber1(localData.uiState['_74002'].Value);
                        }
                        if (localData.uiState['_74003']) {
                            localData.uiState['_74003'].Value = anonymizeNumber1(localData.uiState['_74003'].Value);
                        }
                        if (localData.uiState['_73203']) {
                            localData.uiState['_73203'].Value = anonymizeNumber2(localData.uiState['_73203'].Value);
                        }
                        if (localData.uiState['_73208']) {
                            localData.uiState['_73208'].Value = anonymizeNumber2(localData.uiState['_73208'].Value);
                        }
                        if (localData.uiState['_73204']) {
                            localData.uiState['_73204'].Value = anonymizeNumber3(localData.uiState['_73204'].Value);
                        }
                        if (localData.uiState['_73209']) {
                            localData.uiState['_73209'].Value = anonymizeNumber3(localData.uiState['_73209'].Value);
                        }
                        if (localData.uiState['_73205'] && localData.uiState['_73205'].Value) {
                            localData.uiState['_73205'].Value = randomNumber(localData.uiState['_73205'].Value);
                        }
                        if (localData.uiState['_73206'] && localData.uiState['_73206'].Value) {
                            localData.uiState['_73206'].Value = randomNumber(localData.uiState['_73206'].Value);
                        }
                    } catch (e) {
                        errors.push("create-snapshot: cannot anonimyze numbers " + e);
                        logger.warn(errors[errors.length-1]);
                    }
                }

                socket.emit('getIndex', function(obj) {
                    localData.metaIndex = obj;

                    fs.mkdirSync(bckDir + '/datastore');
                    fs.writeFile(bckDir + '/datastore/local-data.json', JSON.stringify(localData, null, '  '));

                    try {
                        var files = fs.readdirSync(__dirname + '/datastore/');
                        for (var t = 0; t < files.length; t++) {
                            if (files[t].indexOf('dashui-views') != -1) {
                                var _jviews = fs.readFileSync(__dirname + '/datastore/' + files[t]);
                                var views   = JSON.parse(_jviews);

                                try{
                                    for (var view in views) {
                                        for (var widget in views[view]['widgets']) {
                                            if (views[view]['widgets'][widget] &&
                                                views[view]['widgets'][widget].data) {

                                                // Remove all cameras from views
                                                if (views[view]['widgets'][widget].data.hqoptions) {
                                                    var hqOpt = JSON.parse(views[view].widgets[widget].data.hqoptions);
                                                    if (hqOpt.ipCamImageURL) {
                                                        hqOpt.ipCamImageURL = 'http://www.river-reach.net/netcam1.jpg';
                                                        views[view]['widgets'][widget].data.hqoptions = JSON.stringify(hqOpt, null, '  ');
                                                    }
                                                }
                                                if (views[view]['widgets'][widget].data.refreshInterval) {
                                                    views[view]['widgets'][widget].data.src = 'http://www.river-reach.net/netcam1.jpg';
                                                }
                                            }
                                        }
                                    }
                                } catch(e) {
                                    errors.push("create-snapshot: cannot anonimyze cameras " + e);
                                    logger.warn(errors[errors.length-1]);
                                }
                                fs.writeFile(bckDir + '/datastore/' + files[t], JSON.stringify(views, null, '  '));
                            }
                        }

                    } catch (e) {
                        errors.push("create-snapshot: cannot create " + e);
                        logger.warn(errors[errors.length-1]);
                    }

                    fs.mkdirSync(bckDir + '/dashui');
                    fs.mkdirSync(bckDir + '/dashui/img');
                    copyDirectory(__dirname + '/www/dashui/img', bckDir + '/dashui/img', 'devices,mfd,back', false);
                    fs.mkdirSync(bckDir + '/dashui/css');
                    if (errors.length) {
                        fs.writeFile(bckDir + '/datastore/errors.txt', errors.join('\n'));
                    }
                    copyFile(__dirname + '/www/dashui/css/dashui-user.css', bckDir + '/dashui/css/dashui-user.css', true);
                });
            });
        });
    });
}
var cmd = process.argv[2];

if (cmd == 'create') {
    createBackup();
}
else if (cmd == 'snapshot') {
    createSnapshot();
}
else if (cmd) {
    applyBackup(cmd);
}
