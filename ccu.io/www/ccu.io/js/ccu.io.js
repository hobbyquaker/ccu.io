$(document).ready(function () {

    var regaObjects,
        regaIndex,
        ccuIoSettings;

    $(".jqui-tabs").tabs();

    var eventCounter = 0;
    var $mainTabs = $("#mainTabs");
    var $subTabs5 = $("#subTabs5");

    $mainTabs.tabs({
        activate: function (e, ui) {
            resizeGrids();
        }
    });

    var $datapointGrid = $("#grid_datapoints");
    var $eventGrid = $("#grid_events");

    var socket = io.connect( $(location).attr('protocol') + '//' +  $(location).attr('host'));

    socket.emit('getStringtable', function(obj) {
        $("#stringtable").html(JSON.stringify(obj, null, "  "));
    });

    socket.emit("getSettings", function (settings) {
        ccuIoSettings = settings;
        $(".ccu-io-version").html(settings.version);
        $(".ccu-io-scriptengine").html(settings.scriptEngineEnabled);
        $(".ccu-io-adapters").html(settings.adaptersEnabled);
        $(".ccu-io-logging").html(settings.logging.enabled);
        socket.emit("readdir", ["adapter"], function (data) {
            for (var i = 0; i < data.length; i++) {
                var adapter = data[i];
                if (adapter == "skeleton.js") { continue; }
                var adapterData = {
                    name:   data[i],
                    confed:     (settings.adapters[data[i]]?"true":"false"),
                    enabled:    (settings.adapters[data[i]]?settings.adapters[data[i]].enabled:""),
                    mode:       (settings.adapters[data[i]]?settings.adapters[data[i]].mode:""),
                    period:     (settings.adapters[data[i]]?settings.adapters[data[i]].period:"")
                }
                $("#grid_adapter").jqGrid("addRowData", i, adapterData);
            }
        });

    });


    socket.emit("readdir", ["www"], function (data) {
        //console.log(data);
        for (var i = 0; i < data.length; i++) {
            var addon = data[i];
            if (addon == "lib" || addon == "ccu.io") { continue; }
            socket.emit("readJsonFile", "www/"+addon+"/io-addon.json", function(meta) {
                if (meta) {
                    var hp = meta.urlHomepage.match(/[http|https]:\/\/(.*)/);
                    var dl = meta.urlDownload.match(/\/([^/]+)$/);

                    var addonData = {
                        name:               meta.name,
                        installedVersion:   meta.version,
                        availableVersion:   "<input data-update-name='"+meta.name+"' class='updateCheck' data-update-url='"+meta.urlMeta+"' type='button' value='check'/>",
                        homepage:           "<a href='"+meta.urlHomepage+"' target='_blank'>"+hp[1]+"</a>",
                        download:           "<a href='"+meta.urlDownload+"' target='_blank'>"+dl[1]+"</a>"
                    }
                    $("#grid_addons").jqGrid('addRowData', i, addonData);


                }
            });
        }
        setTimeout(function() {
            $("input.updateCheck").click(function () {
                $(this).attr("disabled", true);
                var $this = $(this);
                var url = $(this).attr("data-update-url");
                var name = $(this).attr("data-update-name");
                var id = $(this).attr("id");
                socket.emit("getUrl", url, function(res) {
                    obj = JSON.parse(res);
                    $("input.updateCheck[data-update-name='"+obj.name+"']").parent().append(obj.version);
                    $("input.updateCheck[data-update-name='"+obj.name+"']").hide();
                });
            });
        }, 2500);
    });

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
                    alert("File saved.");
                //} else {
                //    alert("Error: can't save file");
                //}
            });

        } catch (e) {
            alert("Error: "+e);

        }
    });

    socket.on('reload', function() {
        window.location.reload();
    });


    $("#refreshCCU").button().click(function () {
        socket.emit('reloadData');
        $("#reloading").show();
    });
    $("#reloadScriptEngine").button().click(function () {
        $("#reloadScriptEngine").button("disable");
        socket.emit('reloadScriptEngine', function () {
            $("#reloadScriptEngine").button("enable");
        });
    });

    $("#dataRefresh").button().click(function() {
        $("#data").html("");
        socket.emit('getDatapoints', function(obj) {
            $("#data").html(JSON.stringify(obj, null, "  "));
        });

    });

    $("#dataSave").button();

    $("#metaRefresh").button().click(function() {
        $("#meta").html("");
        socket.emit('getObjects', function(obj) {
            $("#meta").html(JSON.stringify(obj, null, "  "));
            regaObjects = obj;
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
        $("#meta").html(JSON.stringify(anon, null, "  "));
    });


    $("#indexRefresh").button().click(function() {
        $("#index").html("");
        socket.emit('getIndex', function(obj) {
            regaIndex = obj;
            $("#index").html(JSON.stringify(obj, null, "  "));
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
        $("#index").html(JSON.stringify(anon, null, "  "));
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

    $("#grid_datapoints").jqGrid({
        datatype: "local",

        colNames:['id', 'TypeName', 'Name', 'Parent Name', 'Value', 'Timestamp', 'ack', 'lastChange'],
        colModel:[
            {name:'id',index:'id', width:60, sorttype: "int"},
            {name:'type',index:'type', width:80},
            {name:'name',index:'name', width:240},
            {name:'parent',index:'parent', width:240},
            {name:'val',index:'val', width:160, editable:true},
            {name:'timestamp',index:'timestamp', width:140},
            {name:'ack',index:'ack', width:50},
            {name:'lastChange',index:'lastChange', width:140}
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
        caption:"datapoints",
        onSelectRow: function(id){
            if(id && id!==datapointsLastSel){
                $('#grid_datapoints').restoreRow(datapointsLastSel);
                datapointsLastSel=id;
            }
            $('#grid_datapoints').editRow(id, true, function () {
                // onEdit
                datapointsEditing = true;
            }, function (obj) {
                // success
            }, "clientArray", null, function () {
                // afterSave
                datapointsEditing = false;
                //console.log(datapointsLastSel+ " "+$("#grid_datapoints").jqGrid("getCell", datapointsLastSel, "val"));
                socket.emit('setState', [datapointsLastSel, $("#grid_datapoints").jqGrid("getCell", datapointsLastSel, "val")]);
            });
        }
    }).jqGrid('filterToolbar',{
        autosearch: true,
        searchOnEnter: false,
        enableClear: false
    }).navGrid('#pager_datapoints',{search:false, refresh: false, edit:false,add:true,addicon: "ui-icon-refresh", del:false, addfunc: function() {
        $datapointGrid.jqGrid("clearGridData");
         loadDatapoints();
    }});


    socket.emit('getIndex', function(obj) {
        $("#index").html(JSON.stringify(obj, null, "  "));
        regaIndex = obj;
        socket.emit('getObjects', function(obj) {
            regaObjects = obj;
            $("#meta").html(JSON.stringify(obj, null, "  "));
            regaObjects = obj;

            socket.on('event', function(obj) {
                obj[1] = $('<div/>').text(obj[1]).html();

                // Update Datapoint Grid
                var oldData = $datapointGrid.jqGrid('getRowData',obj[0]);
                var data = {
                    id: obj[0],
                    name: oldData.name,
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
                    parent: (regaObjects[obj[0]] && regaObjects[obj[0]].Parent ? regaObjects[regaObjects[obj[0]].Parent].Name : ""),
                    value: obj[1],
                    timestamp: obj[2],
                    ack: obj[3],
                    lastchange: obj[4]
                };
                $eventGrid.jqGrid('addRowData', eventCounter++, data, "first");
                //console.log($mainTabs.tabs("option", "active") + " " + $subTabs5.tabs("option", "active"));
                if ($mainTabs.tabs("option", "active") == 4 && $subTabs5.tabs("option", "active") == 3) {
                    $eventGrid.trigger("reloadGrid");
                }
            });

            loadDatapoints();

        });
    });

    function loadDatapoints() {
        socket.emit('getDatapoints', function(obj) {
            var i = 1;
            for (var id in obj) {
                if (isNaN(id)) { continue; }
                var data = {
                    id: id,
                    name: (regaObjects[id] ? regaObjects[id].Name : ""),
                    parent: (regaObjects[id] && regaObjects[id].Parent ? regaObjects[regaObjects[id].Parent].Name : ""),
                    type: (regaObjects[id] ? regaObjects[id].TypeName : ""),
                    val: $('<div/>').text(obj[id][0]).html(),
                    timestamp: (obj[id][1] == "1970-01-01 01:00:00" ? "" : obj[id][1]),
                    ack: obj[id][2],
                    lastChange: (obj[id][3] == "1970-01-01 01:00:00" ? "" : obj[id][3])
                };
                $("#grid_datapoints").jqGrid('addRowData',id,data);
            }
            $("#grid_datapoints").trigger("reloadGrid");
        });
    }

    $("#grid_addons").jqGrid({
        datatype: "local",
        colNames:['id', 'name', 'installed version', 'available version', 'homepage', 'download'],
        colModel:[
            {name:'id',index:'id', width:60, sorttype: "int", hidden: true},
            {name:'name',index:'name', width:340, sorttype: "int"},
            {name:'installedVersion',index:'installedVersion', width:120},
            {name:'availableVersion',index:'availableVersion', width:120, align: "center"},
            {name:'homepage',index:'homepage', width:440},
            {name:'download',index:'download', width:120}
        ],
        autowidth: true,
        width: 1200,
        height: 440,
        rowList:[20],
        //pager: $('#pager_addons'),
        sortname: "id",
        sortorder: "asc",
        viewrecords: true,
        caption: "Addons"
    });

    $("#grid_adapter").jqGrid({
        datatype: "local",
        colNames:['id', 'name', 'confed', 'enabled', 'mode', 'period'],
        colModel:[
            {name:'id',index:'id', width:60, sorttype: "int", hidden: true},
            {name:'name',index:'name', width:340, sorttype: "int"},
            {name:'confed',index:'confed', width:120},
            {name:'enabled',index:'enabled', width:120},
            {name:'mode',index:'mode', width:120},
            {name:'period',index:'period', width:120}
        ],
        autowidth: true,
        width: 1200,
        height: 440,
        rowList:[20],
        //pager: $('#pager_addons'),
        sortname: "id",
        sortorder: "asc",
        viewrecords: true,
        caption: "Adapter"
    });

    $("#grid_events").jqGrid({
        datatype: "local",
        colNames:['eventCount','id', 'TypeName', 'Name', 'Parent Name','Value', 'Timestamp', 'ack', 'lastChange'],
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
        caption: "Events"
    }).jqGrid('filterToolbar',{
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
    }
    $(window).resize(function() {
        resizeGrids();
    });


});