/*!
 *  nodeIM
 *  Copyright 2011, Christian Hennig chhennig@gmx.net
 *  Released under  LGPLv3 Licenses.
 *  see http://www.gnu.org/licenses/lgpl.html
 */
var http = require('http');
var sys = require('util');
var fs = require("fs");
var im = require("./lib/imagemagick.js");
var spawn = require('child_process').spawn;
var url = require('url');

// Util functions

// trim11 by  Steven Levithan see http://blog.stevenlevithan.com/archives/faster-trim-javascript
function trim11 (str) { 
	str = str.replace(/^\s+/, '');
	for (var i = str.length - 1; i >== 0; i--) {
		if (/\S/.test(str.charAt(i))) {
			str = str.substring(0, i + 1);
			break;
		}
	}
	return str;
};

String.prototype.trim = function() {return trim11(this);};


var uDef = function (value,defaultValue){
                if(value === undefined ) {
                        return defaultValue;
                }
                return value;
};

var port = (function(){
if(process.env.C9_PORT !== undefined){
    return process.env.C9_PORT;
} else{
        return 8124;
}
})();

    
var doWork = function(request,response,comand,parms,ondata){
    request.on('data', function(fileData) {
            var file = spawn(comand, parms);
            file.stdout.on('data', ondata);
            file.stderr.on('data', function(data) {
                response.writeHead(403, {
                    'Content-Type': 'text/plain'
                });
                response.write(data);
                response.end();
            });
            file.stdin.write(fileData, 'binary');
            file.stdin.end();
        });
}

var mimeType = function(request, response) {
        var comand = 'file';
        var params = ['-biNn0','-'];
        var ondata=  function(data) {
                data +=""; 
                data = data.trim();
                var results = data.split(";");
                var mime = {};
                mime.mimetype = results[0];
                mime.charset = results[1];
                response.writeHead(200, {
                        'Content-Type': 'text/plain'
                });
                response.write(JSON.stringify(mime));
                response.end();
        };
        doWork(request,response,comand,params,ondata);
}

var filePlain = function(request, response) {
        var comand = 'file';
        var params = ['-bNn0','-'];
        var ondata=  function(data) {
                data +=""; 
                data = data.trim()+"";
                var results = data.split(",");
                response.writeHead(200, {
                        'Content-Type': 'text/plain'
                });
                response.write(JSON.stringify(results));
                response.end();
        };
        doWork(request,response,comand,params,ondata);
}


var convertImage = function(request, response,sourceFormat,targetFormat,backgroundColor,compressFactor) {
        backgroundColor = uDef(backgroundColor,'000000');
        compressFactor = uDef(compressFactor,'90');
        var comand = 'convert';
        var params = ['-quality',compressFactor,'-flatten','-background','#'+backgroundColor,sourceFormat+':-',targetFormat+':-'];
        console.log(params);
        var ondata=  function(data) {
               response.writeHead(200, {
                        'Content-Type': 'image/'+targetFormat
                });
                response.write(data,'binary');
                response.end();
        };
        doWork(request,response,comand,params,ondata);
}


  
http.createServer(function(request, response) {
    var parasedUrl = url.parse(request.url,true);
    if (parasedUrl.pathname.length > 1) {
        paths = parasedUrl.pathname.split("/");
        serverFunction = paths[1];
        switch (serverFunction) {
        case "mime":
            if (request.method === 'POST' || request.method === 'PUT') {
                mimeType(request, response);
            }
            else {
                wrongApiCall(response);
            }
            break;
         case "file":
            if (request.method === 'POST' || request.method === 'PUT') {
                filePlain(request, response);
            }
            else {
                wrongApiCall(response);
            }
            break;
         case "convert":
            var parms = parasedUrl.query;
            console.log(parms.source);
            console.log(parms.target);

            if (request.method === 'POST' || request.method === 'PUT') {
                convertImage(request, response,parms.source,parms.target,parms.backgroundcolor,parms.compress);
            }
            else {
                wrongApiCall(response);
            }
            break;
        default:
            wrongApiCall(response);
            break;
        }
    }
    else {
        wrongApiCall(response);
    }
}).listen(8124);
var wrongApiCall = function(response) {
        response.writeHead(303, {
            'Content-Type': 'text/plain',
            'Connection': 'close'
        });
        response.write("Wrong Api Call!");
        response.end();
    };
console.log('Current directory: ' + process.cwd());
console.log('Server running at http://127.0.0.1:8124/');
