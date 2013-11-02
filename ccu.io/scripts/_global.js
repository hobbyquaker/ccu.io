/**
 *
 *  _global.js
 *
 *  Hier können Funktionen definiert werden die in allen Scripten zur Verfügung stehen
 *
 *  Hier sollten auch evtl benötigte Nodejs Module eingebunden werden
 *
 */

function commaSepeartedList(arr) {
    var text = "";
    var length = arr.length;
    if (length == 0) {
        text = "";
    } else {
        var first = true;
        for (var i=0; i<length; i++) {
            if (!first) {
                text = text + ", ";
            } else {
                first = false;
            }
            text = text + arr[i];
        }
    }
    return text;
}
