/**
 * Created by kamann on 25.01.14.
 */
var api = require('../lib/yamaha_api')

exports['http_request'] = function (test) {
    var request_data = "<Volume>Up</Volume>";
    test.equal(api.http_request(request_data).substr(request_data.length*-1), request_data);
    test.done();
};

exports['http_request_without_data'] = function (test) {
    var request_data = "";
    test.equal(api.http_request(request_data), "");
    test.done();
};

exports['current_mode'] = function(test){
    var response_data = '<YAMAHA_AV rsp="GET" RC="0"><Main_Zone><Input><Input_Sel_Item_Info><Param>NET RADIO</Param><RW>RW</RW><Title>NET RADIO</Title><Icon><On>/YamahaRemoteControl/Icons/icon005.png</On><Off></Off></Icon><Src_Name>NET_RADIO</Src_Name><Src_Number>1</Src_Number></Input_Sel_Item_Info></Input></Main_Zone></YAMAHA_AV>';
    var mode = api.current_mode(response_data)

    test.equal(mode.name, "NET RADIO")
    test.equal(mode.symbol, "NET_RADIO")
    test.done()
};

exports['current_mode_hdmi'] = function(test){
    var response_data = '<YAMAHA_AV rsp="GET" RC="0"><Main_Zone><Input><Input_Sel_Item_Info><Param>HDMI2</Param><RW>RW</RW><Title>  HDMI2  </Title><Icon><On>/YamahaRemoteControl/Icons/icon004.png</On><Off></Off></Icon><Src_Name></Src_Name><Src_Number>1</Src_Number></Input_Sel_Item_Info></Input></Main_Zone></YAMAHA_AV>';
    var mode = api.current_mode(response_data)

    test.equal(mode.name, "HDMI2")
    test.equal(mode.symbol, "HDMI2")
    test.done()
};

exports['now_playing_net_radio'] = function(test){
    var response_data = '<YAMAHA_AV rsp="GET" RC="0"><NET_RADIO><Play_Info><Feature_Availability>Ready</Feature_Availability><Playback_Info>Play</Playback_Info><Meta_Info><Station>1LIVE</Station><Album></Album><Song>John Newman mit Love Me Again</Song></Meta_Info><Album_ART><URL></URL><ID>0</ID><Format>YMF</Format></Album_ART></Play_Info></NET_RADIO></YAMAHA_AV>'

    test.equal(api.now_playing_net_radio(response_data), "1LIVE: John Newman mit Love Me Again");
    test.done()
};

exports['now_playing_airplay'] = function(test){
    var response_data = '<YAMAHA_AV rsp="GET" RC="0"><AirPlay><Play_Info><Feature_Availability>Ready</Feature_Availability><Playback_Info>Play</Playback_Info><Meta_Info><Artist>Rotersand</Artist><Album>1023</Album><Song>Shelter</Song></Meta_Info><Input_Logo><URL_S>/YamahaRemoteControl/Logos/logo004.png</URL_S><URL_M></URL_M><URL_L></URL_L></Input_Logo></Play_Info></AirPlay></YAMAHA_AV>';
    test.equal(api.now_playing_airplay(response_data), "Rotersand - Shelter - 1023");
    test.done()
};

exports['is_mute_on'] = function(test){
    var response_data = '<YAMAHA_AV rsp="GET" RC="0"><Main_Zone><Volume><Mute>On</Mute></Volume></Main_Zone></YAMAHA_AV>';

    test.equal(api.mute(response_data), "On");
    test.done();
};

exports['current_volume'] = function(test){
    var response_data = '<YAMAHA_AV rsp="GET" RC="0"><Main_Zone><Volume><Lvl><Val>-595</Val><Exp>1</Exp><Unit>dB</Unit></Lvl></Volume></Main_Zone></YAMAHA_AV>';

    test.equal(api.volume(response_data), "-59.5 dB");
    test.done();
};