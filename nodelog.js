//===============================================
// NodeLog Server by Sven Schmalle
//===============================================

// Startzeit
var Startzeit = Date.now();
var LastZeit = new Date().getTime();
// Objectliste der verbundenen Clients
var ClientListe = {};

// Einbinden der Module
"use strict";
var fs 					= require('fs');
var os  				= require('os');
var WebSocketServer 	= require('ws').Server;
var restify 			= require('restify');
var app 				= restify.createServer();
var sprintf 			= require('sprintf').sprintf;

var CFG = {
	SRV_NAME: os.hostname(),
	SRV_PORT: 8000,
};

/******************************************************************************************************************************************************************************************
 *  REST Server
 ******************************************************************************************************************************************************************************************/
app.get('/', respondIndex);
app.get('/log/:text', respondLog);

app.listen(CFG.SRV_PORT, function() {
  console.log('%s listening at %s', 'NodeLog', app.url);
});

function respondIndex(req, res, next) {
	var IndexHTML = fs.readFileSync('index.html');
	IndexHTML = IndexHTML.toString().replace(/%CONNECTION%/gi,CFG.SRV_NAME+':'+CFG.SRV_PORT);
	res.writeHead(200, {'Content-Type': 'text/html;charset=utf-8'});
	res.write(IndexHTML);
	res.end();
  
	return next();
}

function respondLog(req, res, next) {
  
  var diff = new Date().getTime()-LastZeit;
  var t = timediff(new Date().getTime(),LastZeit);
  LastZeit = new Date().getTime();
  res.send('LogText ' + req.params.text);
  console.log('LogText ' + req.params.text);
  SendClients(zeitanzeige()+" |"+t+"| "+ req.params.text);
  return next();
}

/******************************************************************************************************************************************************************************************
 *  Websocket-Server
 ******************************************************************************************************************************************************************************************/
var wss = new WebSocketServer( { server: app, path: '/log' } );
console.log('Server is starting...');

wss.on('connection', function(ws) 
{
	console.log('client connected...');
    ws.on('message', function(message) 
	{
		try
		{
			// Die Objekte sind JSON Serialisiert - in JS muss man diese einfach nut Eval´n		
			json=eval('('+message+')');
				
			// Wenn ein TS_AUTH gesendet wird, muss der Client erstmal registriert werden	
			if(json.ObjectName=="WS_AUTH")
			{
				var AuthMessage = eval('('+json.ObjectMessage+')');
				ClientListe[AuthMessage.GUID] = ws;
				console.log('AUTH client:' + AuthMessage.GUID);
				ws.send('{"ObjectMessage":" AUTH client:'+AuthMessage.GUID+'","ObjectName":"WS_MESSAGE","ObjectReciver":"'+json.ObjectReciver+'"}');
			}
					
			// Wenn ein TS_MESSAGE object kommt, dann an den jenigen schicken zu dem es gehört	
			if(json.ObjectName=="WS_MESSAGE")
			{
				ClientListe[json.ObjectReciver].send(message);
			}
		}
		catch(e)
		{
			console.log('Unbehandelter Fehler: '+e.message);
		}
    });
    
});



/******************************************************************************************************************************************************************************************
 *  Selbst definierte Funktionen für den Websocket-Server
 ******************************************************************************************************************************************************************************************/
function SendClients(Nachricht)
{
	// ClientString an alle angemeldeten Clients senden
	for(k in ClientListe)
	{
		//console.log(ClientListe[k]+' / '+k+' / '+Nachricht);
		ClientListe[k].send('{"ObjectMessage":"'+Nachricht+'","ObjectName":"WS_MESSAGE","ObjectReciver":"'+json.ObjectReciver+'"}');
	}	
}

function zeitanzeige()
{
	d = new Date ();

	h = (d.getHours () < 10 ? '0' + d.getHours () : d.getHours ());
	m = (d.getMinutes () < 10 ? '0' + d.getMinutes () : d.getMinutes ());
	s = (d.getSeconds () < 10 ? '0' + d.getSeconds () : d.getSeconds ());
	n = addZero(d.getMilliseconds(), 3);
	return ("0" + d.getDate()).slice(-2)+'.'+("0" + (d.getMonth() + 1)).slice(-2)+'.'+d.getFullYear()+' - '+h+':'+m+':'+s+':'+n;
}

function addZero(x,n) {
    while (x.toString().length < n) {
        x = "0" + x;
    }
    return x;
}

function timediff(Date1,Date2)
{
	diff = Date1-Date2;
	return sprintf('%07.3f',(diff/1000));	
}