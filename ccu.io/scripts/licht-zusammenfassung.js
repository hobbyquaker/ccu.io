/**
 *
 *  Dieses Script schreibt in die Variable 100001 eine Komma-getrennte Liste aller Räume
 *  in denen Licht brennt
 *
 */

var nameGewerkLicht = "Licht";

setObject(100001, {
    Name: "Licht Zusammenfassung",
    TypeName: "VARDP"
});

beleuchteteRaeumeFinden();

subscribe({func:"Licht", name:/STATE$|LEVEL$/, change: "ne"}, function (obj) {
    beleuchteteRaeumeFinden();
});

function beleuchteteRaeumeFinden() {
    var idGewerkLicht = regaIndex.Name[nameGewerkLicht][0];
    var arrLicht = regaObjects[idGewerkLicht].Channels;
    var arrRaeume = regaIndex.ENUM_ROOMS;

    var arrBeleuchteteRaeume = [];

    for (var i = 0; i < arrRaeume.length; i++) {
        var idRaum = arrRaeume[i];
        var nameRaum = regaObjects[idRaum].Name;
        var arrRaumKanaele = regaObjects[idRaum].Channels;
        for (var j = 0; j < arrRaumKanaele.length; j++) {
            var idKanal = arrRaumKanaele[j]
            if (arrLicht.indexOf(idKanal) != -1) {
                if (regaObjects[idKanal].DPs.STATE && (datapoints[regaObjects[idKanal].DPs.STATE][0] > 0 || datapoints[regaObjects[idKanal].DPs.STATE][0] === "true")) {
                    if (arrBeleuchteteRaeume.indexOf(nameRaum) == -1) {
                        arrBeleuchteteRaeume.push(nameRaum);
                    }
                }
                if (!regaObjects[idKanal].DPs.STATE && regaObjects[idKanal].DPs.LEVEL && datapoints[regaObjects[idKanal].DPs.LEVEL][0] > 0) {
                    if (arrBeleuchteteRaeume.indexOf(nameRaum) == -1) {
                        arrBeleuchteteRaeume.push(nameRaum);
                    }
                }
            }
        }

    }

    var text = commaSeparatedList(arrBeleuchteteRaeume);

    setState(100001, text);

}
