/**
 *      CCU.IO Denon Adapter
 *      01'2014 BlueEssi
 *
 *
 *      
 *      getestet mit:
 *      CCU.IO ver. 1.0.18
 *      Denon AVR-X3000
 *      
 */
var settings = require(__dirname+'/../../settings.js');

if (!settings.adapters.denon || !settings.adapters.denon.enabled) {
    process.exit();
}

//Settings laden
var denonSettings = settings.adapters.denon.settings;

//firstID wird in den Settings festgelegt und beschreibt ab welcher ID deine Variablen starten z.B. 110101

var logger = require(__dirname+'/../../logger.js'),
    io     = require('socket.io-client'),
	net    = require('net');
	
	var socketOnkyo;
	var objects = {},
	    datapoints = {};
		
if (settings.ioListenPort) {
	var socket = io.connect("127.0.0.1", {
		port: settings.ioListenPort
	});
} else if (settings.ioListenPortSsl) {
	var socket = io.connect("127.0.0.1", {
		port: settings.ioListenPortSsl,
		secure: true
	});
} else {
	process.exit();
}

connectDenon();


function connectDenon() {
	//Hier wird der Socket zum Receiver geöffnet
	
	logger.info("adapter denon starting connect to:"+denonSettings.IP+" "+denonSettings.port);
	socketOnkyo = net.connect({port: denonSettings.port, host: denonSettings.IP},
	  function() { 
		logger.info("adapter denon connected to Receiver: "+ denonSettings.IP);
		logger.info("adapter denon ccuId is set to: "+ denonSettings.ccuId);
		//Wenn Du noch was senden willst musst (initialisierung?) dann so:
		//socketOnkyo.write("HIER_DEN_STRING");
		//socketOnkyo.write("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211MVLQSTN\x0D");
		//socketOnkyo.write("ZM?\x0D");
		//Werte abfragen:
		initial= new Array("ZM?", "MV?", "MU?", "Z2?", "Z2MU?", "SI?", "MS?", "Z2CS?", "SV?", "VSASP ?");
		for (var i = 0; i < initial.length; ++i) {
			command = new Buffer(""+initial[i]+"\x0D");
			logger.info("adapter Denon Event CCUIO send:"+command);
			socketOnkyo.write(command);
			sleep(50);
		}
		
	  });
}

//Wird aufgerufen wenn der Socket zum Denon geschlossen wird
socketOnkyo.on('close', function () {
    logger.info("adapter denon  disconnected from Receiver");
});

