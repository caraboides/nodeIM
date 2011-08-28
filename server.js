var http = require('http');
var sys = require('util');
var fs = require("fs");
var im = require("./lib/imagemagick.js");
var spawn = require('child_process').spawn;
var url = require('url');

var port = (function(){
if(process.env.C9_PORT !== undefined){
    return process.env.C9_PORT;
} else{
        return 8124;
}
})();


var mimeType = function(request, response) {
        request.on('data', function(fileData) {
            var file = spawn('file', ['-biN','-']);
            file.stdout.on('data', function(data) {
                data +="";
                console.log("Data: " + (typeof data));
                var results = data.split(";");
                var mime = {};
                mime.mimetype = results[0];
                mime.charset = results[1];
                response.writeHead(200, {
                    'Content-Type': 'text/plain'
                });
                response.write(JSON.stringify(mime));
                response.end();
            });
            file.stderr.on('data', function(data) {
                response.writeHead(200, {
                    'Content-Type': 'text/plain'
                });
                response.write(data);
                response.end();
            });
            file.stdin.write(fileData, 'binary');
            file.stdin.end();
        });
    };
http.createServer(function(request, response) {
    parasedUrl = url.parse(request.url);
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
