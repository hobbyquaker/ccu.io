/**
 *
 *  Dieses Script gibt im Logfile ccu.io.log aus in welchem Raum ein Fenster geöffnet oder geschlossen wurde.
 *
 */

subscribe({name:/STATE$/, deviceType:/HM-Sec-SC|HM-Sec-RHS/, change: "ne"}, function (obj) {
    if (obj.newState.value !== false) {
        log("fenster-beispiel.js - Fenster in "+obj.channel.roomNames[0]+" geöffnet.");
    } else {
        log("fenster-beispiel.js - Fenster in "+obj.channel.roomNames[0]+" geschlossen.");
    }
});
