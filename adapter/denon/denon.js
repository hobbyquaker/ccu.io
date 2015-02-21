/**
 *      CCU.IO Denon Adapter
 *      01'2015 BlueEssi
 *
 *
 *      
 *      getestet mit:
 *      CCU.IO ver. 1.0.49
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
	var denonConnected = 'false';
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
		denonConnected = 'true';
		setState(denonSettings.firstId+50,true);
		logger.info("adapter denon connected to Receiver: "+ denonSettings.IP);
		logger.info("adapter denon debug is set to: "+ denonSettings.debug);
		//Wenn Du noch was senden willst musst (initialisierung?) dann so:
		//socketOnkyo.write("HIER_DEN_STRING");
		//socketOnkyo.write("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211MVLQSTN\x0D");
		//socketOnkyo.write("ZM?\x0D");
		//Werte abfragen:
		initial= new Array("ZM?", "MV?", "MU?", "Z2?", "Z2MU?", "SI?", "MS?", "Z2CS?", "SV?", "VSASP ?","SLP?","Z2SLP?","PSTONE CTRL ?","PSCINEMA EQ. ?","PSMODE: ?","PSLOM ?","PV?","SD?","DC?");
		for (var i = 0; i < initial.length; ++i) {
			command = new Buffer(""+initial[i]+"\x0D");
			if (denonSettings.debug == true) {
				logger.info("adapter Denon Event CCUIO send:"+command);
			}
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
{socketOnkyo.on('data', function (data) {
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
  

  //Denon Mainzone Power
  if (chunk.match(/ZM/)) {  
	cmd = 'ZM';
	if (chunk.match(/ZMON/)) {parameter = true;}
	if (chunk.match(/ZMOFF/)) {parameter = false;} 
	setState(denonSettings.firstId+53,parameter);
	setState(denonSettings.firstId+52,'Denon');
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }
  
  //Denon Mainzone Mute
  if (chunk.match(/MU/) && (!(chunk.match(/Z2MU/)))) {
	if (chunk.match(/MUON/) && (!(chunk.match(/Z2MUON/)))) {cmd = 'MU';parameter = true;setState(denonSettings.firstId+54,parameter);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/MUOFF/) && (!(chunk.match(/Z2MUOFF/)))) {cmd = 'MU';parameter = false;setState(denonSettings.firstId+54,parameter);setState(denonSettings.firstId+52,'Denon');}
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter); 
	}
  }

  //Denon Zone2 Power
  {if (chunk.match(/Z2ON/)) {
	cmd = 'Z2';
	parameter = true;
	setState(denonSettings.firstId+55,parameter);
	setState(denonSettings.firstId+52,'Denon');
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }
  if (chunk.match(/Z2OFF/)) {
	cmd = 'Z2';
	parameter = false;
	setState(denonSettings.firstId+55,parameter);
	setState(denonSettings.firstId+52,'Denon');
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }}

  //Denon Mainzone Mute
  if (chunk.match(/Z2MU/)) {
	cmd = 'Z2MU';
	if (chunk.match(/Z2MUON/)) {parameter = true;}
	if (chunk.match(/Z2MUOFF/)) {parameter = false;}
	setState(denonSettings.firstId+56,parameter);	
	setState(denonSettings.firstId+52,'Denon');
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }

  //Denon Mainzone Input
  {if (chunk.match(/SICD/)) {
    cmd = 'SI';
	parameter = 'CD';parameter1 = '0';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }
  if (chunk.match(/SITUNER/)) {
	cmd = 'SI';
	parameter = 'TUNER';parameter1 = '1';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }
  if (chunk.match(/SIDVD/)) {
	cmd = 'SI';
	parameter = 'DVD';parameter1 = '2';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }  
  if (chunk.match(/SIBD/)) {
	cmd = 'SI';
	parameter = 'BD';parameter1 = '3';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  } 
  if (chunk.match(/SITV/)) {
	cmd = 'SI';
	parameter = 'TV';parameter1 = '4';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }
  if (chunk.match(/SISAT/)) {
	cmd = 'SI';
	parameter = 'SAT/CBL';parameter1 = '5';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }  
  if (chunk.match(/SIMPLAY/)) {
	cmd = 'SI';
	parameter = 'MPLAY';parameter1 = '6';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }
  if (chunk.match(/SIGAME/)) {
	cmd = 'SI';
	parameter = 'GAME';parameter1 = '7';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  } 
  if (chunk.match(/SIAUX1/)) {
	cmd = 'SI';
	parameter = 'AUX1';parameter1 = '8';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }  
  if (chunk.match(/SINET/)) {
	cmd = 'SI';
	parameter = 'NET';parameter1 = '9';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }
  if (chunk.match(/SISPOTIFY/)) {
	cmd = 'SI';
	parameter = 'SPOTIFY';parameter1 = '10';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }
  if (chunk.match(/SIFLICKR/)) {
	cmd = 'SI';
	parameter = 'FLICKR';parameter1 = '11';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }
  if (chunk.match(/SIFAVORITES/)) {
	cmd = 'SI';
	parameter = 'FAVORITES';parameter1 = '12';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }
  if (chunk.match(/SIIRADIO/)) {
	cmd = 'SI';
	parameter = 'IRADIO';parameter1 = '13';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }
  if (chunk.match(/SISERVER/)) {
	cmd = 'SI';
	parameter = 'SERVER';parameter1 = '14';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }
  if (chunk.match(/SIUSB/)) {
	cmd = 'SI';
	parameter = 'USB/IPOD';parameter1 = '15';
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+57,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }}

  //Denon Zone2 Input
  if (chunk.match(/Z2/)) {
	  if (chunk.match(/Z2CD/)) {
		cmd = 'Z2';
		parameter = 'CD';parameter1 = '0';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);
		setState(denonSettings.firstId+52,'Denon');		
	  }
	  if (chunk.match(/Z2TUNER/)) {
		cmd = 'Z2';
		parameter = 'TUNER';parameter1 = '1';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);
		setState(denonSettings.firstId+52,'Denon');
      }
	  if (chunk.match(/Z2DVD/)) {
		cmd = 'Z2';
		parameter = 'DVD';parameter1 = '2';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);
		setState(denonSettings.firstId+52,'Denon');
	  }  
	  if (chunk.match(/Z2BD/)) {
		cmd = 'Z2';
		parameter = 'BD';parameter1 = '3';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);
		setState(denonSettings.firstId+52,'Denon');		
	  } 
	  if (chunk.match(/Z2TV/)) {
		cmd = 'Z2';
		parameter = 'TV';parameter1 = '4';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);	
		setState(denonSettings.firstId+52,'Denon');
	  }
	  if (chunk.match(/Z2SAT/)) {
		cmd = 'Z2';
		parameter = 'SAT/CBL';parameter1 = '5';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);	
		setState(denonSettings.firstId+52,'Denon');
	  }  
	  if (chunk.match(/Z2MPLAY/)) {
		cmd = 'Z2';
		parameter = 'MPLAY';parameter1 = '6';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);	
		setState(denonSettings.firstId+52,'Denon');
	  }
	  if (chunk.match(/Z2GAME/)) {
		cmd = 'Z2';
		parameter = 'GAME';parameter1 = '7';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);
		setState(denonSettings.firstId+52,'Denon');		
	  } 
	  if (chunk.match(/Z2AUX1/)) {
		cmd = 'Z2';
		parameter = 'AUX1';parameter1 = '8';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);	
		setState(denonSettings.firstId+52,'Denon');
	  }  
	  if (chunk.match(/Z2NET/)) {
		cmd = 'Z2';
		parameter = 'NET';parameter1 = '9';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);	
		setState(denonSettings.firstId+52,'Denon');
	  }
	  if (chunk.match(/Z2SPOTIFY/)) {
		cmd = 'Z2';
		parameter = 'SPOTIFY';parameter1 = '10';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);	
		setState(denonSettings.firstId+52,'Denon');
	  }
	  if (chunk.match(/Z2FLICKR/)) {
		cmd = 'Z2';
		parameter = 'FLICKR';parameter1 = '11';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);	
		setState(denonSettings.firstId+52,'Denon');
	  }
	  if (chunk.match(/Z2FAVORITES/)) {
		cmd = 'Z2';
		parameter = 'FAVORITES';parameter1 = '12';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);	
		setState(denonSettings.firstId+52,'Denon');
	  }
	  if (chunk.match(/Z2IRADIO/)) {
		cmd = 'Z2';
		parameter = 'IRADIO';parameter1 = '13';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);	
		setState(denonSettings.firstId+52,'Denon');
	  }
	  if (chunk.match(/Z2SERVER/)) {
		cmd = 'Z2';
		parameter = 'SERVER';parameter1 = '14';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);	
		setState(denonSettings.firstId+52,'Denon');
	  }
	  if (chunk.match(/Z2USB/)) {
		cmd = 'Z2';
		parameter = 'USB/IPOD';parameter1 = '15';
		if (denonSettings.debug == true) {
			logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
		}
		setState(denonSettings.firstId+58,parameter1);	
		setState(denonSettings.firstId+52,'Denon');
	  }
	}
	
  //Denon Mainzone Surroundmode Return
  if (chunk.match(/MS/) && (!(chunk.match(/PSRSZ MS/)))){
	cmd = 'MS';
	if (chunk.match(/MSDIRECT/)) {parameter = 'DIRECT';}
	if (chunk.match(/MSPURE DIRECT/)) {parameter = 'PURE DIRECT';}
	if (chunk.match(/MSSTEREO/)) {parameter = 'STEREO';}
	if (chunk.match(/MSMULTI CH IN/)) {parameter = 'MULTI CH IN';}
	if (chunk.match(/MSM CH IN\+PL2X C/)) {parameter = 'MULTI CH IN + PL2x Cinema';}
	if (chunk.match(/MSM CH IN\+PL2X M/)) {parameter = 'MULTI CH IN + PL2x Music';}
	if (chunk.match(/MSM CH IN\+PL2Z H/)) {parameter = 'MULTI CH IN + PL2z';}
	if (chunk.match(/MSM CH IN\+DOLBY EX/)) {parameter = 'MULTI CH IN + DOLBY EX';}
	if (chunk.match(/MSMULTI CH IN 7.1/)) {parameter = 'MULTI CH IN 7.1';}
	if (chunk.match(/MSM CH IN\+NEO:X C/)) {parameter = 'MULTI CH IN + NEO:X Cinema';}
	if (chunk.match(/MSM CH IN\+NEO:X M/)) {parameter = 'MULTI CH IN + NEO:X Music';}
	if (chunk.match(/MSM CH IN\+NEO:X G/)) {parameter = 'MULTI CH IN + NEO:X Game';}
	if (chunk.match(/MSDOLBY PL2 C/)) {parameter = 'DOLBY PL2 Cinema';}
	if (chunk.match(/MSDOLBY PL2 M/)) {parameter = 'DOLBY PL2 Music';}
	if (chunk.match(/MSDOLBY PL2 G/)) {parameter = 'DOLBY PL2 Game';}
	if (chunk.match(/MSDOLBY PL2X C/)) {parameter = 'DOLBY PL2x Cinema';}
	if (chunk.match(/MSDOLBY PL2X M/)) {parameter = 'DOLBY PL2x Music';}
	if (chunk.match(/MSDOLBY PL2X G/)) {parameter = 'DOLBY PL2x Game';}
	if (chunk.match(/MSDOLBY PL2Z H/)) {parameter = 'DOLBY PL2z';}
	if (chunk.match(/MSDOLBY DIGITAL/)) {parameter = 'DOLBY DIGITAL';}
	if (chunk.match(/MSDOLBY D EX/)) {parameter = 'DOLBY DIGITAL EX';}
	if (chunk.match(/MSDOLBY D\+PL2X C/)) {parameter = 'DOLBY DIGITAL + PL2x Cinema';}
	if (chunk.match(/MSDOLBY D\+PL2X M/)) {parameter = 'DOLBY DIGITAL + PL2x Music';}
	if (chunk.match(/MSDOLBY D\+PL2Z H/)) {parameter = 'DOLBY DIGITAL + PL2z';}
	if (chunk.match(/MSDOLBY D\+NEO:X C/)) {parameter = 'DOLBY DIGITAL + NEO:X Cinema';}
	if (chunk.match(/MSDOLBY D\+NEO:X M/)) {parameter = 'DOLBY DIGITAL + NEO:X Music';}
	if (chunk.match(/MSDOLBY D\+NEO:X G/)) {parameter = 'DOLBY DIGITAL + NEO:X Game';}
	if (chunk.match(/MSDTS NEO:X C/)) {parameter = 'DTS NEO:X Cinema';}
	if (chunk.match(/MSDTS NEO:X M/)) {parameter = 'DTS NEO:X Music';}
	if (chunk.match(/MSDTS NEO:X G/)) {parameter = 'DTS NEO:X Game';}
	if (chunk.match(/MSDTS SURROUND/)) {parameter = 'DTS SURROUND';}
	if (chunk.match(/MSDTS ES DSCRT6.1/)) {parameter = 'DTS ES DSCRT 6.1';}
	if (chunk.match(/MSDTS ES MTRX6.1/)) {parameter = 'DTS ES MTRX 6.1';}
	if (chunk.match(/MSDTS\+PL2X C/)) {parameter = 'DTS + PL2x Cinema';}
	if (chunk.match(/MSDTS\+PL2X M/)) {parameter = 'DTS + PL2x Music';}
	if (chunk.match(/MSDTS\+PL2Z H/)) {parameter = 'DTS + PL2z';}
	if (chunk.match(/MSDTS\+NEO:X C/)) {parameter = 'DTS + NEO:X Cinema';}
	if (chunk.match(/MSDTS\+NEO:X M/)) {parameter = 'DTS + NEO:X Music';}
	if (chunk.match(/MSDTS\+NEO:X G/)) {parameter = 'DTS + NEO:X Game';}
	if (chunk.match(/MSDTS96\/24/)) {parameter = 'DTS 96/24';}
	if (chunk.match(/MSDTS96 ES MTRX/)) {parameter = 'DTS 96 ES MTRX';}
	if (chunk.match(/MSMCH STEREO/)) {parameter = 'MULTI CH STEREO';}
	if (chunk.match(/MSROCK ARENA/)) {parameter = 'ROCK ARENA';}
	if (chunk.match(/MSJAZZ CLUB/)) {parameter = 'JAZZ CLUB';}
	if (chunk.match(/MSMONO MOVIE/)) {parameter = 'MONO MOVIE';}
	if (chunk.match(/MSMATRIX/)) {parameter = 'MATRIX';}
	if (chunk.match(/MSVIDEO GAME/)) {parameter = 'VIDEO GAME';}
	if (chunk.match(/MSVIRTUL/)) {parameter = 'VIRTUAL';}
	if (chunk.match(/MSDOLBY D\+/) && (!(chunk.match(/MSDOLBY D\+ /)))) {parameter = 'DOLBY DIGITAL Plus';}
	if (chunk.match(/MSDOLBY D\+ \+EX/)) {parameter = 'DOLBY DIGITAL Plus + EX';}
	if (chunk.match(/MSDOLBY D\+ \+PL2X C/)) {parameter = 'DOLBY DIGITAL Plus + PL2x Cinema';}
	if (chunk.match(/MSDOLBY D\+ \+PL2X M/)) {parameter = 'DOLBY DIGITAL Plus + PL2x Music';}
	if (chunk.match(/MSDOLBY D\+ \+PL2Z H/)) {parameter = 'DOLBY DIGITAL Plus + PL2z';}
	if (chunk.match(/MSDOLBY D\+ \+NEO:X C/)) {parameter = 'DOLBY DIGITAL Plus + NEO:X Cinema';}
	if (chunk.match(/MSDOLBY D\+ \+NEO:X M/)) {parameter = 'DOLBY DIGITAL Plus + NEO:X Music';}
	if (chunk.match(/MSDOLBY D\+ \+NEO:X G/)) {parameter = 'DOLBY DIGITAL Plus + NEO:X Game';}
	if (chunk.match(/MSDOLBY TRUEHD/)) {parameter = 'DOLBY TrueHD';}
	if (chunk.match(/MSDOLBY HD/) && (!(chunk.match(/MSDOLBY HD+/)))) {parameter = 'DOLBY HD';}
	if (chunk.match(/MSDOLBY HD\+EX/)) {parameter = 'DOLBY TrueHD + EX';}
	if (chunk.match(/MSDOLBY HD\+PL2X C/)) {parameter = 'DOLBY TrueHD + PL2x Cinema';}
	if (chunk.match(/MSDOLBY HD\+PL2X M/)) {parameter = 'DOLBY TrueHD + PL2x Music';}
	if (chunk.match(/MSDOLBY HD\+PL2Z H/)) {parameter = 'DOLBY TrueHD + PL2z';}
	if (chunk.match(/MSDOLBY HD\+NEO:X C/)) {parameter = 'DOLBY TrueHD + NEO:X Cinema';}
	if (chunk.match(/MSDOLBY HD\+NEO:X M/)) {parameter = 'DOLBY TrueHD + NEO:X Music';}
	if (chunk.match(/MSDOLBY HD\+NEO:X G/)) {parameter = 'DOLBY TrueHD + NEO:X Game';}
	if (chunk.match(/MSDTS HD/) && (!(chunk.match(/MSDTS HD /))) && (!(chunk.match(/MSDTS HD+/)))) {parameter = 'DTS-HD';}
	if (chunk.match(/MSDTS HD MSTR/)) {parameter = 'DTS-HD MSTR';}
	if (chunk.match(/MSDTS HD\+PL2X C/)) {parameter = 'DTS-HD + PL2x Cinema';}
	if (chunk.match(/MSDTS HD\+PL2X M/)) {parameter = 'DTS-HD + PL2x Music';}
	if (chunk.match(/MSDTS HD\+PL2Z H/)) {parameter = 'DTS-HD + PL2z';}
	if (chunk.match(/MSDTS HD\+NEO:X C/)) {parameter = 'DTS-HD + NEO:X Cinema';}
	if (chunk.match(/MSDTS HD\+NEO:X M/)) {parameter = 'DTS-HD + NEO:X Music';}
	if (chunk.match(/MSDTS HD\+NEO:X G/)) {parameter = 'DTS-HD + NEO:X Game';}
	if (chunk.match(/MSDTS ES 8CH DSCRT/)) {parameter = 'DTS ES 8CH DSCRT';}
	if (chunk.match(/MSDTS EXPRESS/)) {parameter = 'DTS Express';}
	if (chunk.match(/MSALL ZONE STEREO/)) {parameter = 'ALL ZONE STEREO';}
	if (chunk.match(/MSQUICK1/)) {parameter = 'QUICK1';}
	if (chunk.match(/MSQUICK2/)) {parameter = 'QUICK2';}
	if (chunk.match(/MSQUICK3/)) {parameter = 'QUICK3';}
	if (chunk.match(/MSQUICK4/)) {parameter = 'QUICK4';}
	if (chunk.match(/MSQUICK5/)) {parameter = 'QUICK5';}
	if (chunk.match(/MSQUICK0/)) {parameter = 'QUICK0';}	  
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+73,parameter);
	setState(denonSettings.firstId+59,"0");
	setState(denonSettings.firstId+52,'Denon');
	}
  
  //Denon Zone2 Soundmode
  if (chunk.match(/Z2CS/)) {
	cmd = 'Z2CS';
	if (chunk.match(/Z2CSST/)) {parameter = 'ST';parameter1 = true;}
	if (chunk.match(/Z2CSMO/)) {parameter = 'MO';parameter1 = false;}
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+60,parameter1);	
	setState(denonSettings.firstId+52,'Denon');
  }
  
  //Denon Mainzone Volume
  if (chunk.match(/MV[0-9]{1,3}/)) {
	var matches = chunk.match(/MV[0-9]{1,3}/);
	matches = matches.toString();
	cmd = 'MV';
	parameter = '0.' + matches.substr(2,matches.length);
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+61,parameter);
	setState(denonSettings.firstId+52,'Denon');
  }    
  
  //Denon Mainzone Volume max
  if (chunk.match(/MVMAX [0-9]{1,3}/)) {
    var matches = chunk.match(/MVMAX [0-9]{1,3}/);
	matches = matches.toString();
	cmd = 'MVMAX';
	parameter = '0.' + matches.substr(6,matches.length);
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+62,parameter);	
	setState(denonSettings.firstId+52,'Denon');	
  }   
  
  //Denon Zone2 Volume
  if (chunk.match(/Z2[0-9]{1,3}/)) {
    var matches = chunk.match(/Z2[0-9]{1,3}/);
	matches = matches.toString();
	cmd = 'Z2';
	parameter = '0.' + matches.substr(2,matches.length);
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+63,parameter);
	setState(denonSettings.firstId+52,'Denon');	
  }   
  
  //Denon Mainzone Video Select
  if (chunk.match(/SV/)) {
	if (chunk.match(/SVON/)) {cmd = 'SV';parameter = 'ON';parameter1 = '0';setState(denonSettings.firstId+64,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/SVOFF/)) {cmd = 'SV';parameter = 'OFF';parameter1 = '1';setState(denonSettings.firstId+64,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/SVDVD/)) {cmd = 'SV';parameter = 'DVD';parameter1 = '2';setState(denonSettings.firstId+64,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/SVBD/)) {cmd = 'SV';parameter = 'BD';parameter1 = '3';setState(denonSettings.firstId+64,parameter1);setState(denonSettings.firstId+52,'Denon');}  
	if (chunk.match(/SVTV/)) {cmd = 'SV';parameter = 'TV';parameter1 = '4';setState(denonSettings.firstId+64,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/SVSAT/)) {cmd = 'SV';parameter = 'SAT/CBL';parameter1 = '5';setState(denonSettings.firstId+64,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/SVMPLAY/)) {cmd = 'SV';parameter = 'MPLAY';parameter1 = '6';setState(denonSettings.firstId+64,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/SVGAME/)) {cmd = 'SV';parameter = 'GAME';parameter1 = '7';setState(denonSettings.firstId+64,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/SVAUX1/)) {cmd = 'SV';parameter = 'AUX1';parameter1 = '8';setState(denonSettings.firstId+64,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/SVCD/)) {cmd = 'SV';parameter = 'CD';parameter1 = '9';setState(denonSettings.firstId+64,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }
	
  //Denon Mainzone Aspect Ratio
  if (chunk.match(/VSASP/)) {
	cmd = 'VSASP';
	if (chunk.match(/VSASPFUL/)) {parameter = 'FUL';parameter1 = true;}	 
	if (chunk.match(/VSASPNRM/)) {parameter = 'NRM';parameter1 = false;} 
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+65,parameter1);
	setState(denonSettings.firstId+52,'Denon');
  }
  
  //Denon Mainzone Sleeptimer
  if (chunk.match(/SLP/) && (!(chunk.match(/Z2SLP/)))) {
	var matches = "OFF";
	if (chunk.match(/SLP[0-9]{1,3}/)) {
		matches = chunk.match(/SLP[0-9]{1,3}/);
		matches = matches.toString();
		matches = matches.substr(3,3);
	}
	cmd = 'SLP';
	parameter = matches;
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+66,parameter);
	setState(denonSettings.firstId+52,'Denon');
  }
  
  //Denon Zone2 Sleeptimer
  if (chunk.match(/Z2SLP/)) {
	var matches = "OFF";
	if (chunk.match(/Z2SLP[0-9]{1,3}/)) {
		matches = chunk.match(/Z2SLP[0-9]{1,3}/);
		matches = matches.toString();
		matches = matches.substr(5,3);
	}
	cmd = 'Z2SLP';
	parameter = matches;
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+67,parameter);
	setState(denonSettings.firstId+52,'Denon');
  }
  
  //Denon Mainzone Tone Control
  if (chunk.match(/PSTONE CTRL/)) {
	cmd = 'PSTONE CTRL';
	  if (chunk.match(/PSTONE CTRL OFF/)) {parameter = 'OFF';parameter1 = false;}	 
	  if (chunk.match(/PSTONE CTRL ON/)) {parameter = 'ON';parameter1 = true;} 
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+68,parameter1);
	setState(denonSettings.firstId+52,'Denon');
  }
  
  //Denon Mainzone Cinema EQ
  if (chunk.match(/PSCINEMA EQ./)) {
	cmd = 'PSCINEMA EQ.';
	  if (chunk.match(/PSCINEMA EQ.OFF/)) {parameter = 'OFF';parameter1 = false;}	 
	  if (chunk.match(/PSCINEMA EQ.ON/)) {parameter = 'ON';parameter1 = true;} 
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+69,parameter1);
	setState(denonSettings.firstId+52,'Denon');
  }
  
  //Denon Mainzone Soundmode
  if (chunk.match(/PSMODE:/)) {
	if (chunk.match(/PSMODE:MUSIC/)) {cmd = 'PSMODE:';parameter = 'MUSIC';parameter1 = '0';setState(denonSettings.firstId+70,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/PSMODE:CINEMA/)) {cmd = 'PSMODE:';parameter = 'CINEMA';parameter1 = '1';setState(denonSettings.firstId+70,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/PSMODE:GAME/)) {cmd = 'PSMODE:';parameter = 'GAME';parameter1 = '2';setState(denonSettings.firstId+70,parameter1);setState(denonSettings.firstId+52,'Denon');}	
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }

  //Denon Mainzone Loudness Management
  if (chunk.match(/PSLOM/)) {
	cmd = 'PSLOM';
	  if (chunk.match(/PSLOM OFF/)) {parameter = 'OFF';parameter1 = false;}	 
	  if (chunk.match(/PSLOM ON/)) {parameter = 'ON';parameter1 = true;} 
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
	setState(denonSettings.firstId+71,parameter1);
	setState(denonSettings.firstId+52,'Denon');
  }
  
  //Denon Mainzone Picture Mode
  if (chunk.match(/PV/) && (!(chunk.match(/PVCN/))) && (!(chunk.match(/PVBR/))) && (!(chunk.match(/PVST /))) && (!(chunk.match(/PVHUE/))) && (!(chunk.match(/PVDNR/))) && (!(chunk.match(/PVENH/)))) {
	if (chunk.match(/PVOFF/)) {cmd = 'PV';parameter = 'OFF';parameter1 = '0';setState(denonSettings.firstId+72,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/PVSTD/)) {cmd = 'PV';parameter = 'STD';parameter1 = '1';setState(denonSettings.firstId+72,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/PVMOV/)) {cmd = 'PV';parameter = 'MOV';parameter1 = '2';setState(denonSettings.firstId+72,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/PVVVD/)) {cmd = 'PV';parameter = 'VVD';parameter1 = '2';setState(denonSettings.firstId+72,parameter1);setState(denonSettings.firstId+52,'Denon');}	
	if (chunk.match(/PVSTM/)) {cmd = 'PV';parameter = 'STM';parameter1 = '2';setState(denonSettings.firstId+72,parameter1);setState(denonSettings.firstId+52,'Denon');}
	if (chunk.match(/PVCTM/)) {cmd = 'PV';parameter = 'CTM';parameter1 = '2';setState(denonSettings.firstId+72,parameter1);setState(denonSettings.firstId+52,'Denon');}	
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }
  
  //Denon Mainzone Input Mode
  {if (chunk.match(/SDAUTO/)) {
	cmd = 'SD';
	parameter = "0";
	setState(denonSettings.firstId+74,parameter);
	setState(denonSettings.firstId+52,'Denon');
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }
  if (chunk.match(/SDHDMI/)) {
	cmd = 'SD';
	parameter = "1";
	setState(denonSettings.firstId+74,parameter);
	setState(denonSettings.firstId+52,'Denon');
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }
  if (chunk.match(/SDDIGITAL/)) {
	cmd = 'SD';
	parameter = "2";
	setState(denonSettings.firstId+74,parameter);
	setState(denonSettings.firstId+52,'Denon');
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }
  if (chunk.match(/SDANALOG/)) {
	cmd = 'SD';
	parameter = "3";
	setState(denonSettings.firstId+74,parameter);
	setState(denonSettings.firstId+52,'Denon');
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }
  if (chunk.match(/SDARC/)) {
	cmd = 'SD';
	parameter = "4";
	setState(denonSettings.firstId+74,parameter);
	setState(denonSettings.firstId+52,'Denon');
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }
  if (chunk.match(/SDNO/)) {
	cmd = 'SD';
	parameter = "5";
	setState(denonSettings.firstId+74,parameter);
	setState(denonSettings.firstId+52,'Denon');
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }}
  
  //Denon Mainzone Digital Input Mode
  {if (chunk.match(/DCAUTO/)) {
	cmd = 'DC';
	parameter = "0";
	setState(denonSettings.firstId+75,parameter);
	setState(denonSettings.firstId+52,'Denon');
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }
  if (chunk.match(/DCPCM/)) {
	cmd = 'DC';
	parameter = "1";
	setState(denonSettings.firstId+75,parameter);
	setState(denonSettings.firstId+52,'Denon');
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }
  if (chunk.match(/DCDTS/)) {
	cmd = 'DC';
	parameter = "2";
	setState(denonSettings.firstId+75,parameter);
	setState(denonSettings.firstId+52,'Denon');
	if (denonSettings.debug == true) {
		logger.info("adapter Denon Event Receiver command:"+cmd+" parameter: "+parameter);
	}
  }}

});}

//Wird beim Socket Fehler aufgerufen
socketOnkyo.on('error', function (data) {
	logger.info("adapter denon ERROR Connection Receiver:"+data.toString());
	setState(denonSettings.firstId+50,false);                                    
	denonConnected = 'false';
	//Neuen connect in 10sec initiieren (geht nur einmalig, deshalb setinterval denonreconnect)
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
{socket.on('event', function (obj) {
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
	if (obj[0] == denonSettings.firstId+51 || obj[0] == denonSettings.firstId+53 || obj[0] == denonSettings.firstId+54 || obj[0] == denonSettings.firstId+55 || obj[0] == denonSettings.firstId+56 || obj[0] == denonSettings.firstId+57 || obj[0] == denonSettings.firstId+58 || obj[0] == denonSettings.firstId+59 || obj[0] == denonSettings.firstId+60 || obj[0] == denonSettings.firstId+61 || obj[0] == denonSettings.firstId+63 || obj[0] == denonSettings.firstId+64 || obj[0] == denonSettings.firstId+65 || obj[0] == denonSettings.firstId+66 || obj[0] == denonSettings.firstId+67 || obj[0] == denonSettings.firstId+68 || obj[0] == denonSettings.firstId+69 || obj[0] == denonSettings.firstId+70 || obj[0] == denonSettings.firstId+71 || obj[0] == denonSettings.firstId+72 || obj[0] == denonSettings.firstId+74 || obj[0] == denonSettings.firstId+75) {
		//logger.info("adapter Denon Event (hier hat sich bei der 110100 (firstID) was geändert): "+id+" "+val+" "+ts+" "+ack+" "+obj);
		if (denonSettings.debug == true) {
		logger.info("adapter Denon Event CCUIO ID:"+id+" Wert:"+val+" Zeitstempel:"+ts+" Ack:"+ack);
		}
			
		//Änderung der ersten ID 110101 und Wert ungleich ""
		//if (id == denonSettings.firstId && val != "" || id == denonSettings.ccuId && val != "") {
		if (id == denonSettings.firstId+51 && val != "" ){
			  
			//Einen String für den Denon zusammenbasteln
			//command = new Buffer("Hallo Denon umschalten bitte :D "+val+"\n");
			//command = new Buffer("ISCP\x00\x00\x00\x10\x00\x00\x00\x08\x01\x00\x00\x00\x211"+val+"\x0D");
			command = new Buffer(""+val+"\x0D");
			logger.info("adapter Denon Event CCUIO send: "+command);
			socketOnkyo.write(command);
			sleep(50);
			
			//Variablen wieder zurücksetzen
			setState(id, "");
			setState(denonSettings.firstId+52, "Extern");
		}
		
		//Denon Mainzone Power
		if (id == denonSettings.firstId+53 && ack != true) {
			//add support of "true|false"
			if (val == true) {
				new_val = 'ON';
			}
			if  (val == false) {
				new_val = 'OFF';
			} 
			command = new Buffer("ZM"+new_val+"\x0D");
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Mainzone Mute
		if (id == denonSettings.firstId+54 && ack != true) {
			//add support of "true|false"
			if (val == true) {
				new_val = 'ON';
			}
			if  (val == false) {
				new_val = 'OFF';
			} 
			command = new Buffer("MU"+new_val+"\x0D");
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Zone2 Power
		if (id == denonSettings.firstId+55 && ack != true) {
			//add support of "true|false"
			if (val == true) {
				new_val = 'ON';
			}
			if  (val == false) {
				new_val = 'OFF';
			} 
			command = new Buffer("Z2"+new_val+"\x0D");
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Zone2 Mute
		if (id == denonSettings.firstId+56 && ack != true) {
			//add support of "true|false"
			if (val == true) {
				new_val = 'ON';
			}
			if  (val == false) {
				new_val = 'OFF';
			} 
			command = new Buffer("Z2MU"+new_val+"\x0D");
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}

		//Denon Mainzone Input & Denon Zone2 Input
		if ((id == denonSettings.firstId+57 || id == denonSettings.firstId+58) && ack != true) {
			switch (String(val)) {
				case "0":new_val = "CD";break;
				case "1":new_val = "TUNER";break;
				case "2":new_val = "DVD";break;
				case "3":new_val = "BD";break;
				case "4":new_val = "TV";break;
				case "5":new_val = "SAT/CBL";break;
				case "6":new_val = "MPLAY";break;
				case "7":new_val = "GAME";break;
				case "8":new_val = "AUX1";break;
				case "9":new_val = "NET";break;
				case "10":new_val = "SPOTIFY";break;
				case "11":new_val = "FLICKR";break;					
				case "12":new_val = "FAVORITES";break;
				case "13":new_val = "IRADIO";break;
				case "14":new_val = "SERVER";break;
				case "15":new_val = "USB/IPOD";break;
				case "16":new_val = "USB";break;
				case "17":new_val = "IPD";break;
				case "18":new_val = "IRP";break;
				case "19":new_val = "FVP";break;
				default: 
					if (denonSettings.debug == true) {
						logger.info("adapter Denon Mainzone Input oder Zone2 Input: unbehandelte Auswahl: "+val);
					}
					break;
			}
			if (id == denonSettings.firstId+57) {
				command = new Buffer("SI"+new_val+"\x0D")
			} else {
				command = new Buffer("Z2"+new_val+"\x0D")
			}
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Mainzone Surroundmode Choice
		if (id == denonSettings.firstId+59 && ack != true) {
			switch (String(val)) {
				case "0":new_val = "..choice..";break;
				case "1":new_val = "MOVIE";break;
				case "2":new_val = "MUSIC";break;
				case "3":new_val = "GAME";break;
				case "4":new_val = "PURE DIRECT";break;
				case "5":new_val = "DIRECT";break;
				case "6":new_val = "STEREO";break;
				case "7":new_val = "STANDARD";break;
				case "8":new_val = "DOLBY DIGITAL";break;
				case "9":new_val = "DTS SURROUND";break;
				case "10":new_val = "MCH STEREO";break;
				case "11":new_val = "ROCK ARENA";break;
				case "12":new_val = "JAZZ CLUB";break;					
				case "13":new_val = "MONO MOVIE";break;
				case "14":new_val = "MATRIX";break;
				case "15":new_val = "VIDEO GAME";break;
				case "16":new_val = "VIRTUAL";break;
				case "17":new_val = "QUICK1";break;
				case "18":new_val = "QUICK2";break;
				case "19":new_val = "QUICK3";break;
				case "20":new_val = "QUICK4";break;
				case "21":new_val = "QUICK5";break;
				case "22":new_val = "QUICK1 MEMORY";break;
				case "23":new_val = "QUICK2 MEMORY";break;
				case "24":new_val = "QUICK3 MEMORY";break;
				case "25":new_val = "QUICK4 MEMORY";break;
				case "26":new_val = "QUICK5 MEMORY";break;				
				default: 
					if (denonSettings.debug == true) {
						logger.info("adapter Denon Mainzone Surroundmode Choice: unbehandelte Auswahl: "+val);
					}
					break;
			}
			command = new Buffer("MS"+new_val+"\x0D")
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Zone2 Soundmode
		if (id == denonSettings.firstId+60 && ack != true) {
			//add support of "true|false"
			if (val == true) {
				new_val = 'ST';
			}
			if  (val == false) {
				new_val = 'MONO';
			} 
			command = new Buffer("Z2CS"+new_val+"\x0D");
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Mainzone Volume
		if (id == denonSettings.firstId+61 && ack != true) {
			if (parseFloat(val)<1.0) {
				var vol = parseFloat(val)*100.0;  //string to integer
				var new_val=vol;
				if (vol < 10.0) {
					new_val="0"+vol;
				}
				if (vol > 98.0) {
					new_val=98.0;
				}
				command = new Buffer("MV"+new_val+"\x0D");
				if (denonSettings.debug == true) {
					logger.info("adapter Denon send:"+command);
				}
				socketOnkyo.write(command);
				setState(denonSettings.firstId+52, "CCU.IO");
			} else { //Falscheingaben abfangen
				if (denonSettings.debug == true) {
					logger.info("adapter Denon Denon Mainzone Volume: wrong command");
				}
				command = new Buffer("MV?\x0D"); //korrekten Wert abfragen
				if (denonSettings.debug == true) {
					logger.info("adapter Denon send:"+command);
				}
				socketOnkyo.write(command);
				setState(denonSettings.firstId+52, "CCU.IO");
			}
		}
		
		//Denon Zone2 Volume
		if (id == denonSettings.firstId+63 && ack != true) {
			if (parseFloat(val)<1.0) {
				var vol = parseFloat(val)*100.0;  //string to integer
				var new_val=vol;
				if (vol < 10.0) {
					new_val="0"+vol;
				}
				if (vol > 98.0) {
					new_val=98.0;
				}
				command = new Buffer("Z2"+new_val+"\x0D");
				if (denonSettings.debug == true) {
					logger.info("adapter Denon send:"+command);
				}
				socketOnkyo.write(command);
				setState(denonSettings.firstId+52, "CCU.IO");
			} else { //Falscheingaben abfangen
				if (denonSettings.debug == true) {
					logger.info("adapter Denon Denon Zone2 Volume: wrong command");
				}
				command = new Buffer("Z2?\x0D"); //korrekten Wert abfragen
				if (denonSettings.debug == true) {
					logger.info("adapter Denon send:"+command);
				}
				socketOnkyo.write(command);
				setState(denonSettings.firstId+52, "CCU.IO");
			}
		}
		
		//Denon Mainzone Video Select
		if (id == denonSettings.firstId+64 && ack != true) {
			switch (String(val)) {
				case "0":new_val = "ON";break;
				case "1":new_val = "OFF";break;
				case "2":new_val = "DVD";break;
				case "3":new_val = "BD";break;
				case "4":new_val = "TV";break;
				case "5":new_val = "SAT/CBL";break;
				case "6":new_val = "MPLAY";break;
				case "7":new_val = "GAME";break;
				case "8":new_val = "AUX1";break;
				case "9":new_val = "CD";break;
				default: 
					if (denonSettings.debug == true) {
						logger.info("adapter Denon Mainzone Video Select: unbehandelte Auswahl: "+val);
					}
					break;
			}
			command = new Buffer("SV"+new_val+"\x0D")
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Mainzone Aspect Ratio
		if (id == denonSettings.firstId+65 && ack != true) {
			//add support of "true|false"
			if (val == true) {
				new_val = 'FUL';
			}
			if  (val == false) {
				new_val = 'NRM';
			} 
			command = new Buffer("VSASP"+new_val+"\x0D");
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Mainzone Sleeptimer
		if (id == denonSettings.firstId+66 && ack != true) {
			var new_val = "OFF";
			if (String(val).match(/[0-9]{1,3}/)) {
				new_val = String(val).match(/[0-9]{1,3}/);
				new_val = new_val.toString();
				new_val = new_val.substr(0,3);
			} 
			command = new Buffer("SLP"+new_val+"\x0D");
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Zone2 Sleeptimer
		if (id == denonSettings.firstId+67 && ack != true) {
			var new_val = "OFF";
			if (String(val).match(/[0-9]{1,3}/)) {
				new_val = String(val).match(/[0-9]{1,3}/);
				new_val = new_val.toString();
				new_val = new_val.substr(0,3);
			} 
			command = new Buffer("Z2SLP"+new_val+"\x0D");
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Mainzone Tone Control
		if (id == denonSettings.firstId+68 && ack != true) {
			//add support of "true|false"
			if (val == true) {
				new_val = 'ON';
			}
			if  (val == false) {
				new_val = 'OFF';
			} 
			command = new Buffer("PSTONE CTRL "+new_val+"\x0D");
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Mainzone Cinema EQ.
		if (id == denonSettings.firstId+69 && ack != true) {
			//add support of "true|false"
			if (val == true) {
				new_val = 'ON';
			}
			if  (val == false) {
				new_val = 'OFF';
			} 
			command = new Buffer("PSCINEMA EQ."+new_val+"\x0D");
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Mainzone Soundmode
		if (id == denonSettings.firstId+70 && ack != true) {
			switch (String(val)) {
				case "0":new_val = "MUSIC";break;
				case "1":new_val = "CINEMA";break;
				case "2":new_val = "GAME";break;
				default: 
					if (denonSettings.debug == true) {
						logger.info("adapter Denon Mainzone Soundmode: unbehandelte Auswahl: "+val);
					}
					break;
			}
			command = new Buffer("PSMODE:"+new_val+"\x0D")
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Mainzone Loudness Management
		if (id == denonSettings.firstId+71 && ack != true) {
			//add support of "true|false"
			if (val == true) {
				new_val = 'ON';
			}
			if  (val == false) {
				new_val = 'OFF';
			} 
			command = new Buffer("PSLOM "+new_val+"\x0D");
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Mainzone Picture Mode
		if (id == denonSettings.firstId+72 && ack != true) {
			switch (String(val)) {
				case "0":new_val = "OFF";break;
				case "1":new_val = "STD";break;
				case "2":new_val = "MOV";break;
				case "3":new_val = "VVD";break;
				case "4":new_val = "STM";break;
				case "5":new_val = "CTM";break;
				default: 
					if (denonSettings.debug == true) {
						logger.info("adapter Denon Mainzone Picture Mode: unbehandelte Auswahl: "+val);
					}
					break;
			}
			command = new Buffer("PV"+new_val+"\x0D")
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Mainzone Input Mode
		if (id == denonSettings.firstId+74 && ack != true) {
			switch (String(val)) {
				case "0":new_val = "AUTO";break;
				case "1":new_val = "HDMI";break;
				case "2":new_val = "DIGITAL";break;
				case "3":new_val = "ANALOG";break;
				case "4":new_val = "ARC";break;
				case "5":new_val = "NO";break;
				default: 
					if (denonSettings.debug == true) {
						logger.info("adapter Denon Mainzone Picture Mode: unbehandelte Auswahl: "+val);
					}
					break;
			}
			command = new Buffer("SD"+new_val+"\x0D")
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
		//Denon Mainzone Digital Input Mode
		if (id == denonSettings.firstId+75 && ack != true) {
			switch (String(val)) {
				case "0":new_val = "AUTO";break;
				case "1":new_val = "PCM";break;
				case "2":new_val = "DTS";break;
				default: 
					if (denonSettings.debug == true) {
						logger.info("adapter Denon Mainzone Picture Mode: unbehandelte Auswahl: "+val);
					}
					break;
			}
			command = new Buffer("DC"+new_val+"\x0D")
			if (denonSettings.debug == true) {
				logger.info("adapter Denon send:"+command);
			}
			socketOnkyo.write(command);
			setState(denonSettings.firstId+52, "CCU.IO");
		}
		
	}
});}

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
    if (obj.Value !== undefined) {
        datapoints[obj.Name] = [obj.Value];
        nameIndex[obj.Name] = id;
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

function denonReconnect() {
  if (denonConnected != 'true'){
      connectDenon();
      }
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

	//Device: Denon AVR Receiver
	{socket.emit("setObject", denonSettings.firstId+00, {
		Name: "Denon-Receiver",
		TypeName: "DEVICE",
		HssType: "Denon AVR Receiver",
		Address: "Denon-AVR",
		Interface: "CCU.IO",
		Channels: [
		  denonSettings.firstId+01,
		  denonSettings.firstId+02,
		  denonSettings.firstId+03  
		],
	});}
	
	//Channel: Denon Main
	{var chObject01 = {
		Name: "Denon Main",
		TypeName: "CHANNEL",
		Address: "Denon Main",
		HssType: "AVR Receiver",
		DPs: {
			Denon_Command:						denonSettings.firstId+51,
			Denon_CommandSender:				denonSettings.firstId+52,
			Denon_Connect_Status:				denonSettings.firstId+50
		},
		Parent: denonSettings.firstId+00,
	};
	setObject(denonSettings.firstId+01, chObject01);}
	
	//Channel: Denon Mainzone
	{var chObject02 = {
		Name: "Denon Mainzone",
		TypeName: "CHANNEL",
		Address: "Denon Mainzone",
		HssType: "AVR Receiver",
		DPs: {
			Denon_Mainzone_Power:				denonSettings.firstId+53,
			Denon_Mainzone_Mute:				denonSettings.firstId+54,
			Denon_Mainzone_Input:				denonSettings.firstId+57,
			Denon_Mainzone_Surroundmode_Choice:	denonSettings.firstId+59,
			Denon_Mainzone_Volume:				denonSettings.firstId+61,
			Denon_Mainzone_Volume_max:			denonSettings.firstId+62,
			Denon_Mainzone_Video_Select:		denonSettings.firstId+64,
			Denon_Aspect_Ratio:					denonSettings.firstId+65,
			Denon_Mainzone_Sleeptimer:			denonSettings.firstId+66,
			Denon_Mainzone_Tone_Control:		denonSettings.firstId+68,			
			Denon_Mainzone_Cinema_EQ:			denonSettings.firstId+69,
			Denon_Mainzone_Soundmode:			denonSettings.firstId+70,
			Denon_Mainzone_Loudness_Management:	denonSettings.firstId+71,
			Denon_Picture_Mode:					denonSettings.firstId+72,
			Denon_Mainzone_Surroundmode_Return:	denonSettings.firstId+73,
			Denon_Mainzone_Input_Mode:			denonSettings.firstId+74,
			Denon_Mainzone_Digital_Input_Mode:	denonSettings.firstId+75
		},
		Parent: denonSettings.firstId+00,
	};
	setObject(denonSettings.firstId+02, chObject02);}
	
	//Channel: Denon Zone2
	{var chObject03 = {
		Name: "Denon Zone2",
		TypeName: "CHANNEL",
		Address: "Denon Zone2",
		HssType: "AVR Receiver",
		DPs: {
			Denon_Zone2_Power:					denonSettings.firstId+55,
			Denon_Zone2_Mute:					denonSettings.firstId+56,
			Denon_Zone2_Input:					denonSettings.firstId+58,
			Denon_Zone2_Soundmode:				denonSettings.firstId+60,
			Denon_Zone2_Volume:					denonSettings.firstId+23,
			Denon_Zone2_Sleeptimer:				denonSettings.firstId+67
		},
		Parent: denonSettings.firstId+00,
	};
	setObject(denonSettings.firstId+03, chObject03);}
	
	//Channel: Denon Mainzone Power
	{var chObject13 = {
		Name: "Denon Mainzone Power",
		TypeName: "CHANNEL",
		HssType: "SWITCH",
		ChnDirection: 2,
		ChannelType: 26,
		ChnLabel: "SWITCH",
		DPs: {
			STATE: denonSettings.firstId+53
		},
		Parent: denonSettings.firstId+02,
	};
	if (denonSettings.room_main) {
		chObject13.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject13.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject13.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+13, chObject13);}
	
	//Channel: Denon Mainzone Mute
	{var chObject14 = {
		Name: "Denon Mainzone Mute",
		TypeName: "CHANNEL",
		HssType: "SWITCH",
		ChnDirection: 2,
		ChannelType: 26,
		ChnLabel: "SWITCH",
		DPs: {
			STATE: denonSettings.firstId+54
		},
		Parent: denonSettings.firstId+02,
	};
	if (denonSettings.room_main) {
		chObject14.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject14.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject14.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+14, chObject14);}
	
	//Channel: Denon Zone2 Power
	{var chObject15 = {
		Name: "Denon Zone2 Power",
		TypeName: "CHANNEL",
		HssType: "SWITCH",
		ChnDirection: 2,
		ChannelType: 26,
		ChnLabel: "SWITCH",
		DPs: {
			STATE: denonSettings.firstId+55
		},
		Parent: denonSettings.firstId+03,
	};
	if (denonSettings.room_zone2) {
		chObject15.rooms = denonSettings.room_zone2;
	}
	if (denonSettings.funcs) {
		chObject15.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject15.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+15, chObject15);}
	
	//Channel: Denon Zone2 Mute
	{var chObject16 = {
		Name: "Denon Zone2 Mute",
		TypeName: "CHANNEL",
		HssType: "SWITCH",
		ChnDirection: 2,
		ChannelType: 26,
		ChnLabel: "SWITCH",
		DPs: {
			STATE: denonSettings.firstId+56
		},
		Parent: denonSettings.firstId+03,
	};
	if (denonSettings.room_zone2) {
		chObject16.rooms = denonSettings.room_zone2;
	}
	if (denonSettings.funcs) {
		chObject16.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject16.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+16, chObject16);}

	//Channel: Denon Mainzone Tone Control
	{var chObject17 = {
		Name: "Denon Mainzone Tone Control",
		TypeName: "CHANNEL",
		HssType: "SWITCH",
		ChnDirection: 2,
		ChannelType: 26,
		ChnLabel: "SWITCH",
		DPs: {
			STATE: denonSettings.firstId+68
		},
		Parent: denonSettings.firstId+02,
	};
	if (denonSettings.room_main) {
		chObject17.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject17.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject17.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+17, chObject17);}
	
	//Channel: Denon Mainzone Cinema EQ.
	{var chObject18 = {
		Name: "Denon Mainzone Cinema EQ.",
		TypeName: "CHANNEL",
		HssType: "SWITCH",
		ChnDirection: 2,
		ChannelType: 26,
		ChnLabel: "SWITCH",
		DPs: {
			STATE: denonSettings.firstId+69
		},
		Parent: denonSettings.firstId+02,
	};
	if (denonSettings.room_main) {
		chObject18.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject18.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject18.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+18, chObject18);}

	//Channel: Denon Mainzone Cinema EQ.
	{var chObject19 = {
		Name: "Denon Mainzone Loudness Management",
		TypeName: "CHANNEL",
		HssType: "SWITCH",
		ChnDirection: 2,
		ChannelType: 26,
		ChnLabel: "SWITCH",
		DPs: {
			STATE: denonSettings.firstId+71
		},
		Parent: denonSettings.firstId+02,
	};
	if (denonSettings.room_main) {
		chObject19.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject19.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject19.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+19, chObject19);}
	
	//Channel: Denon Mainzone Volume
	{var chObject21 = {
		Name: "Denon Mainzone Volume",
		TypeName: "CHANNEL",
		HssType: "DIMMER",
		ChnDirection: 2,
		ChannelType: 27,
		ChnLabel: "DIMMER",
		DPs: {
			LEVEL: denonSettings.firstId+61
		},
		Parent: denonSettings.firstId+02,
	};
	if (denonSettings.room_main) {
		chObject21.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject21.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject21.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+21,chObject21);}
	
	//Channel: Denon Zone2 Volume
	{var chObject23 = {
		Name: "Denon Zone2 Volume",
		TypeName: "CHANNEL",
		HssType: "DIMMER",
		ChnDirection: 2,
		ChannelType: 27,
		ChnLabel: "DIMMER",
		DPs: {
			LEVEL: denonSettings.firstId+63
		},
		Parent: denonSettings.firstId+03,
	};
	if (denonSettings.room_zone2) {
		chObject23.rooms = denonSettings.room_zone2;
	}
	if (denonSettings.funcs) {
		chObject23.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject23.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+23, chObject23);}
	
	//Denon Connect Status
	{var chObject50 = {
		Name: "Denon Connect Status",
		DPInfo: "Denon Connect Status(r)",
		TypeName: "VARDP",
		ValueMin: null,
		ValueMax: null,
		ValueUnit: "",
		ValueType: 2,
		ValueSubType: 2,
		ValueList: "keine Verbindung;verbunden",
		Parent: denonSettings.firstId+01,
	};
	if (denonSettings.funcs) {
		chObject50.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject50.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+50, chObject50);}
	
	//Denon Command
	{var chObject51 = {
		Name: "Denon Command",
		DPInfo: "Denon Command",
		TypeName: "VARDP",
		ValueType: 20,
		ValueSubType: 11,
		Parent: denonSettings.firstId+01,
	};
	if (denonSettings.funcs) {
		chObject51.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject51.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+51, chObject51);}
	
	//Denon CommandSender
	{var chObject52 = {
		Name: "Denon CommandSender",
		DPInfo: "Denon CommandSender(r)",
		TypeName: "VARDP",
		Parent: denonSettings.firstId+01,
	};
	if (denonSettings.funcs) {
		chObject52.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject52.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+52, chObject52);}
	
	//Denon Mainzone Power.STATE
	setObject(denonSettings.firstId+53, {
	  Name: "Denon Mainzone Power.STATE",
	  DPInfo: "Denon Mainzone Power",
	  TypeName: "HSSDP",
      ValueMin: null,
      ValueMax: null,
      ValueUnit: "",
      ValueType: 2,
      ValueSubType: 2,
      ValueList: "aus;an",
	  Parent: denonSettings.firstId+13
	});
	
	//Denon Mainzone Mute.STATE
	setObject(denonSettings.firstId+54, {
	  Name: "Denon Mainzone Mute.STATE",
	  DPInfo: "Denon Mainzone Mute",
	  TypeName: "HSSDP",
      ValueMin: null,
      ValueMax: null,
      ValueUnit: "",
      ValueType: 2,
      ValueSubType: 2,
      ValueList: "aus;an",
	  Parent: denonSettings.firstId+14
	});
	
	//Denon Zone2 Power.STATE
	setObject(denonSettings.firstId+55, {
	  Name: "Denon Zone2 Power.STATE",
	  DPInfo: "Denon Zone2 Power",
	  TypeName: "HSSDP",
      ValueMin: null,
      ValueMax: null,
      ValueUnit: "",
      ValueType: 2,
      ValueSubType: 2,
      ValueList: "aus;an",
	  Parent: denonSettings.firstId+15
	});
	
	//Denon Zone2 Mute.STATE
	setObject(denonSettings.firstId+56, {
	  Name: "Denon Zone2 Mute.STATE",
	  DPInfo: "Denon Zone2 Mute",
	  TypeName: "HSSDP",
      ValueMin: null,
      ValueMax: null,
      ValueUnit: "",
      ValueType: 2,
      ValueSubType: 2,
      ValueList: "aus;an",
	  Parent: denonSettings.firstId+16
	});
	
	//Denon Mainzone Input
	{var chObject57 = {
		Name: "Denon Mainzone Input",
		DPInfo: "Denon Mainzone Input",
		TypeName: "VARDP",
		ValueMin: 0,
		ValueMax: 19,
		ValueUnit: "",
		ValueType: 16,
		ValueSubType: 29,
		ValueList: "CD;Tuner;DVD;BD;TV;SAT/CBL;MPLAY;GAME;AUX1;NET;SPOTIFY;FLICKR;FAVORITES;IRADIO;SERVER;USB/IPOD;USB;IPD;IRP;FVP",
		Parent: denonSettings.firstId+02,
	};
	if (denonSettings.room_main) {
		chObject57.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject57.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject57.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+57, chObject57);}
	
	//Denon Zone2 Input
	{var chObject58 = {
		Name: "Denon Zone2 Input",
		DPInfo: "Denon Zone2 Input",
		TypeName: "VARDP",
		ValueMin: 0,
		ValueMax: 19,
		ValueUnit: "",
		ValueType: 16,
		ValueSubType: 29,
		ValueList: "CD;Tuner;DVD;BD;TV;SAT/CBL;MPLAY;GAME;AUX1;NET;SPOTIFY;FLICKR;FAVORITES;IRADIO;SERVER;USB/IPOD;USB;IPD;IRP;FVP",
		Parent: denonSettings.firstId+03,
	};
	if (denonSettings.room_zone2) {
		chObject58.rooms = denonSettings.room_zone2;
	}
	if (denonSettings.funcs) {
		chObject58.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject58.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+58, chObject58);}
	
	//Denon Mainzone Surroundmode Choice
	{var chObject59 = {
		Name: "Denon Mainzone Surroundmode Choice",
		DPInfo: "Denon Mainzone Surroundmode Choice",
		TypeName: "VARDP",
		ValueMin: 0,
		ValueMax: 87,
		ValueUnit: "",
		ValueType: 16,
		ValueSubType: 29,
		ValueList: "..choice..;MOVIE;MUSIC;GAME;PURE DIRECT;DIRECT;STEREO;STANDARD;DOLBY DIGITAL;DTS SURROUND;MULTI CHANNEL STEREO;ROCK ARENA;JAZZ CLUB;MONO MOVIE;MATRIX;VIDEO GAME;VIRTUAL",
		Parent: denonSettings.firstId+02
	};
	if (denonSettings.room_main) {
		chObject59.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject59.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject59.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+59, chObject59);}
	
	//Denon Zone2 Soundmode
	{var chObject60 = {
		Name: "Denon Zone2 Soundmode",
		DPInfo: "Denon Zone2 Soundmode",
		TypeName: "VARDP",
		ValueMin: null,
		ValueMax: null,
		ValueUnit: "",
		ValueType: 2,
		ValueSubType: 2,
		ValueList: "MONO;STEREO",
		Parent: denonSettings.firstId+03
	};
	if (denonSettings.room_zone2) {
		chObject60.rooms = denonSettings.room_zone2;
	}
	if (denonSettings.funcs) {
		chObject60.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject60.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+60, chObject60);}
	
	//Denon Mainzone Volume.LEVEL
	setObject(denonSettings.firstId+61, {
	  Name: "Denon Mainzone Volume.LEVEL",
	  DPInfo: "Denon Mainzone Volume",
	  TypeName: "HSSDP",
	  Parent: denonSettings.firstId+21
	});
	
	//Denon Mainzone Volume max
	setObject(denonSettings.firstId+62, {
	  Name: "Denon Mainzone Volume max",
	  DPInfo: "Denon Mainzone Volume max(r)",
	  TypeName: "VARDP",
	  Parent: denonSettings.firstId+02,
	  });
	
	//Denon Zone2 Volume.LEVEL
	setObject(denonSettings.firstId+63, {
	  Name: "Denon Zone2 Volume.LEVEL",
	  DPInfo: "Denon Zone2 Volume",
	  TypeName: "HSSDP",
      Operations: 7,
	  ValueType: 6,
      ValueUnit: "",
	  Parent: denonSettings.firstId+23,
	});
	
	//Denon Mainzone Video Select
	{var chObject64 = {
		Name: "Denon Mainzone Video Select",
		DPInfo: "Denon Mainzone Video Select",
		TypeName: "VARDP",
		ValueMin: 0,
		ValueMax: 9,
		ValueUnit: "",
		ValueType: 16,
		ValueSubType: 29,
		ValueList: "ON;OFF;DVD;BD;TV;SAT/CBL;MPLAY;GAME;AUX1;CD",
		Parent: denonSettings.firstId+02
	};
	if (denonSettings.room_main) {
		chObject64.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject64.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject64.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+64, chObject64);}

	//Denon Mainzone Aspect Ratio
	{var chObject65 = {
		Name: "Denon Mainzone Aspect Ratio",
		DPInfo: "Denon Mainzone Aspect Ratio",
		TypeName: "VARDP",
		ValueMin: null,
		ValueMax: null,
		ValueUnit: "",
		ValueType: 2,
		ValueSubType: 2,
		ValueList: "4:3;16:9",
		Parent: denonSettings.firstId+02
	};
	if (denonSettings.room_main) {
		chObject65.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject65.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject65.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+65, chObject65);}

	//Denon Mainzone Sleeptimer
	{var chObject66 = {
		Name: "Denon Mainzone Sleeptimer",
		DPInfo: "Denon Mainzone Sleeptimer",
		TypeName: "VARDP",
		ValueType: 20,
		ValueSubType: 11,
		Parent: denonSettings.firstId+02,
	};
	if (denonSettings.room_main) {
		chObject66.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject66.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject66.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+66, chObject66);}
	
	//Denon Zone2 Sleeptimer
	{var chObject67 = {
		Name: "Denon Zone2 Sleeptimer",
		DPInfo: "Denon Zone2 Sleeptimer",
		TypeName: "VARDP",
		ValueType: 20,
		ValueSubType: 11,
		Parent: denonSettings.firstId+03,
	};
	if (denonSettings.room_zone2) {
		chObject67.rooms = denonSettings.room_zone2;
	}
	if (denonSettings.funcs) {
		chObject67.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject67.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+67, chObject67);}
  	
	//Denon Mainzone Tone Control.STATE
	setObject(denonSettings.firstId+68, {
	  Name: "Denon Mainzone Tone Control.STATE",
	  DPInfo: "Denon Mainzone Tone Control",
	  TypeName: "HSSDP",
      ValueMin: null,
      ValueMax: null,
      ValueUnit: "",
      ValueType: 2,
      ValueSubType: 2,
      ValueList: "aus;an",
	  Parent: denonSettings.firstId+17
	});
	
	//Denon Mainzone Cinema EQ.
	setObject(denonSettings.firstId+69, {
	  Name: "Denon Mainzone Cinema EQ.STATE",
	  DPInfo: "Denon Mainzone Cinema EQ.",
	  TypeName: "HSSDP",
      ValueMin: null,
      ValueMax: null,
      ValueUnit: "",
      ValueType: 2,
      ValueSubType: 2,
      ValueList: "aus;an",
	  Parent: denonSettings.firstId+18
	});
	
	//Denon Mainzone Soundmode
	{var chObject70 = {
		Name: "Denon Mainzone Soundmode",
		DPInfo: "Denon Mainzone Soundmode",
		TypeName: "VARDP",
		ValueMin: 0,
		ValueMax: 2,
		ValueUnit: "",
		ValueType: 16,
		ValueSubType: 29,
		ValueList: "MUSIC;CINEMA;GAME",
		Parent: denonSettings.firstId+02
	};
	if (denonSettings.room_main) {
		chObject70.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject70.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject70.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+70, chObject70);}
	
	//Denon Mainzone Loudness Management.STATE
	setObject(denonSettings.firstId+71, {
	  Name: "Denon Mainzone Loudness Management.STATE",
	  DPInfo: "Denon Mainzone Loudness Management",
	  TypeName: "HSSDP",
      ValueMin: null,
      ValueMax: null,
      ValueUnit: "",
      ValueType: 2,
      ValueSubType: 2,
      ValueList: "aus;an",
	  Parent: denonSettings.firstId+19
	});

	//Denon Mainzone Picture Mode
	{var chObject72 = {
		Name: "Denon Mainzone Picture Mode",
		DPInfo: "Denon Mainzone Picture Mode",
		TypeName: "VARDP",
		ValueMin: 0,
		ValueMax: 2,
		ValueUnit: "",
		ValueType: 16,
		ValueSubType: 29,
		ValueList: "OFF;STANDARD;MOVIE;VIVID;STREAM;CUSTOM",
		Parent: denonSettings.firstId+02
	};
	if (denonSettings.room_main) {
		chObject72.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject72.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject72.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+72, chObject72);}
	
	//Denon Mainzone Surroundmode Return
	{var chObject73 = {
		Name: "Denon Mainzone Surroundmode Return",
		DPInfo: "Denon Mainzone Surroundmode Return(r)",
		TypeName: "VARDP",
		Parent: denonSettings.firstId+02,
	};
	if (denonSettings.room_main) {
		chObject73.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject73.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject73.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+73, chObject73);}
	
	//Denon Mainzone Input Mode
	{var chObject74 = {
		Name: "Denon Mainzone Input Mode",
		DPInfo: "Denon Mainzone Input Mode",
		TypeName: "VARDP",
		ValueMin: 0,
		ValueMax: 2,
		ValueUnit: "",
		ValueType: 16,
		ValueSubType: 29,
		ValueList: "AUTO;HDMI;DIGITAL;ANALOG;ARC;NO",
		Parent: denonSettings.firstId+02
	};
	if (denonSettings.room_main) {
		chObject74.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject74.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject74.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+74, chObject74);}
	
	//Denon Mainzone Digital Input Mode
	{var chObject75 = {
		Name: "Denon Mainzone Digital Input Mode",
		DPInfo: "Denon Mainzone Digital Input Mode",
		TypeName: "VARDP",
		ValueMin: 0,
		ValueMax: 2,
		ValueUnit: "",
		ValueType: 16,
		ValueSubType: 29,
		ValueList: "AUTO;PCM;DTS",
		Parent: denonSettings.firstId+02
	};
	if (denonSettings.room_main) {
		chObject75.rooms = denonSettings.room_main;
	}
	if (denonSettings.funcs) {
		chObject75.funcs = denonSettings.funcs;
	}
	if (denonSettings.favs) {
		chObject75.favs = denonSettings.favs;
	}
	setObject(denonSettings.firstId+75, chObject75);}
	
    logger.info("adapter denon objects inserted, starting at: "+denonSettings.firstId);
}

logger.info("adapter denon start");
DenonInit();
setInterval(denonReconnect,10000);