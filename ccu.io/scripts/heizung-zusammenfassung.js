/**
 *
 *  Dieses Script schreibt in die Variable 100000 eine Komma-getrennte Liste aller Räume
 *  in denen eine Heizung aktiv ist
 *
 */


var nameGewerkHeizung = "Heizung";

setObject(100000, {
    Name: "Heizung Zusammenfassung",
    TypeName: "VARDP"
});


beheizteRaeumeFinden();

subscribe({func:"Heizung", name:/VALVE_STATE$/, change: "ne"}, function (obj) {
    beheizteRaeumeFinden();
});

function beheizteRaeumeFinden() {
    var idGewerkHeizung = regaIndex.Name[nameGewerkHeizung][0];
    var arrHeizung = regaObjects[idGewerkHeizung].Channels;
    var arrRaeume = regaIndex.ENUM_ROOMS;

    var arrBeheizteRaeume = [];

    for (var i = 0; i < arrRaeume.length; i++) {
        var idRaum = arrRaeume[i];
        var nameRaum = regaObjects[idRaum].Name;
        var arrRaumKanaele = regaObjects[idRaum].Channels;
        for (var j = 0; j < arrRaumKanaele.length; j++) {
            var idKanal = arrRaumKanaele[j]
            if (arrHeizung.indexOf(idKanal) != -1) {
                if (regaObjects[idKanal].DPs.VALVE_STATE && datapoints[regaObjects[idKanal].DPs.VALVE_STATE][0] > 0) {
                    if (arrBeheizteRaeume.indexOf(nameRaum) == -1) {
                        arrBeheizteRaeume.push(nameRaum);
                    }
                }

            }
        }

    }

    var text = commaSeparatedList(arrBeheizteRaeume);

    setState(100000, text);

}
