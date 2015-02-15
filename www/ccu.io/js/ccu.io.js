var currentAdapterSettings;
var ccuIoSettings = null;



function updateAdapterSettings() {
    $("#adapter_config_json").html(JSON.stringify(currentAdapterSettings, null, "    "));
}

function translateWord(text, lang, dictionary) {
    if (!ccuIoSettings) return text;
    if (!dictionary) dictionary = ccuWords;
    if (!lang)       lang       = ccuIoSettings.language || 'en';

    if (!dictionary) {
        return text;
    }

    if (dictionary[text]) {
        var newText = dictionary[text][lang];
        if (newText){
            return newText;
        }
        else if (lang != 'en') {
            newText = dictionary[text]['en'];
            if (newText){
                return newText;
            }
        }

    }
    return text;
}

function translateWordBack(text, lang, dictionary) {
    if (!dictionary) {
        return text;
    }
    for (var word in dictionary) {
        if (dictionary[word] === null)
            continue;
        if (dictionary[word][lang] == text)
            return word;
    }

    console.log("back: " + text);
    return text;
}

function translateAll(lang, dictionary) {
    lang  = lang || ccuIoSettings.language || 'en';
    dictionary = dictionary || ccuWords;

    $(".translate").each(function (idx) {
        var curlang = $(this).attr('data-lang');
        var text    = $(this).html();
        if (curlang != lang) {
            if (curlang) {
                text = translateWordBack(text, curlang, dictionary);
            }

            var transText = translateWord(text, lang, dictionary);
            if (transText) {
                $(this).html(transText);
                $(this).attr('data-lang', lang);
            }
        }
    });
    // translate <input type="button>
    $(".translateV").each(function (idx) {
        var text    = $( this ).attr('value');
        var curlang = $(this).attr('data-lang');
        if (curlang != lang) {
            if (curlang) {
                text = translateWordBack(text, curlang, dictionary);
            }

            var transText = translateWord(text, lang, dictionary);
            if (transText) {
                $(this).attr('value', transText);
                $(this).attr('data-lang', lang);
            }
        }
    });
    $(".translateB").each(function (idx) {
        //<span class="ui-button-text">Save</span>
        var text    = $( this ).html();
        text = text.replace('<span class="ui-button-text">', "").replace("</span>", "");
        var curlang = $(this).attr('data-lang');
        if (curlang != lang) {
            if (curlang) {
                text = translateWordBack(text, curlang, dictionary);
            }

            var transText = translateWord(text, lang, dictionary);
            if (transText) {
                $(this).html('<span class="ui-button-text">' + transText + '</span>');
                $(this).attr('data-lang', lang);
            }
        }
    });
}