//Wird aufgerufen wenn Daten auf dem Socket vom Denon kommen:
socketOnkyo.on('data', function (data) {
	//logger.info("adapter Denon Event Receiver raw:"+data.toString());
	//hier z.B den String vom Denon zerpflücken:
	laenge = data.length-1; 
	
	//logger.info("adapter Denon Event Receiver raw.length:"+laenge);
	chunk = data.toString().substr(0,laenge);
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver chunk:"+chunk.toString());
	}
 
	//usw...
	//z.B. ne CCU.IO Variable setzen
	//setState(ID,WERT); also setState(denonSettings.firstId+5,"10");
  

  //Denon Mainzone_Power
  if (chunk.match(/ZM/)) {  
	cmd = 'ZM';
	  if (chunk.match(/ZMON/)) {parameter = 'ON';}
	  if (chunk.match(/ZMOFF/)) {parameter = 'OFF';} 
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+2,parameter);
	setState(denonSettings.firstId+1,'Denon');
  }
  
  //Denon Mainzone_Mute
  if (chunk.match(/MU/) && (!(chunk.match(/Z2MU/)))) {
	  if (chunk.match(/MUON/) && (!(chunk.match(/Z2MUON/)))) {cmd = 'MU';parameter = 'ON';setState(denonSettings.firstId+3,parameter);setState(denonSettings.firstId+1,'Denon');}
	  if (chunk.match(/MUOFF/) && (!(chunk.match(/Z2MUOFF/)))) {cmd = 'MU';parameter = 'OFF';setState(denonSettings.firstId+3,parameter);setState(denonSettings.firstId+1,'Denon');}
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
  }

  //Denon Zone2_Power
  if (chunk.match(/Z2ON/)) {
	cmd = 'Z2';
	parameter = 'ON';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+4,parameter);
	setState(denonSettings.firstId+1,'Denon');
  }
  if (chunk.match(/Z2OFF/)) {
	cmd = 'Z2';
	parameter = 'OFF';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+4,parameter);
	setState(denonSettings.firstId+1,'Denon');
  }   

  //Denon Mainzone_Mute
  if (chunk.match(/Z2MU/)) {
	cmd = 'Z2MU';
	  if (chunk.match(/Z2MUON/)) {parameter = 'ON';}
	  if (chunk.match(/Z2MUOFF/)) {parameter = 'OFF';}
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+5,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }

  //Denon Mainzone_Input
  if (chunk.match(/SICD/)) {cmd = 'SI';parameter = 'CD';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }
  if (chunk.match(/SITUNER/)) {
	cmd = 'SI';
	parameter = 'TUNER';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }
  if (chunk.match(/SIDVD/)) {
	cmd = 'SI';
	parameter = 'DVD';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }  
  if (chunk.match(/SIBD/)) {
	cmd = 'SI';
	parameter = 'BD';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  } 
  if (chunk.match(/SITV/)) {
	cmd = 'SI';
	parameter = 'TV';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }
  if (chunk.match(/SISAT/)) {
	cmd = 'SI';
	parameter = 'SAT/CBL';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }  
  if (chunk.match(/SIMPLAY/)) {
	cmd = 'SI';
	parameter = 'MPLAY';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }
  if (chunk.match(/SIGAME/)) {
	cmd = 'SI';
	parameter = 'GAME';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
	setState(denonSettings.firstId+1,'Denon');
  } 
  if (chunk.match(/SIAUX1/)) {
	cmd = 'SI';
	parameter = 'AUX1';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }  
  if (chunk.match(/SINET/)) {
	cmd = 'SI';
	parameter = 'NET';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }
  if (chunk.match(/SISPOTIFY/)) {
	cmd = 'SI';
	parameter = 'SPOTIFY';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }
  if (chunk.match(/SIFLICKR/)) {
	cmd = 'SI';
	parameter = 'FLICKR';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }
  if (chunk.match(/SIFAVORITES/)) {
	cmd = 'SI';
	parameter = 'FAVORITES';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }
  if (chunk.match(/SIIRADIO/)) {
	cmd = 'SI';
	parameter = 'IRADIO';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }
  if (chunk.match(/SISERVER/)) {
	cmd = 'SI';
	parameter = 'SERVER';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }
  if (chunk.match(/SIUSB/)) {
	cmd = 'SI';
	parameter = 'USB/IPOD';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }
  if (chunk.match(/SIFVP/)) {
	cmd = 'SI';
	parameter = 'FVP';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }
  if (chunk.match(/SISOURCE/)) {
	cmd = 'SI';
	parameter = 'SOURCE';
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+6,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }

  //Denon Zone2_Input
  if (chunk.match(/Z2/)) {
	  if (chunk.match(/Z2CD/)) {
		cmd = 'Z2';
		parameter = 'CD';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);
		setState(denonSettings.firstId+1,'Denon');		
	  }
	  if (chunk.match(/Z2TUNER/)) {
		cmd = 'Z2';
		parameter = 'TUNER';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);
		setState(denonSettings.firstId+1,'Denon');
      }
	  if (chunk.match(/Z2DVD/)) {
		cmd = 'Z2';
		parameter = 'DVD';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);
		setState(denonSettings.firstId+1,'Denon');
	  }  
	  if (chunk.match(/Z2BD/)) {
		cmd = 'Z2';
		parameter = 'BD';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);
		setState(denonSettings.firstId+1,'Denon');		
	  } 
	  if (chunk.match(/Z2TV/)) {
		cmd = 'Z2';
		parameter = 'TV';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);	
		setState(denonSettings.firstId+1,'Denon');
	  }
	  if (chunk.match(/Z2SAT/)) {
		cmd = 'Z2';
		parameter = 'SAT/CBL';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);	
		setState(denonSettings.firstId+1,'Denon');
	  }  
	  if (chunk.match(/Z2MPLAY/)) {
		cmd = 'Z2';
		parameter = 'MPLAY';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);	
		setState(denonSettings.firstId+1,'Denon');
	  }
	  if (chunk.match(/Z2GAME/)) {
		cmd = 'Z2';
		parameter = 'GAME';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);
		setState(denonSettings.firstId+1,'Denon');		
	  } 
	  if (chunk.match(/Z2AUX1/)) {
		cmd = 'Z2';
		parameter = 'AUX1';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);	
		setState(denonSettings.firstId+1,'Denon');
	  }  
	  if (chunk.match(/Z2NET/)) {
		cmd = 'Z2';
		parameter = 'NET';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);	
		setState(denonSettings.firstId+1,'Denon');
	  }
	  if (chunk.match(/Z2SPOTIFY/)) {
		cmd = 'Z2';
		parameter = 'SPOTIFY';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);	
		setState(denonSettings.firstId+1,'Denon');
	  }
	  if (chunk.match(/Z2FLICKR/)) {
		cmd = 'Z2';
		parameter = 'FLICKR';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);	
		setState(denonSettings.firstId+1,'Denon');
	  }
	  if (chunk.match(/Z2FAVORITES/)) {
		cmd = 'Z2';
		parameter = 'FAVORITES';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);	
		setState(denonSettings.firstId+1,'Denon');
	  }
	  if (chunk.match(/Z2IRADIO/)) {
		cmd = 'Z2';
		parameter = 'IRADIO';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);	
		setState(denonSettings.firstId+1,'Denon');
	  }
	  if (chunk.match(/Z2SERVER/)) {
		cmd = 'Z2';
		parameter = 'SERVER';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);	
		setState(denonSettings.firstId+1,'Denon');
	  }
	  if (chunk.match(/Z2USB/)) {
		cmd = 'Z2';
		parameter = 'USB/IPOD';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);	
		setState(denonSettings.firstId+1,'Denon');
	  }
	  if (chunk.match(/Z2FVP/)) {
		cmd = 'Z2';
		parameter = 'FVP';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);	
		setState(denonSettings.firstId+1,'Denon');
	  }
	  if (chunk.match(/Z2SOURCE/)) {
		cmd = 'Z2';
		parameter = 'SOURCE';
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
		setState(denonSettings.firstId+7,parameter);	
		setState(denonSettings.firstId+1,'Denon');	
	  }
	}
	
  //Denon Mainzone_Surroundmode
  if (chunk.match(/MS/) && (!(chunk.match(/PSRSZ MS/)))){
	cmd = 'MS';
	  if (chunk.match(/MSMOVIE/)) {parameter = 'MOVIE';}
	  if (chunk.match(/MSMMUSIC/)) {parameter = 'MUSIC';}
	  if (chunk.match(/MSGAME/)) {parameter = 'GAME';}
	  if (chunk.match(/MSPURE DIRECT/)) {parameter = 'PURE DIRECT';}
	  if (chunk.match(/MSDIRECT/)) {parameter = 'DIRECT';}
	  if (chunk.match(/MSSTEREO/)) {parameter = 'STEREO';}
	  if (chunk.match(/MSSTANDARD/)) {parameter = 'STANDARD';}
	  if (chunk.match(/MSDOLBY DIGITAL/)) {parameter = 'DOLBY DIGITAL';}
	  if (chunk.match(/MSDTS SUROUND/)) {parameter = 'DTS SUROUND';}
	  if (chunk.match(/MSMCH STEREO/)) {parameter = 'MCH STEREO';}
	  if (chunk.match(/MSROCK ARENA/)) {parameter = 'ROCK ARENA';}
	  if (chunk.match(/MSJAZZ CLUB/)) {parameter = 'JAZZ CLUB';}
	  if (chunk.match(/MSMONO MOVIE/)) {parameter = 'MONO MOVIE';}
	  if (chunk.match(/MSMATRIX/)) {parameter = 'MATRIX';}
	  if (chunk.match(/MSVIDEO GAME/)) {parameter = 'VIDEO GAME';}
	  if (chunk.match(/MSVIRTUAL/)) {parameter = 'VIRTUAL';}
	  if (chunk.match(/MSMULTI CH IN/)) {parameter = 'MULTI CH IN';}
	  if (chunk.match(/MSM CH IN+PL2X C/)) {parameter = 'M CH IN+PL2X C';}
	  if (chunk.match(/MSM CH IN+PL2X M/)) {parameter = 'M CH IN+PL2X M';}
	  if (chunk.match(/MSM CH IN+PL2Z H/)) {parameter = 'M CH IN+PL2Z H';}
	  if (chunk.match(/MSM CH IN+DOLBY EX/)) {parameter = 'M CH IN+DOLBY EX';}
	  if (chunk.match(/MSMULTI CH IN 7.1/)) {parameter = 'MULTI CH IN 7.1';}
	  if (chunk.match(/MSM CH IN+NEO:X C/)) {parameter = 'M CH IN+NEO:X C';}
	  if (chunk.match(/MSM CH IN+NEO:X M/)) {parameter = 'M CH IN+NEO:X M';}
	  if (chunk.match(/MSM CH IN+NEO:X G/)) {parameter = 'M CH IN+NEO:X G';}
	  if (chunk.match(/MSDOLBY PL2 C/)) {parameter = 'DOLBY PL2 C';}
	  if (chunk.match(/MSDOLBY PL2 M/)) {parameter = 'DOLBY PL2 M';}
	  if (chunk.match(/MSDOLBY PL2 G/)) {parameter = 'DOLBY PL2 G';}
	  if (chunk.match(/MSDOLBY PL2X C/)) {parameter = 'DOLBY PL2X C';}
	  if (chunk.match(/MSDOLBY PL2X M/)) {parameter = 'DOLBY PL2X M';}
	  if (chunk.match(/MSDOLBY PL2X G/)) {parameter = 'DOLBY PL2X G';}
	  if (chunk.match(/MSDOLBY PL2Z H/)) {parameter = 'DOLBY PL2Z H';}
	  if (chunk.match(/MSDOLBY DIGITAL/)) {parameter = 'DOLBY DIGITAL';}
	  if (chunk.match(/MSDOLBY D EX/)) {parameter = 'DOLBY D EX';}
	  if (chunk.match(/MSDOLBY D+PL2X C/)) {parameter = 'DOLBY D+PL2X C';}
	  if (chunk.match(/MSDOLBY D+PL2X M/)) {parameter = 'DOLBY D+PL2X M';}
	  if (chunk.match(/MSDOLBY D+PL2Z H/)) {parameter = 'DOLBY D+PL2Z H';}
	  if (chunk.match(/MSDOLBY D+NEO:X C/)) {parameter = 'DOLBY D+NEO:X C';}
	  if (chunk.match(/MSDOLBY D+NEO:X M/)) {parameter = 'DOLBY D+NEO:X M';}
	  if (chunk.match(/MSDOLBY D+NEO:X G/)) {parameter = 'DOLBY D+NEO:X G';}
	  if (chunk.match(/MSDTS NEO:X C/)) {parameter = 'DTS NEO:X C';}
	  if (chunk.match(/MSDTS NEO:X M/)) {parameter = 'DTS NEO:X M';}
	  if (chunk.match(/MSDTS NEO:X G/)) {parameter = 'DTS NEO:X G';}
	  if (chunk.match(/MSDTS SURROUND/)) {parameter = 'DTS SURROUND';}
	  if (chunk.match(/MSDTS ES DSCRT6.1/)) {parameter = 'DTS ES DSCRT6.1';}
	  if (chunk.match(/MSDTS ES MTRX6.1/)) {parameter = 'DTS ES MTRX6.1';}
	  if (chunk.match(/MSDTS+PL2X C/)) {parameter = 'DTS+PL2X C';}
	  if (chunk.match(/MSDTS+PL2X M/)) {parameter = 'DTS+PL2X M';}
	  if (chunk.match(/MSDTS+PL2Z H/)) {parameter = 'DTS+PL2Z H';}
	  if (chunk.match(/MSDTS+NEO:X C/)) {parameter = 'DTS+NEO:X C';}
	  if (chunk.match(/MSDTS+NEO:X M/)) {parameter = 'DTS+NEO:X M';}
	  if (chunk.match(/MSDTS+NEO:X G/)) {parameter = 'DTS+NEO:X G';}
	  if (chunk.match(/MSDTS96\/24/)) {parameter = 'DTS96/24';}
	  if (chunk.match(/MSDTS96 ES MTRX/)) {parameter = 'DTS96 ES MTRX';}
	  if (chunk.match(/MSDOLBY D+/) && (!(chunk.match(/MSDOLBY D+ /)))) {parameter = 'DOLBY D+';}
	  if (chunk.match(/MSDOLBY D+ +EX/)) {parameter = 'DOLBY D+ +EX';}
	  if (chunk.match(/MSDOLBY D+ +PL2X C/)) {parameter = 'DOLBY D+ +PL2X C';}
	  if (chunk.match(/MSDOLBY D+ +PL2X M/)) {parameter = 'DOLBY D+ +PL2X M';}
	  if (chunk.match(/MSDOLBY D+ +PL2Z H/)) {parameter = 'DOLBY D+ +PL2Z H';}
	  if (chunk.match(/MSDOLBY D+ +NEO:X C/)) {parameter = 'DOLBY D+ +NEO:X C';}
	  if (chunk.match(/MSDOLBY D+ +NEO:X M/)) {parameter = 'DOLBY D+ +NEO:X M';}
	  if (chunk.match(/MSDOLBY D+ +NEO:X G/)) {parameter = 'DOLBY D+ +NEO:X G';}
	  if (chunk.match(/MSDOLBY TRUEHD/)) {parameter = 'DOLBY TRUEHD';}
	  if (chunk.match(/MSDOLBY HD/) && (!(chunk.match(/MSDOLBY HD+/)))) {parameter = 'DOLBY HD';}
	  if (chunk.match(/MSDOLBY HD+EX/)) {parameter = 'DOLBY HD+EX';}
	  if (chunk.match(/MSDOLBY HD+PL2X C/)) {parameter = 'DOLBY HD+PL2X C';}
	  if (chunk.match(/MSDOLBY HD+PL2X M/)) {parameter = 'DOLBY HD+PL2X M';}
	  if (chunk.match(/MSDOLBY HD+PL2Z H/)) {parameter = 'DOLBY HD+PL2Z H';}
	  if (chunk.match(/MSDOLBY HD+NEO:X C/)) {parameter = 'DOLBY HD+NEO:X C';}
	  if (chunk.match(/MSDOLBY HD+NEO:X M/)) {parameter = 'DOLBY HD+NEO:X M';}
	  if (chunk.match(/MSDOLBY HD+NEO:X G/)) {parameter = 'DOLBY HD+NEO:X G';}
	  if (chunk.match(/MSDTS HD/) && (!(chunk.match(/MSDTS HD /))) && (!(chunk.match(/MSDTS HD+/)))) {parameter = 'DTS HD';}
	  if (chunk.match(/MSDTS HD MSTR/)) {parameter = 'DTS HD MSTR';}
	  if (chunk.match(/MSDTS HD+PL2X C/)) {parameter = 'DTS HD+PL2X C';}
	  if (chunk.match(/MSDTS HD+PL2X M/)) {parameter = 'DTS HD+PL2X M';}
	  if (chunk.match(/MSDTS HD+PL2Z H/)) {parameter = 'DTS HD+PL2Z H';}
	  if (chunk.match(/MSDTS HD+NEO:X C/)) {parameter = 'DTS HD+NEO:X C';}
	  if (chunk.match(/MSDTS HD+NEO:X M/)) {parameter = 'DTS HD+NEO:X M';}
	  if (chunk.match(/MSDTS HD+NEO:X G/)) {parameter = 'DTS HD+NEO:X G';}
	  if (chunk.match(/MSDTS ES 8CH DSCRT/)) {parameter = 'DTS ES 8CH DSCRT';}
	  if (chunk.match(/MSDTS EXPRESS/)) {parameter = 'DTS EXPRESS';}
	  if (chunk.match(/MSALL ZONE STEREO/)) {parameter = 'ALL ZONE STEREO';}
	  if (chunk.match(/MSQUICK1/)) {parameter = 'QUICK1';}
	  if (chunk.match(/MSQUICK2/)) {parameter = 'QUICK2';}
	  if (chunk.match(/MSQUICK3/)) {parameter = 'QUICK3';}
	  if (chunk.match(/MSQUICK4/)) {parameter = 'QUICK4';}
	  if (chunk.match(/MSQUICK5/)) {parameter = 'QUICK5';}
	  if (chunk.match(/MSQUICK0/)) {parameter = 'QUICK0';}	  
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+8,parameter);
	setState(denonSettings.firstId+1,'Denon');
	}
  
  //Denon Zone2_Soundmode
  if (chunk.match(/Z2CS/)) {
	cmd = 'Z2CS';
	  if (chunk.match(/Z2CSST/)) {parameter = 'ST';}
	  if (chunk.match(/Z2CSMO/)) {parameter = 'MO';}
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+9,parameter);	
	setState(denonSettings.firstId+1,'Denon');
  }
  
  //Denon Mainzone_Volume
  if (chunk.match(/MV[0-9]{1,3}/)) {
	var matches = chunk.match(/MV[0-9]{1,3}/);
	matches = matches.toString();
	cmd = 'MV';
	parameter = '0.' + matches.substr(2,matches.length);
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	setState(denonSettings.firstId+10,parameter);
	setState(denonSettings.firstId+1,'Denon');
  }    
  
  //Denon Mainzone_Volume_max
  if (chunk.match(/MVMAX [0-9]{1,3}/)) {
    var matches = chunk.match(/MVMAX [0-9]{1,3}/);
	matches = matches.toString();
	cmd = 'MVMAX';
	parameter = '0.' + matches.substr(6,matches.length);
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	setState(denonSettings.firstId+11,parameter);	
	setState(denonSettings.firstId+1,'Denon');	
  }   
  
  //Denon Zone2_Volume
  if (chunk.match(/Z2[0-9]{1,3}/)) {
    var matches = chunk.match(/Z2[0-9]{1,3}/);
	matches = matches.toString();
	cmd = 'Z2';
	parameter = '0.' + matches.substr(2,matches.length);
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	setState(denonSettings.firstId+12,parameter);
	setState(denonSettings.firstId+1,'Denon');	
  }   
  
  //Denon Mainzone_Video_Select
  if (chunk.match(/SV/)) {
	  if (chunk.match(/SVON/)) {cmd = 'SV';parameter = 'ON';setState(denonSettings.firstId+13,parameter);setState(denonSettings.firstId+1,'Denon');}
	  if (chunk.match(/SVOFF/)) {cmd = 'SV';parameter = 'OFF';setState(denonSettings.firstId+13,parameter);setState(denonSettings.firstId+1,'Denon');}
	  if (chunk.match(/SVDVD/)) {cmd = 'SV';parameter = 'DVD';setState(denonSettings.firstId+13,parameter);setState(denonSettings.firstId+1,'Denon');}
	  if (chunk.match(/SVBD/)) {cmd = 'SV';parameter = 'BD';setState(denonSettings.firstId+13,parameter);setState(denonSettings.firstId+1,'Denon');}  
	  if (chunk.match(/SVTV/)) {cmd = 'SV';parameter = 'TV';setState(denonSettings.firstId+13,parameter);setState(denonSettings.firstId+1,'Denon');}
	  if (chunk.match(/SVSAT/)) {cmd = 'SV';parameter = 'SAT/CBL';setState(denonSettings.firstId+13,parameter);setState(denonSettings.firstId+1,'Denon');}
	  if (chunk.match(/SVMPLAY/)) {cmd = 'SV';parameter = 'MPLAY';setState(denonSettings.firstId+13,parameter);setState(denonSettings.firstId+1,'Denon');}
	  if (chunk.match(/SVGAME/)) {cmd = 'SV';parameter = 'GAME';setState(denonSettings.firstId+13,parameter);setState(denonSettings.firstId+1,'Denon');}
	  if (chunk.match(/SVAUX1/)) {cmd = 'SV';parameter = 'AUX1';setState(denonSettings.firstId+13,parameter);setState(denonSettings.firstId+1,'Denon');}
	  if (chunk.match(/SVCD/)) {cmd = 'SV';parameter = 'CD';setState(denonSettings.firstId+13,parameter);setState(denonSettings.firstId+1,'Denon');}
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	
  //Denon Mainzone_Video_Select
  if (chunk.match(/VSASP/)) {  
	cmd = 'VSASP';
	  if (chunk.match(/VSASPFUL/)) {parameter = 'FUL';}	 
	  if (chunk.match(/VSASPNRM/)) {parameter = 'NRM';} 
	logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	setState(denonSettings.firstId+14,parameter);
	setState(denonSettings.firstId+1,'Denon');
  }
  
});

