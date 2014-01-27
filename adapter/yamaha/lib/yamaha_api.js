/**
 * CCU.IO adapter for Yamaha AV receiver
 *
 * Copyright 2014 Thorsten Kamann
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var station, artist, song, album;

/**
 * Parses the volume data out of the response stream.
 * @type {Function}
 * @param response_data the data return by the reciever in XML-format
 **/
exports.volume = (function(response_data){
    var level =  interesting_part(response_data, "Val");
    var exp = interesting_part(response_data, "Exp");
    var unit = interesting_part(response_data, "Unit")

   return level/(Math.pow(10,exp))+" "+unit;
});

/**
 * Parses the muting data out of the response stream.
 * @type {Function}
 * @param response_data the data return by the reciever in XML-format
 **/
exports.mute = (function(response_data){
    return interesting_part(response_data, "Mute")
});

/**
 * Parses the now_playing data out of the response stream for NET_RADIO.
 * @type {Function}
 * @param response_data the data return by the reciever in XML-format
 **/
exports.now_playing_net_radio = (function(response_data){
    station = interesting_part(response_data, "Station");
    song = interesting_part(response_data, "Song");
    artist = "";
    album = "";

    return now_playing(station, album, artist, song);
});

/**
 * Parses the now_playing data out of the response stream for AIRPLAY.
 * @type {Function}
 * @param response_data the data return by the reciever in XML-format
 **/
exports.now_playing_airplay = (function(response_data){
    song = interesting_part(response_data, "Song");
    artist = interesting_part(response_data, "Artist");
    album = interesting_part(response_data, "Album");

    return now_playing("", album, artist, song);
});

/**
 * Parses the mode data out of the response stream.
 * @type {Function}
 * @param response_data the data return by the reciever in XML-format
 **/
exports.current_mode = (function(response_data){
    var mode = interesting_part(response_data, "Src_Name").trim();
    var mode_name = interesting_part(response_data, "Title").trim();

    if (mode == ""){
        mode = mode_name;
    }
    return {name: mode_name, symbol: mode};
});

/**
 * Builds the full HTTP reuest you need to send to the receiver.
 * @type {Function}
 * @param request_data The command in XML-format
 **/
exports.http_request = (function(request_data){
    if (request_data){
        return "POST /YamahaRemoteControl/ctrl HTTP/1.1\r\n"+
            "Content-Length: "+request_data.length+"\r\n"+
            "Accept-Encoding: gzip, deflate\r\n"+
            "Content-Type: text/xml; charset=UTF-8\r\n"+
            "Accept-Language: de-de\r\n"+
            "Accept: */*\r\n"+
            "Connection: keep-alive\r\n"+
            "Pragma: no-cache\r\n"+
            "Cache-Control: no-cache\r\n\r\n"+
            request_data;
    }
    return "";
});

var interesting_part = (function(search_in, search){
    var start = search_in.indexOf("<"+search+">")+(search.length+2);
    var end = search_in.indexOf("</"+search+">");

    return search_in.substring(start, end);
});

var now_playing = (function(station, album, artist, song){
    var np = "";

    if (station != ""){
        np = station;
        if (artist != "" || song != "" || album != ""){
            np += ": ";
        }
    }
    if (artist != ""){
        np += artist;
        if (song != "" || album != ""){
            np += " - ";
        }
    }

    if (song != ""){
        np += song;
        if (album != ""){
            np += " - ";
        }
    }

    if (album != ""){
        np += album;
    }
    return np;
});