$(document).ready(function () {



    var installedAddons = [];
    var objGridInited  = false;
    var dataGridInited = false;
    var metaGridInited = false;
    var idxGridInited  = false;

    var regaObjects,
        regaIndex;

    var lastRegaPoll,
        lastRfEvent,
        lastHs485Event,
        lastCuxEvent;

    setInterval(function () {
        if (lastRegaPoll !== undefined) {
            lastRegaPoll += 1;
            $(".ccu-io-lastrega").html(formatLastEvent(lastRegaPoll));
        }
        if (lastRfEvent !== undefined) {
            lastRfEvent += 1;
            $(".ccu-io-lastrf").html(formatLastEvent(lastRfEvent));
        }
        if (lastHs485Event !== undefined) {
            lastHs485Event += 1;
            $(".ccu-io-lasths485").html(formatLastEvent(lastHs485Event));
        }
        if (lastCuxEvent !== undefined) {
            lastCuxEvent += 1;
            $(".ccu-io-lastcux").html(formatLastEvent(lastCuxEvent));
        }
    }, 1000);

    function formatLastEvent(sec) {
        if (sec > 3599) {
            var hours = Math.floor(sec / 3600);
            var rest = sec - (hours * 3600);
            var minutes = Math.floor(rest / 60);
            rest = rest - (minutes * 60);
            return hours+"h "+("0"+minutes).slice(-2)+"m "+("0"+rest).slice(-2)+"s";
        } else if (sec > 59) {
            var minutes = Math.floor(sec / 60);
            var rest = sec - (minutes * 60);
            return "0h "+("0"+minutes).slice(-2)+"m "+("0"+rest).slice(-2)+"s";
        } else {
            return "0h 00m "+("0"+sec).slice(-2)+"s";
        }

    }

    function updateAddonHandler(id) {
        $("input#"+id).click(function () {

            var $this = $(this);
            $this.attr("disabled", true);
            var url = $this.attr("data-update-url");
            var name = $this.attr("data-update-name");
            var id = $this.attr("id");

            socket.emit("getUrl", url, function(res) {
                try {
                    var obj = JSON.parse(res);
                    $("input.updateCheck[data-update-name='"+obj.name+"']").parent().append(obj.version);

                    var instVersion = $("input.updateCheck[data-update-name='"+obj.name+"']").parent().parent().find("td[aria-describedby='grid_addons_installedVersion']").html();
                    instVersion = instVersion.replace(/beta/,".");

                    var availVersion = obj.version;
                    availVersion = availVersion.replace(/beta/,".");

                    var updateAvailable = compareVersion(instVersion, availVersion);

                    if (updateAvailable) {
                        $("input.updateCheck[data-update-name='"+obj.name+"']").parent().prepend("<input type='button' id='update_"+obj.ident+"' class='addon-update translateV' data-lang='"+((ccuIoSettings && ccuIoSettings.language) ? ccuIoSettings.language : 'en')+"' value='"+translateWord("update")+"'/>&nbsp;");
                        $("input#update_"+obj.ident).click(function () {
                            $(this).attr("disabled", true);
                            var that = this;
                            socket.emit("updateAddon", obj.urlDownload, obj.dirname, function (err) {
                                if (err) {
                                    showMessage(err);
                                } else {
                                    $(that).remove();
                                }
                            });

                        });
                    }
                    $("input.updateCheck[data-update-name='"+obj.name+"']").hide();
                } catch (e) {
                    url = url.replace(/[^\/]+\/io-addon.json/,"io-addon.json");
                    socket.emit("getUrl", url, function(res) {
                        obj = JSON.parse(res);
                        $("input.updateCheck[data-update-name='"+obj.name+"']").parent().append(obj.version);

                        var instVersion = $("input.updateCheck[data-update-name='"+obj.name+"']").parent().parent().find("td[aria-describedby='grid_addons_installedVersion']").html();
                        instVersion = instVersion.replace(/beta/,".");

                        var availVersion = obj.version;
                        availVersion = availVersion.replace(/beta/,".");

                        var updateAvailable = compareVersion(instVersion, availVersion);

                        if (updateAvailable) {
                            $("input.updateCheck[data-update-name='"+obj.name+"']").parent().prepend("<input type='button' id='update_"+obj.ident+"' class='addon-update' data-lang='"+((ccuIoSettings && ccuIoSettings.language) ? ccuIoSettings.language : 'en')+"' value='"+translateWord("update")+"'/>&nbsp;");
                            $("input#update_"+obj.ident).click(function () {
                                $(this).attr("disabled", true);
                                var that = this;
                                socket.emit("updateAddon", obj.urlDownload, obj.dirname, function (err) {
                                    if (err) {
                                        showMessage(err);
                                    } else {
                                        $(that).remove();
                                    }
                                });

                            });
                        }
                        $("input.updateCheck[data-update-name='"+obj.name+"']").hide();
                    });
                }

            });
        });
    }

    function compareVersion(instVersion, availVersion) {
        var instVersionArr = instVersion.replace(/beta/,".").split(".");
        var availVersionArr = availVersion.replace(/beta/,".").split(".");

        var updateAvailable = false;

        for (var k = 0; k<3; k++) {
            instVersionArr[k] = parseInt(instVersionArr[k], 10);
            if (isNaN(instVersionArr[k])) { instVersionArr[k] = -1; }
            availVersionArr[k] = parseInt(availVersionArr[k], 10);
            if (isNaN(availVersionArr[k])) { availVersionArr[k] = -1; }
        }

        if (availVersionArr[0] > instVersionArr[0]) {
            updateAvailable = true;
        } else if (availVersionArr[0] == instVersionArr[0]) {
            if (availVersionArr[1] > instVersionArr[1]) {
                updateAvailable = true;
            } else if (availVersionArr[1] == instVersionArr[1]) {
                if (availVersionArr[2] > instVersionArr[2]) {
                    updateAvailable = true;
                }
            }
        }
        return updateAvailable;
    }

    $(".jqui-tabs").tabs();

    var eventCounter = 0;
    var $mainTabs = $("#mainTabs");
    var $subTabs5 = $("#subTabs5");

    $mainTabs.tabs({
        activate: function (e, ui) {
            if (!metaGridInited && ui.newPanel.selector == '#mainTab5') {
                metaGridInited = true;
                buildMetaData();
            }
            resizeGrids();
        }
    });
    $subTabs5.tabs({
        activate: function (e, ui) {
            if (!objGridInited && ui.newPanel.selector == '#subTab57') {
                objGridInited = true;
                buildDevicesGrid();
            } else
            if (!dataGridInited && ui.newPanel.selector == '#subTab53') {
                dataGridInited = true;
                buildDatapointsGrid();
            } else
            if (!metaGridInited && ui.newPanel.selector == '#subTab51') {
                metaGridInited = true;
                buildMetaData();
            }else
            if (!idxGridInited && ui.newPanel.selector == '#subTab52') {
                idxGridInited = true;
                buildIndexData();
            }
        }
    })

    var $datapointGrid = $("#grid_datapoints");
    var $eventGrid     = $("#grid_events");
    var $adapterGrid   = $("#grid_adapter");

    $("#loader_message").append(translateWord("connecting to CCU.IO") + " ... <br/>");

    var socket = io.connect( $(location).attr('protocol') + '//' +  $(location).attr('host') + "?key="+socketSession);

    $("#loader_message").append(translateWord("loading stringtable") + " ... <br/>");

    socket.emit('getStringtable', function(obj) {
        $("#stringtable").html(JSON.stringify(obj, null, "  "));
    });

    function getYesNo(isTrue, isWarning) {
        return isTrue ? "<span class='indicator-true translate' data-lang='"+(ccuIoSettings.language || 'en')+"'>"+translateWord("YES")+"</span>"  : "<span class='" + (!isWarning ? "indicator-false" :"indicator-false-warning")+" translate' data-lang='"+(ccuIoSettings.language || 'en')+"'>"+translateWord("NO")+"</span>";
    }
    function getTrueFalse(isTrue) {
        return isTrue ? "<span style='color:green'><b data-lang='"+(ccuIoSettings.language || 'en')+"' class='translate'>"+translateWord('TRUE')+"</b></span>" : "<span data-lang='"+(ccuIoSettings.language || 'en')+"' class='translate'>"+translateWord('false')+"</span>";
    }
    $("#loader_message").append(translateWord("loading settings") + " ... <br/>");

    function loadAdapterSettings() {
        var settings = ccuIoSettings;
        console.log('loadAdapterSettings');
        socket.emit("readdir", ["adapter"], function (data) {
            $adapterGrid.jqGrid("clearGridData");
            for (var i = 0; i < data.length; i++) {
                var adapter = data[i];
                if (adapter.match(/^skeleton/) || adapter == ".DS_Store") { continue; }
                var adapterData = {
                    name:   data[i],
                    settings:   '<button class="adapter-settings translateB" data-adapter="'+adapter+'" data-lang="'+((ccuIoSettings && ccuIoSettings.language) ? ccuIoSettings.language : 'en')+'">'+translateWord('configure')+'</button><button class="adapter-restart translateB" data-lang="'+((ccuIoSettings && ccuIoSettings.language) ? ccuIoSettings.language : 'en')+'" data-adapter="'+adapter+'">'+translateWord('reload')+'</button>',
                    confed:     (settings.adapters[data[i]]?"true":"false"),
                    enabled:    (settings.adapters[data[i]]?getTrueFalse(settings.adapters[data[i]].enabled):""),
                    mode:       ((settings.adapters[data[i]] && settings.adapters[data[i]].mode)?getWord(settings.adapters[data[i]].mode):""),
                    period:     (settings.adapters[data[i]]?settings.adapters[data[i]].period:"")
                };
                $adapterGrid.jqGrid("addRowData", i, adapterData);
                $("#loader_adapter").append(".");
            }
            $adapterGrid.trigger("reloadGrid");

            $(".adapter-settings").click(function () {
                editAdapterSettings($(this).attr("data-adapter"));
            });
            $(".adapter-restart").click(function () {
                restartAdapter($(this).attr("data-adapter"));
            });
        });
    }

    socket.emit("getSettings", function (settings) {
        ccuIoSettings = settings;
        $(".ccu-io-version").html(settings.version);
        $(".ccu-io-scriptengine").html(getYesNo(settings.scriptEngineEnabled));
        $(".ccu-io-adapters").html(getYesNo(settings.adaptersEnabled));
        $(".ccu-io-logging").html(getYesNo(settings.logging.enabled));

        loadSettings();
        translateAll();

        $("#install_addon_dialog").dialog({
            autoOpen: false,
            title: translateWord ("Install Addon"),
            modal: true
        });
        $("#loader_message").append("<span id='loader_adapter'>"+translateWord("loading adapters") + " </span><br/>");
        loadAdapterSettings();

    });
    $("#loader_message").append(translateWord("loading status") + " ... <br/>");

    socket.emit("getStatus", function (data) {
        $(".ccu-reachable").html(getYesNo(data.ccuReachable, true));
        $(".ccu-regaup").html(getYesNo(data.ccuRegaUp, true));
        $(".ccu-regadata").html(getYesNo(data.ccuRegaData, true));
        $(".ccu-rpc").html(getYesNo(data.initsDone, true));
    });

    socket.on("updateStatus", function (data) {
        $(".ccu-reachable").html(getYesNo(data.ccuReachable, true));
        $(".ccu-regaup").html(getYesNo(data.ccuRegaUp, true));
        $(".ccu-regadata").html(getYesNo(data.ccuRegaData, true));
        $(".ccu-rpc").html(getYesNo(data.initsDone, true));
    });

    socket.on ("readyBackup", function (name) {
        showMessage ();
        $('#createBackup').button( "option", "disabled", false);
        location.replace(name);
    });
    socket.on ("readySnapshot", function (name) {
        showMessage ();
        $('#createSnapshot').button( "option", "disabled", false);
        location.replace(name);
    });
    socket.on ("applyReady", function (text) {
        $('#applyBackup').button( "option", "disabled", false);
        showMessage ();
        showMessage (text);
    });
    socket.on ("applyError", function (text) {
        $('#applyBackup').button( "option", "disabled", false);
        showMessage ();
        showMessage (text, "Error");
    });
    socket.on("ioMessage", function (data) {
        showMessage (data);
    });

    $("#loader_message").append("<span id='loader_addons'>"+translateWord("loading addons") + " </span><br/>");

    socket.emit("readdir", ["www"], function (data) {

        for (var i = 0; i < data.length; i++) {
            var addon = data[i];
            if (addon == "lib" || addon == "ccu.io" || addon == "index.html" || addon.indexOf(".mp3") != -1) { continue; }

            socket.emit("readJsonFile", "www/" + addon + "/io-addon.json", function(meta) {

                if (meta) {
                    var hp = meta.urlHomepage.match(/[http|https]:\/\/(.*)/);
                    var dl = meta.urlDownload.match(/\/([^/]+)$/);

                    var addonData = {
                        name:               "<a href='/"+meta.dirname+"' target='_blank'>"+meta.name+"</a>",
                        installedVersion:   meta.version,
                        availableVersion:   "<input id='update_addon_"+meta.name+"'data-update-name='"+meta.name+"' class='updateCheck translateV' data-update-url='"+meta.urlMeta+"' type='button' data-lang='"+((ccuIoSettings && ccuIoSettings.language) ? ccuIoSettings.language : 'en')+"' value='"+translateWord("check")+"'/>",
                        homepage:           "<a href='"+meta.urlHomepage+"' target='_blank'>"+hp[1]+"</a>",
                        download:           "<a href='"+meta.urlDownload+"' target='_blank'>"+dl[1]+"</a>"
                    };
                    $("#grid_addons").jqGrid('addRowData', i, addonData);
                    $("#loader_addons").append(".");

                    updateAddonHandler("update_addon_"+meta.name);


                    installedAddons.push(meta.dirname+"="+meta.version);
                    $("#install_addon_select option[value='"+meta.dirname+"']").remove();

                }
            });
        }

        $("input#update_self_check").click(function () {
            $("#update_self_check").attr("disabled", true);
            var url = "http://ccu.io/version.php";
            socket.emit("getUrl", url, function(res) {
                $("#update_self_check").hide();
                $("#update_self_check").attr("disabled", false);
                $(".ccu-io-availversion").html(res);
                if (compareVersion(ccuIoSettings.version, res)) {
                    $("#update_self").show().click(function () {
                        socket.emit("updateSelf");
                    });
                }
            });
        });
    });

    $("#loader_message").append(translateWord("loading datastore") + " ... <br/>");

    socket.emit("readdir", ["datastore"], function (data) {
        for (var i = 0; i < data.length; i++) {
            //if (data[i] == ".gitignore") { continue; }
            $("select#select_datastore").append('<option value="'+data[i]+'">'+data[i]+'</option>');
        }
        $("#select_datastore").multiselect({
            multiple: false,
            header: false,
            selectedList: 1
        }).change(function () {
            var file = ($("#select_datastore option:selected").val());
            if (file == "") {
                $("textarea#datastore").val("");
                $("#datastoreSave").button("disable");
            } else {

                $("textarea#datastore").val("");
                $("#datastoreSave").button("disable");

                socket.emit("readFile", [file], function (data) {
                    if (data) {
                        $("textarea#datastore").val(JSON.stringify(data, null, 2));
                        $("#datastoreSave").button("enable");
                    }
                });
            }
        });
    });

    $("#datastoreSave").button().button("disable").click(function () {
        var file = ($("#select_datastore option:selected").val());
        try {
            var data = JSON.parse($("textarea#datastore").val());

            socket.emit("writeFile", file, data, function (res) {
                //if (res) {
                showMessage ("File saved.");
                //} else {
                //    alert("Error: can't save file");
                //}
            });

        } catch (e) {
            showMessage ("Error: "+e);

        }
    });

    socket.on('reload', function() {
        window.location.reload();
    });

    socket.on('disconnect', function() {
        setTimeout(function () {
            showMessage("CCU.IO disconnected");
            setInterval(function () {
                //console.log("trying to force reconnect...");
                $.ajax({
                    url: "/ccu.io/index.html",
                    success: function () {
                        window.location.reload();
                    }
                });
            }, 90000);
        }, 100);

    });


    socket.on('reconnect', function() {
        window.location.reload();
    });

    $("#restartCCUIO").button().css("width", 300).click(function () {
        socket.emit ("getPlatform", function (platform, pl, isService) {
            if (isService) {
                $("#restartCCUIO").button("disable");
                showMessage("CCU.IO runs as windows service. Use Restart in the Windows menu.");
            } else {
                socket.emit("restart");
                $("#restarting").show();
                setTimeout(function () {
                    window.location.reload();
                }, 30000);
            }
        });
    });

    $("#refreshAddons").button().css("width", 300).click(function () {
        socket.emit("refreshAddons");
    })

    $("#refreshCCU").button().css("width", 300).click(function () {
        socket.emit('reloadData');
        //$("#reloading").show();
    });
    $("#createBackup").button().css("width", 300).click(function () {
        $(this).button( "option", "disabled", true );
        socket.emit('createBackup');
    });
    $("#createSnapshot").button().css("width", 300).click(function () {
        $(this).button( "option", "disabled", true );
        socket.emit('createSnapshot');
    });

    $("#applyBackup").button().css("width", 300).click(function () {
        $("#applyBackup").button( "option", "disabled", true );
    });

    $("#applyBackup").dropzone({
        url: "/upload?path=./www/_",
        acceptedFiles: "application/x-gzip",
        uploadMultiple: false,
        previewTemplate: '<div class="dz-preview dz-file-preview"><div class="dz-details"><div class="dz-filename"><span data-dz-name></span></div><br/>' +
            '<div class="dz-size" data-dz-size></div><br/><img data-dz-thumbnail /></div><div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>' +
            '<div class="dz-error-message"><span data-dz-errormessage></span></div></div>',
        previewsContainer: "#uploadPreview",
        clickable: true,
        dragover: function (e) {
            var el = $(e.toElement);
            $(e.toElement).closest("li.ui-li").addClass("upload-start");
        },
        dragleave: function (e) {
            $(e.toElement).closest("li.ui-li").removeClass("upload-start");
        },
        drop: function (e, ui) {
            var closest = $(e.toElement).closest("li.ui-li");
            closest.removeClass("upload-start");

        },
        complete: function (e) {
            socket.emit('applyBackup', "_" + e.name);
        },
        init: function () {
            this.on("processing", function() {
                this.options.url = "/upload?path=./www/_";
            });
        }

    });

    $("#restartRPC").button().css("width", 300).click(function () {
        socket.emit('restartRPC');
    });

    $("#reloadScriptEngine").button().css("width", 300).click(function () {
        $("#reloadScriptEngine").button("disable");
        socket.emit('reloadScriptEngine', function () {
            $("#reloadScriptEngine").button("enable");
        });
    });

    $("#dataRefresh").button().css("width", 300).click(function() {
        $("#data").html("");
        socket.emit('getDatapoints', function(obj) {
            $("#data").html(JSON.stringify(obj, null, "  "));
        });

    });

    $("#dataSave").button();

    $("#metaRefresh").button().click(function() {
        $("#meta").html("");
        socket.emit('getObjects', function(obj) {
            regaObjects = obj;
            buildMetaData();
        });
    });

    $("#metaSave").button();
    $("#metaAnonymize").button().click(function () {
        var anon = {};
        for (var id in regaObjects) {
            anon[id] = regaObjects[id];
            anon[id].Name = regaObjects[id].Name.replace(/[A-Z]EQ[0-9]{7}/, "*EQ*******");
            if (anon[id].Address) {
                anon[id].Address = regaObjects[id].Address.replace(/[A-Z]EQ[0-9]{7}/, "*EQ*******");
            }
        }
        buildMetaData(anon);
    });


    $("#indexRefresh").button().click(function() {
        $("#index").html("");
        socket.emit('getIndex', function(obj) {
            buildIndexData();
            regaIndex = obj;
        });
    });

    $("#indexSave").button();
    $("#indexAnonymize").button().click(function () {
        var anon = {};
        for (var group in regaIndex) {
            anon[group] = {};
            for (var key in regaIndex[group]) {
                if (key.match(/[A-Z]EQ[0-9]{7}/)) {
                    console.log(key);
                    anon[group][key.replace(/[A-Z]EQ[0-9]{7}/, "*EQ*******")] = regaIndex[group][key];
                } else {
                    anon[group][key] = regaIndex[group][key];
                }
            }
        }
        buildIndexData(anon);
    });
    
    $('#binrpc_listenIp').keyup(function() {
        var val = $(this).val();
        if (val == "localhost" || val == "127.0.0.1") {
            alert(translateWord("Localhost can be used only if runs on CCU2 or on LXCCU directly "));
        }    
    });

    /*
     $("#grid_log").jqGrid({
     colNames:['Timestamp','Severity', 'Message'],
     colModel:[
     {name:'timestamp',index:'timestamp', width:100},
     {name:'severity',index:'severity', width:100},
     {name:'message',index:'message', width:800}
     ],
     rowNum:10,
     autowidth: true,
     width: "100%",
     rowList:[10,20,30],
     //pager: $('#pager_log'),
     sortname: 'timestamp',
     viewrecords: true,
     sortorder: "desc",
     caption:"CCU.IO Log"
     }); //.navGrid('#pager_log',{edit:false,add:false,del:false});

     */

    var datapointsLastSel;
    var datapointsEditing = false;


    $datapointGrid.jqGrid({
        datatype: "local",

        colNames:['id', getWord('TypeName'), getWord('Name'), getWord('Address'), getWord('Parent Name'), getWord('Value'), getWord('Timestamp'), getWord('ack'), getWord('lastChange'), 'persistent'],
        colModel:[
            {name:'id',index:'id', width:60, sorttype: "int"},
            {name:'type',index:'type', width:80},
            {name:'name',index:'name', width:240},
            {name:'address',index:'address', width:240, hidden: true},
            {name:'parent',index:'parent', width:240},
            {name:'val',index:'val', width:160, editable:true},
            {name:'timestamp',index:'timestamp', width:140},
            {name:'ack',index:'ack', width:50},
            {name:'lastChange',index:'lastChange', width:140},
            {name:'persistent',index:'persistent', width:30}
        ],
        rowNum:20,
        autowidth: true,
        width: 1200,
        height: 440,
        rowList:[20,100,500,1000],
        pager: jQuery('#pager_datapoints'),
        sortname: 'timestamp',
        viewrecords: true,
        sortname: "id",
        sortorder: "asc",
        caption: getWord("datapoints"),
        onSelectRow: function(id){
            if(id && id!==datapointsLastSel){
                $datapointGrid.restoreRow(datapointsLastSel);
                datapointsLastSel = id;
            }
            $datapointGrid.editRow(id, true, function () {
                // onEdit
                datapointsEditing = true;
            }, function (obj) {
                // success
            }, "clientArray", null, function () {
                // afterSave
                datapointsEditing = false;
                //console.log(datapointsLastSel+ " "+$("#grid_datapoints").jqGrid("getCell", datapointsLastSel, "val"));
                socket.emit('setState', [datapointsLastSel, $datapointGrid.jqGrid("getCell", datapointsLastSel, "val")]);
            });
        },
        loadComplete: function () {
            $("#grid_datapoints input.delObject").click(function () {
                var id = $(this).attr("data-del-id");
                $(this).attr("disabled", true);
                socket.emit('delObject', id);
                delete regaObjects[id];
                $("table#grid_datapoints tr#"+id).remove();
            });
        }
    }).jqGrid('filterToolbar',{
        autosearch: true,
        searchOnEnter: false,
        enableClear: false
    }).navGrid('#pager_datapoints',{search:false, refresh: false, edit:false,add:true,addicon: "ui-icon-refresh", del:false, addfunc: function() {
        buildDatapointsGrid();
    }});

    $("#loader_message").append(translateWord("loading index") + " ... <br/>");

    socket.emit('getIndex', function(obj) {
        regaIndex = obj;
        $("#loader_message").append(translateWord("loading objects") + " ... <br/>");

        socket.emit('getObjects', function(obj) {
            regaObjects = obj;

            socket.on('event', function(obj) {

                if (obj[3] && regaObjects[obj[0]]) {
                    if (regaObjects[obj[0]].Name) {
                        if (regaObjects[obj[0]].Name.match(/^BidCos-RF\./)) {
                            lastRfEvent = 0;
                        } else if (regaObjects[obj[0]].Name.match(/^BidCos-Wired\./)) {
                            lastHs485Event = 0;
                        } else if (regaObjects[obj[0]].Name.match(/^CUxD\./)) {
                            lastCuxEvent = 0;
                        } else {
                            lastRegaPoll = 0;
                        }
                    }

                }

                obj[1] = $('<div/>').text(obj[1]).html();

                // Update Datapoint Grid
                var oldData = $datapointGrid.jqGrid('getRowData',obj[0]);
                var data = {
                    id: obj[0],
                    name: oldData.name,
                    address: oldData.address,
                    parent: oldData.parent,
                    type: oldData.type,
                    val: obj[1],
                    timestamp: (obj[2] == "1970-01-01 01:00:00" ? "" : obj[2]),
                    ack: obj[3],
                    lastChange: (obj[4] == "1970-01-01 01:00:00" ? "" : obj[4])
                };
                if (!datapointsEditing || datapointsLastSel != obj[0]) {
                    $datapointGrid.jqGrid('setRowData', obj[0], data);
                }
                if ($mainTabs.tabs("option", "active") == 4 && $subTabs5.tabs("option", "active") == 2 && !datapointsEditing) {
                    $datapointGrid.trigger("reloadGrid");
                }

                // Update Event Grid
                var data = {
                    id: eventCounter,
                    ise_id: obj[0],
                    type: (regaObjects[obj[0]] ? regaObjects[obj[0]].TypeName : ""),
                    name: (regaObjects[obj[0]] ? regaObjects[obj[0]].Name : ""),
                    parent: ((regaObjects[obj[0]] && regaObjects[obj[0]].Parent && regaObjects[regaObjects[obj[0]].Parent]) ? regaObjects[regaObjects[obj[0]].Parent].Name : ""),
                    value: obj[1],
                    timestamp: obj[2],
                    ack: obj[3],
                    lastchange: obj[4]
                };
                $eventGrid.jqGrid('addRowData', eventCounter++, data, "first");
                //console.log($mainTabs.tabs("option", "active") + " " + $subTabs5.tabs("option", "active"));
                if ($mainTabs.tabs("option", "active") == 4 && $subTabs5.tabs("option", "active") == 4) {
                    $eventGrid.trigger("reloadGrid");
                }
            });

            $("#loader").remove();
            $(".favicon").attr('href', 'favicon.ico');
        });
    });

    function getWord (word) {
        return "<span class='translate' data-lang='"+((ccuIoSettings && ccuIoSettings.language) ? ccuIoSettings.language : 'en')+"'>"+translateWord(word)+"</span>";
    }

    $("#grid_addons").jqGrid({
        datatype: "local",
        colNames:['id', getWord('name'), getWord('installed version'), getWord('available version'), getWord('homepage'), getWord('download')],
        colModel:[
            {name:'id',index:'id', width:60, sorttype: "int", hidden: true},
            {name:'name',index:'name', width:340, sorttype: "int"},
            {name:'installedVersion',index:'installedVersion', width:120},
            {name:'availableVersion',index:'availableVersion', width:120},
            {name:'homepage',index:'homepage', width:440},
            {name:'download',index:'download', width:120}
        ],
        autowidth: true,
        width: 1200,
        height: 440,
        rowNum: 1000,
        rowList:[1000],
        //pager: $('#pager_addons'),
        sortname: "id",
        sortorder: "asc",
        viewrecords: true,
        caption: getWord("Addons")
    });

    $adapterGrid.jqGrid({
        datatype: "local",
        colNames:['id', getWord('name'), getWord('settings'), getWord('confed'), getWord('enabled'), getWord('mode'), getWord('period')],
        colModel:[
            {name:'id',      index:'id', width:60, sorttype: "int", hidden: true},
            {name:'name',    index:'name', width:340, sorttype: "int"},
            {name:'settings',index:'settings', width:120, sorttype: "int"},
            {name:'confed',  index:'confed', width:100, hidden: true},
            {name:'enabled', index:'enabled', width:100},
            {name:'mode',    index:'mode', width:100},
            {name:'period',  index:'period', width:100}
        ],
        autowidth: true,
        width: 1200,
        height: 440,
        rowList:[1000],
        rowNum: 1000,
        //pager: $('#pager_addons'),
        sortname: "id",
        sortorder: "asc",
        viewrecords: true,
        caption: getWord("Adapter")
    });

    $("#grid_objecttree").jqGrid({
        datatype: "local",
        colNames: [
            ('id'),
            ('Name'),
            ('TypeName'),
            ('Interface'),
            ('Address'),
            ('HssType'),
            '_persistent'
        ],
        colModel: [
            {name: 'id', index: 'id', width: 48, sorttype: 'int'},
            {name: 'Name', index: 'Name', width: 240},
            {name: 'TypeName', index: 'TypeName', width: 130},
            {name: 'Interface', index: 'Interface', width: 88},
            {name: 'Address', index: 'Address', width: 90},
            {name: 'HssType', index: 'HssType', width: 130},
            {name: '_persistent', index: '_persistent', width: 30}
        ],
        rowNum:     20,
        autowidth:  true,
        width:      1200,
        height:     440,
        rowList:    [20,100,500,1000],
        pager:      $('#pager_objecttree'),
        sortname:   "id",
        sortorder:  "desc",
        viewrecords: true,
        sortorder:  "desc",
        caption:    getWord("Object tree"),
        ignoreCase: true,
        subGrid:    true,
        subGridRowExpanded: function(grid_id, row_id) {
            subGridObjecttree(grid_id, row_id);
        },
        loadComplete: function () {
            $("#grid_objecttree input.delObject").click(function () {
                var id = $(this).attr("data-del-id");
                $(this).attr("disabled", true);
                socket.emit('delObject', id);
                delete regaObjects[id];
                $("#grid_objecttree tr#"+id).remove();
            });
        }
    }).jqGrid('filterToolbar',{
        defaultSearch:'cn',
        autosearch: true,
        searchOnEnter: false,
        enableClear: false
    });



    $("#grid_events").jqGrid({
        datatype: "local",
        colNames:[getWord('eventCount'),'id', getWord('TypeName'), getWord('Name'), getWord('Parent Name'),getWord('Value'), getWord('Timestamp'), getWord('ack'), getWord('lastChange')],
        colModel:[
            {name:'id',index:'id', width:60, sorttype: "int", hidden: true},
            {name:'ise_id',index:'ise_id', width:60, sorttype: "int"},
            {name:'type',index:'type', width:80},
            {name:'name',index:'name', width:240},
            {name:'parent',index:'parent', width:240},
            {name:'value',index:'value', width:160},
            {name:'timestamp',index:'timestamp', width:140},
            {name:'ack',index:'ack', width:50},
            {name:'lastchange',index:'lastchange', width:140}
        ],
        cmTemplate: {sortable:false},
        rowNum:20,
        autowidth: true,
        width: 1200,
        height: 440,
        rowList:[20,100,500,1000],
        pager: $('#pager_events'),
        sortname: "id",
        sortorder: "desc",
        viewrecords: true,
        sortorder: "desc",
        caption: getWord("Events"),
        ignoreCase:true
    }).jqGrid('filterToolbar',{
            defaultSearch:'cn',

            autosearch: true,
            searchOnEnter: false,
            enableClear: false
        }).navGrid('#pager_events',{search:false, refresh:false, edit:false,add:true, addicon: "ui-icon-trash", del:false, addfunc: function () {
            $eventGrid.jqGrid("clearGridData");
            eventCounter = 0;
        }});

    function resizeGrids() {
        var x = $(window).width();
        var y = $(window).height();
        if (x < 720) { x = 720; }
        if (y < 480) { y = 480; }
        $(".gridSub").setGridHeight(y - 250).setGridWidth(x - 100);
        $(".gridMain").setGridHeight(y - 150).setGridWidth(x - 60);
        $("#grid_addons").setGridHeight(y - 180).setGridWidth(x - 60);
        $("#adapter_config_json").css("width", x-60);
        $("#adapter_config_json").css("height", y-180);
        $("#adapter_config_container").css("width", x-60);
        $("#adapter_config_container").css("height", y-200);

    }
    $(window).resize(function() {
        resizeGrids();
    });

    $("#saveSettings").button().click(saveSettings);


    var addonInstall = {    
        "dashui":           "https://github.com/hobbyquaker/DashUI/archive/master.zip",
        "slimui":           "https://github.com/hobbyquaker/SlimUI/archive/master.zip",
        "yahui":            "https://github.com/hobbyquaker/yahui/archive/master.zip",
        "eventlist":        "https://github.com/GermanBluefox/CCU-IO.Eventlist/archive/master.zip",
        "charts":           "https://github.com/hobbyquaker/CCU-IO-Highcharts/archive/master.zip",
        "ScriptGUI":        "https://github.com/smiling-Jack/CCU-IO.ScriptGUI/archive/master.zip",
        "ScriptEditor":     "https://github.com/smiling-Jack/CCU-IO.ScriptEditor/archive/master.zip"
    };

    $("#install_addon").button().click(function () {
        $("#install_addon_dialog").dialog("open");
    });

    $("#install_addon_button").button().click(function () {
        var addon = $("#install_addon_select option:selected").val();
        if (addon) {
            $("#install_addon_dialog").dialog("close");
            socket.emit("updateAddon", addonInstall[addon], addon, function (err) {
                if (err) {
                    showMessage (err);
                } else {
                    showMessage ("install started");
                }
            });
        }

    });

    function loadSettings() {
        $("#language [value='"+(ccuIoSettings.language || 'en')+"']").attr("selected", "selected");

        $("#language").change(function () {
            translateAll ($(this).val());
        });


        $("#ccuIp").val(ccuIoSettings.ccuIp);
        $("#binrpc_listenIp").val(ccuIoSettings.binrpc.listenIp);

        if (ccuIoSettings.stats) {
            $("#stats").attr("checked", true);
        } else {
            $("#stats").removeAttr("checked");
        }
        $("#statsInterval").val(ccuIoSettings.statsIntervalMinutes);

        if (ccuIoSettings.logging.enabled) {
            $("#logging_enabled").attr("checked", true);
        } else {
            $("#logging_enabled").removeAttr("checked");
        }
        $("#logging_writeInterval").val(ccuIoSettings.logging.writeInterval);

        if (ccuIoSettings.scriptEngineEnabled) {
            $("#scriptEngineEnabled").attr("checked", true);
        } else {
            $("#scriptEngineEnabled").removeAttr("checked");
        }
        $("#longitude").val(ccuIoSettings.longitude);
        $("#latitude").val(ccuIoSettings.latitude);

        if (ccuIoSettings.httpEnabled) {
            $("#httpEnabled").attr("checked", true);
        } else {
            $("#httpEnabled").removeAttr("checked");
        }
        $("#ioListenPort").val(ccuIoSettings.ioListenPort  || $("#ioListenPort").attr("data-defaultval"));
        if (ccuIoSettings.httpsEnabled) {
            $("#httpsEnabled").attr("checked", true);
        } else {
            $("#httpsEnabled").removeAttr("checked");
        }
        $("#ioListenPortSsl").val(ccuIoSettings.ioListenPortSsl || $("#ioListenPortSsl").attr("data-defaultval"));

        if (ccuIoSettings.useIPv6) {
            $("#v6Enabled").attr("checked", true);
        } else {
            $("#v6Enabled").removeAttr("checked");
        }

        if (ccuIoSettings.authentication.enabled) {
            $("#authentication_enabled").attr("checked", true);
        } else {
            $("#authentication_enabled").removeAttr("checked");
        }
        if (ccuIoSettings.authentication.enabledSsl) {
            $("#authentication_enabledSsl").attr("checked", true);
        } else {
            $("#authentication_enabledSsl").removeAttr("checked");
        }

        $("#authentication_user").val(ccuIoSettings.authentication.user);
        $("#authentication_password").val(ccuIoSettings.authentication.password);

        if (ccuIoSettings.useCache) {
            $("#useCache").attr("checked", true);
        } else {
            $("#useCache").removeAttr("checked");
        }

        $("#binrpc_listenPort").val(ccuIoSettings.binrpc.listenPort);

        if (ccuIoSettings.binrpc.rfdEnabled) {
            $("#binrpc_rfdEnabled").attr("checked", true);
        } else {
            $("#binrpc_rfdEnabled").removeAttr("checked");
        }
        if (ccuIoSettings.binrpc.hs485dEnabled) {
            $("#binrpc_hs485dEnabled").attr("checked", true);
        } else {
            $("#binrpc_hs485dEnabled").removeAttr("checked");
        }
        if (ccuIoSettings.binrpc.cuxdEnabled) {
            $("#binrpc_cuxdEnabled").attr("checked", true);
        } else {
            $("#binrpc_cuxdEnabled").removeAttr("checked");
        }
        $("#binrpc_cuxdPort").val(ccuIoSettings.binrpc.cuxdPort);
        if (ccuIoSettings.binrpc.checkEvents.enabled) {
            $("#binrpc_checkEvents_enabled").attr("checked", true);
        } else {
            $("#binrpc_checkEvents_enabled").removeAttr("checked");
        }
        $("#binrpc_checkEvents_rfd").val(ccuIoSettings.binrpc.checkEvents.rfd);
        $("#binrpc_checkEvents_hs485d").val(ccuIoSettings.binrpc.checkEvents.hs485d);

        $("#regahss_pollDataInterval").val(ccuIoSettings.regahss.pollDataInterval);
        $("#regahss_pollDataTrigger").val(ccuIoSettings.regahss.pollDataTrigger);
        if (ccuIoSettings.regahss.pollData) {
            $("#regahss_pollData").attr("checked", true);
        } else {
            $("#regahss_pollData").removeAttr("checked");
        }


    }



    function saveSettings() {
        ccuIoSettings.language = $("#language").val();
        ccuIoSettings.ccuIp = $("#ccuIp").val();
        ccuIoSettings.binrpc.listenIp = $("#binrpc_listenIp").val();

        if ($("#stats").is(":checked")) {
            ccuIoSettings.stats = true;
        } else {
            ccuIoSettings.stats = false;
        }

        ccuIoSettings.statsIntervalMinutes = $("#statsInterval").val();

        if ($("#logging_enabled").is(":checked")) {
            ccuIoSettings.logging.enabled = true;
        } else {
            ccuIoSettings.logging.enabled = false;
        }
        ccuIoSettings.logging.writeInterval = $("#logging_writeInterval").val();

        if ($("#scriptEngineEnabled").is(":checked")) {
            ccuIoSettings.scriptEngineEnabled = true;
        } else {
            ccuIoSettings.scriptEngineEnabled = false;
        }
        ccuIoSettings.longitude = $("#longitude").val();
        ccuIoSettings.latitude = $("#latitude").val();

        if ($("#httpEnabled").is(":checked")) {
            ccuIoSettings.httpEnabled = true;
        } else if ($("#httpsEnabled").is(":checked")) {
            ccuIoSettings.httpEnabled = false;
        } else {
            ccuIoSettings.httpEnabled = true;
        }

        if ($("#v6Enabled").is(":checked")) {
            ccuIoSettings.useIPv6 = true;
        } else {
            ccuIoSettings.useIPv6 = false;
        }

        ccuIoSettings.ioListenPort = $("#ioListenPort").val();
        if ($("#httpsEnabled").is(":checked")) {
            ccuIoSettings.httpsEnabled = true;
        } else {
            ccuIoSettings.httpsEnabled = false;
        }
        ccuIoSettings.ioListenPortSsl = $("#ioListenPortSsl").val();

        if ($("#authentication_enabled").is(":checked")) {
            ccuIoSettings.authentication.enabled = true;

        } else {
            ccuIoSettings.authentication.enabled = false;
        }
        if ($("#authentication_enabledSsl").is(":checked")) {
            ccuIoSettings.authentication.enabledSsl = true;
        } else {
            ccuIoSettings.authentication.enabledSsl = false;
        }

        ccuIoSettings.authentication.user = $("#authentication_user").val();
        ccuIoSettings.authentication.password = $("#authentication_password").val();
        if ($("#useCache").is(":checked")) {
            ccuIoSettings.useCache = true;
        } else {
            ccuIoSettings.useCache = false;
        }
        ccuIoSettings.binrpc.listenPort = $("#binrpc_listenPort").val();

        if ($("#binrpc_rfdEnabled").is(":checked")) {
            ccuIoSettings.binrpc.rfdEnabled = true;
        } else {
            ccuIoSettings.binrpc.rfdEnabled = false;
        }
        if ($("#binrpc_hs485dEnabled").is(":checked")) {
            ccuIoSettings.binrpc.hs485dEnabled = true;
        } else {
            ccuIoSettings.binrpc.hs485dEnabled = false;
        }
        if ($("#binrpc_cuxdEnabled").is(":checked")) {
            ccuIoSettings.binrpc.cuxdEnabled = true;
        } else {
            ccuIoSettings.binrpc.cuxdEnabled = false;
        }
        ccuIoSettings.binrpc.cuxdPort = $("#binrpc_cuxdPort").val();
        if ($("#binrpc_checkEvents_enabled").is(":checked")) {
            ccuIoSettings.binrpc.checkEvents.enabled = true;
        } else {
            ccuIoSettings.binrpc.checkEvents.enabled = false;
        }
        ccuIoSettings.binrpc.checkEvents.rfd = $("#binrpc_checkEvents_rfd").val();
        ccuIoSettings.binrpc.checkEvents.hs485d = $("#binrpc_checkEvents_hs485d").val();

        ccuIoSettings.regahss.pollDataInterval = $("#regahss_pollDataInterval").val();
        ccuIoSettings.regahss.pollDataTrigger = $("#regahss_pollDataTrigger").val();
        if ($("#regahss_pollData").is(":checked")) {
            ccuIoSettings.regahss.pollData = true;
        } else {
            ccuIoSettings.regahss.pollData = false;
        }
        if ($("#regahss_pollDataTriggerEnabled").is(":checked")) {
            ccuIoSettings.regahss.pollDataTriggerEnabled = true;
        } else {
            ccuIoSettings.regahss.pollDataTriggerEnabled = false;
        }
        var settingsWithoutAdapters = JSON.parse(JSON.stringify(ccuIoSettings));
        delete settingsWithoutAdapters.adapters;
        socket.emit("writeFile", "io-settings.json", settingsWithoutAdapters, function () {
            showMessage("CCU.IO settings saved. Please restart CCU.IO");
        });
    }

    function restartAdapter(adapter) {

        socket.emit("restartAdapter", adapter, function (res) {
            loadAdapterSettings();
            showMessage(res);

        });
    }

    function editAdapterSettings(adapter) {
        $("#adapter_name").html(adapter);
        $("#adapter_loading").show();
        $("#adapter_overview").hide();
        $("#adapter_config").hide();


        socket.emit("readFile", "adapter-"+adapter+".json", function (data) {
            try {
                $("#adapter_config_json").html(JSON.stringify(data, null, "    "));
            } catch (e) {
                $("#adapter_config_json").html("{}");
                showMessage("Error: reading adapter config - invalid JSON");
            }
            currentAdapterSettings = data;
            socket.emit("readRawFile", "adapter/"+adapter+"/settings.html", function (content) {
                $("#adapter_loading").hide();
                $("#adapter_config").show();
                if (content) {
                    $("#adapter_config_container").html(content);
                    $("#adapter_config_json").hide();
                    $("#adapter_config_container").show();
                } else {
                    $("#adapter_config_container").hide();
                    $("#adapter_config_json").show();
                    resizeGrids();
                }
            });
        });

    }

    function saveAdapterSettings() {
        var adapter = $("#adapter_name").html();
        try {
            var adapterSettings = JSON.parse($("#adapter_config_json").val());
            ccuIoSettings.adapters[adapter] = adapterSettings;

            socket.emit("writeAdapterSettings", adapter, adapterSettings, function () {
                showMessage(adapter + " " + translateWord("settings saved."));
                loadAdapterSettings(adapter);
            });
            return true;
        } catch (e) {
            showMessage("Error: invalid JSON");
            return false;
        }
    }

    function showMessage(text, caption) {
        if (!text) {
            $('#dialogModal').dialog("close");
            return;
        }
        $('#dialogModal').show();
        $('#dialogModal').html("<p>"+translateWord (text) +"</p>").attr('title', translateWord (caption || "Message"));
        $( "#dialogModal" ).dialog({
            height: 200,
            modal: true,
            buttons: {
                "Ok": function () {
                    $( this ).dialog( "close" );
                }
            }
        });
    }

    $("#adapter_save").button().click(saveAdapterSettings);

    $("#adapter_close").button().click(function () {
        if (saveAdapterSettings()) {
            $("#adapter_config").hide();
            $("#adapter_overview").show();
        }
    });

    $("#adapter_cancel").button().click(function () {
        $("#adapter_config").hide();
        $("#adapter_overview").show();
    });

    function buildDevicesGrid() {
        for (var id in regaObjects) {
            var obj = regaObjects[id];
            obj.id = id;
            obj._persistent = (obj._persistent ? "<input class='delObject' data-del-id='"+id+"' type='button' value='x'/>" : "");
            if (!obj.Parent) {
                // FIXME Multiple usage of same IDs (datapoint-grid)
                $("#grid_objecttree").jqGrid('addRowData', id, obj);
            }
        }
        $("#grid_objecttree").trigger("reloadGrid");
    }

    function buildMetaData(data) {
        data = data || regaObjects;
        $('#meta').html(JSON.stringify(data, null, "  "));
    }

    function buildIndexData(data) {
        data = data || regaIndex;
        $('#index').html(JSON.stringify(data, null, "  "));
    }
    function buildDatapointsGrid() {
        $("#loader_message").append(translateWord("loading datapoints") + " ... <br/>");
        $datapointGrid.jqGrid("clearGridData");

        socket.emit('getDatapoints', function(obj) {
            for (var id in obj) {
                if (isNaN(id)) { continue; }
                var data = {
                    id:         id,
                    name:       (regaObjects[id] ?  regaObjects[id].Name : ""),
                    address:    (regaObjects[id] ?  regaObjects[id].Address : ""),
                    parent:     (regaObjects[id] && regaObjects[id].Parent && regaObjects[regaObjects[id].Parent] ? regaObjects[regaObjects[id].Parent].Name : ""),
                    type:       (regaObjects[id] ?  regaObjects[id].TypeName : ""),
                    val:        $('<div/>').text(obj[id][0]).html(),
                    timestamp:  (obj[id][1] == "1970-01-01 01:00:00" ? "" : obj[id][1]),
                    ack:        obj[id][2],
                    lastChange: (obj[id][3] == "1970-01-01 01:00:00" ? "" : obj[id][3]),
                    persistent: (regaObjects[id] && regaObjects[id]._persistent ? "<input class='delObject' data-del-id='"+id+"' type='button' value='x'/>" : "")
                };
                $datapointGrid.jqGrid('addRowData', id, data);
            }
            $datapointGrid.trigger("reloadGrid");
        });
    }

    function subGridObjecttree(grid_id, row_id) {
        var subgrid_table_id = grid_id + "_t";

        var gridObjects = {};
        var count = 0;

        for (var dev in regaObjects) {
            if (regaObjects[dev].Parent == row_id) {
                count += 1;
                gridObjects[dev] = regaObjects[dev];
            }
        }

        if (count == 0) {
            return null;
        }

        $("#" + grid_id).html("<table id='" + subgrid_table_id + "''></table>");
        var gridConf = {
            datatype: "local",
            colNames: [
                ('id'),
                ('Name'),
                ('TypeName'),
                ('Interface'),
                ('Address'),
                ('HssType'),
                '_persistent'
            ],
            colModel: [
                {name: 'id', index: 'id', width: 48, sorttype: 'int'},
                {name: 'Name', index: 'Name', width: 240},
                {name: 'TypeName', index: 'TypeName', width: 130},
                {name: 'Interface', index: 'Interface', width: 88},
                {name: 'Address', index: 'Address', width: 90},
                {name: 'HssType', index: 'HssType', width: 130},
                {name: '_persistent', index: '_persistent', width: 30}
            ],
            rowNum: 1000000,
            autowidth: true,
            height: "auto",
            width: 1200,
            sortname: "id",
            sortorder: "desc",
            viewrecords: true,
            sortorder: "desc",
            ignoreCase: true,
            subGrid: true,
            subGridRowExpanded: function(grid_id, row_id) {
                subGridObjecttree(grid_id, row_id);
            }
        };

        $("#" + subgrid_table_id).jqGrid(gridConf);

        for (var id in gridObjects) {
            $("#" + subgrid_table_id).jqGrid('addRowData', id, gridObjects[id]);
        }

        $("#" + subgrid_table_id + " input.delObject").click(function () {
            var id = $(this).attr("data-del-id");
            $(this).attr("disabled", true);
            socket.emit('delObject', id);
            delete regaObjects[id];
            $("#" + subgrid_table_id + " tr#"+id).remove();
        });

    }
});