//Wird beim Socket Fehler aufgerufen
socketOnkyo.on('error', function (data) {
	logger.info("adapter denon ERROR Connection Receiver:"+data.toString());
	//Neuen connect in 10sec initiieren
    activityTimeout = setTimeout(function () {
       connectDenon();
    }, 10000);
});

//Wird aufgerufen bei Connect zu CCU.IO
socket.on('connect', function () {
    logger.info("adapter denon connected to ccu.io");
});

//Wird aufgerufen bei disconnect zu CCU.IO
socket.on('disconnect', function () {
    logger.info("adapter denon disconnected from ccu.io");
});


//Wird aufgerufen bei Änderungen von Objekten in CCU.IO. Hier musst Du nach den für Dich interessanten IDs suchen, z.B. Deine eigenen ID´s.
socket.on('event', function (obj) {
    if (!obj || !obj[0]) {
        return;
    }
	
	//ID des geänderten Objektes
    var id = obj[0];
	//Wert des geänderten Objektes
    var val = obj[1];
	//Timestamp der letzten Änderung
    var ts = obj[2];
	//ACKnowledge der letzten Änderung
    var ack = obj[3];
		
	//z.B. wenn ID = denonSettings.firstId (also bei Dir 110101) ODER denonSettings.firstId +1 (hier 110102) dann mach etwas
	//if (obj[0] == denonSettings.firstId || obj[0] == denonSettings.firstId +1) {
    //if (obj[0] == denonSettings.firstId || obj[0] == denonSettings.ccuID) {  
  if (obj[0] == denonSettings.firstId) {
		
  //logger.info("adapter Denon Event (hier hat sich bei der 110100 (firstID) was geändert): "+id+" "+val+" "+ts+" "+ack+" "+obj);
  logger.info("adapter Denon Event CCUIO ID:"+id+" Wert:"+val+" Zeitstempel:"+ts+" Ack:"+ack);
		
  //Änderung der ersten ID 110101 und Wert ungleich ""
  //if (id == denonSettings.firstId && val != "" || id == denonSettings.ccuId && val != "") {
  if (id == denonSettings.firstId && val != "" ){ 
      
	//Einen String für den Denon zusammenbasteln
	//command = new Buffer("Hallo Denon umschalten bitte :D "+val+"\n");
	//command = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211"+val+"\x0D");
	command = new Buffer(""+val+"\x0D");
	logger.info("adapter Denon Event CCUIO send: "+command);
	socketOnkyo.write(command);
	sleep(50);
    
	//Variablen wieder zurücksetzen
    setState(id, "");
	}
	setState(denonSettings.firstId+1, "Extern");
  }
	
	
});

