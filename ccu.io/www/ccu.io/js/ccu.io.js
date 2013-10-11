$(document).ready(function () {

    var regaObjects,
        regaIndex;

    $(".jqui-tabs").tabs();

    var eventCounter = 0;
    var $mainTabs = $("#mainTabs");
    var $subTabs5 = $("#subTabs5");
    var $datapointGrid = $("#grid_datapoints");
    var $eventGrid = $("#grid_events");

    var socket = io.connect( $(location).attr('protocol') + '//' +  $(location).attr('host'));

    socket.emit('getStringtable', function(obj) {
        $("#stringtable").html(JSON.stringify(obj, null, "  "));
    });



    socket.on('reload', function() {
        window.location.reload();
    });

    socket.emit("getVersion", function (version) {
        $(".ccu-io-version").html(version);
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

    $("#refreshCCU").button().click(function () {
        socket.emit('reloadData');
        $("#reloading").show();
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


    $("#grid_datapoints").jqGrid({
        datatype: "local",

        colNames:['id', 'TypeName', 'Name', 'Parent Name', 'Value', 'Timestamp', 'ack', 'lastChange'],
        colModel:[
            {name:'id',index:'id', width:60, sorttype: "int"},
            {name:'type',index:'type', width:80},
            {name:'name',index:'name', width:240},
            {name:'parent',index:'parent', width:240},
            {name:'val',index:'val', width:160},
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
        caption:"datapoints"
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
                $datapointGrid.jqGrid('setRowData', obj[0], data);
                if ($mainTabs.tabs("option", "active") == 4 && $subTabs5.tabs("option", "active") == 2) {
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



});