//Ende des Adapters
function stop() {
    logger.info("adapter denon terminating");
    socketOnkyo.end;
	setTimeout(function () {
        process.exit();
    }, 250);
}

//Bei Unix SIGINT -->ende
process.on('SIGINT', function () {
    stop();
});

//Bei Unix SIGTERM -->ende
process.on('SIGTERM', function () {
    stop();
});

function setObject(id, obj) {
    objects[id] = obj;
    if (obj.Value) {
        datapoints[obj.Name] = [obj.Value];
    }
    socket.emit("setObject", id, obj);
}

function setState(id, val) {
	datapoints[id] = [val];
	logger.verbose("adapter denon setState "+id+" "+val);
	socket.emit("setState", [id,val,null,true]);
}

function getState(id, callback) {
    logger.verbose("adapter denon getState "+id);
    socket.emit("getDatapoint", [id], function (id, obj) {
        callback (id, obj);
    });
}

function sleep(milliseconds) {
    var start = new Date().getTime();
    for (var i = 0; i < 1e7; i++) {
        if ((new Date().getTime() - start) > milliseconds){
            break;
        }
    }
}

function DenonInit() {
	
	setObject(denonSettings.firstId, {
	  Name: "Denon_Command",
	  "DPInfo": "Denon",
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+1, {
	  Name: "Denon_CommandSender",
	  "DPInfo": "Denon",
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+2, {
	  Name: "Denon_Mainzone_Power",
	  "DPInfo": "Denon",	  
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+3, {
	  Name: "Denon_Mainzone_Mute",
	  "DPInfo": "Denon",	  
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+4, {
	  Name: "Denon_Zone2_Power",
	  "DPInfo": "Denon",	  
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+5, {
	  Name: "Denon_Zone2_Mute",
	  "DPInfo": "Denon",	  
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+6, {
	  Name: "Denon_Mainzone_Input",
	  "DPInfo": "Denon",	  
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+7, {
	  Name: "Denon_Zone2_Input",
	  "DPInfo": "Denon",	  
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+8, {
	  Name: "Denon_Mainzone_Surroundmode",
	  "DPInfo": "Denon",	  
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+9, {
	  Name: "Denon_Zone2_Soundmode",
	  "DPInfo": "Denon",	  
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+10, {
	  Name: "Denon_Mainzone_Volume",
	  "DPInfo": "Denon",	  
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+11, {
	  Name: "Denon_Mainzone_Volume_max",
	  "DPInfo": "Denon",
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+12, {
	  Name: "Denon_Zone2_Volume",
	  "DPInfo": "Denon",
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+13, {
	  Name: "Denon_Mainzone_Video_Select",
	  "DPInfo": "Denon",
	  TypeName: "VARDP"
	});
	setObject(denonSettings.firstId+14, {
	  Name: "Denon_Aspect_Ratio",
	  "DPInfo": "Denon",	  
	  TypeName: "VARDP"
	});
  	
    logger.info("adapter denon objects inserted, starting at: "+denonSettings.firstId);
}

logger.info("adapter denon start");
DenonInit ();