/*
 *  nodeIM
 *  Copyright 2011, Christian Hennig chhennig@gmx.net
 *  Released under  LGPLv3 Licenses.
 *  see http://www.gnu.org/licenses/lgpl.html
 */
var http = require('http');
var sys = require('util');
var fs = require("fs");
var spawn = require('child_process').spawn;
var multipart = require('multipart-stack');
var url = require('url');
var temp = require('temp');

// Util functions

// trim11 by  Steven Levithan see http://blog.stevenlevithan.com/archives/faster-trim-javascript
function trim11 (str) { 
    str = str.replace(/^\s+/, '');
    
    for (var i = str.length-1 ; i >= 0; i--) {
        if (/\S/.test(str.charAt(i))) {
            str = str.substring(0, i + 1);
            break;
        }
    }
    return str;
};

String.prototype.trim = function() {
    return trim11(this);
};


var uDef = function (value,defaultValue){
    return value === undefined ?defaultValue:value;
};

var port = uDef(process.env.C9_PORT,8124);

    
var doWork = function(request,response,comand,parms,ondata){
    var file = spawn(comand, parms);
    file.stdout.on('data', ondata);
    file.stdout.on('end',function(){
        response.end();
    });
    file.stderr.on('data', function(data) {
        response.writeHead(403, {
            'Content-Type': 'text/plain'
        });
        response.write(data);
        response.end();
    });
    if(request!==undefined){
        request.on('data', function(fileData) {
            file.stdin.write(fileData, 'binary');
        });
        request.on('end', function() {
            file.stdin.end();
        });
    }
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
                
    };
    doWork(request,response,comand,params,ondata);
}


var convertImage = function(request, response,sourceFormat,targetFormat,backgroundColor,compressFactor) {
    backgroundColor = uDef(backgroundColor,'ffffff');
    compressFactor = uDef(compressFactor,'90');
    var comand = 'convert';
    var params = ['-quality',compressFactor,'-flatten','-background','#'+backgroundColor,sourceFormat+':-',targetFormat+':-'];
    var headerBuilder = function(){
        response.writeHead(200, {
            'Content-Type': 'image/'+targetFormat
        });
        return undefined;
    }
    var ondata=  function(data) {
        if(headerBuilder!==undefined){
            headerBuilder =    headerBuilder();
        }
        response.write(data,'binary');
    };
    doWork(request,response,comand,params,ondata);
}

var displayform = function (res) {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.end(
        '<form action="/merge?geometry=10x10&targettype=jpg" method="post" enctype="multipart/form-data">'+
        '<input type="file" name="upload1-file">'+
        '<input type="file" name="upload2-file">'+
        '<input type="submit" value="Upload">'+
        '</form>'
        );
}

var compositeImage =  function(request, response,parms) {
    var fileOne =undefined;
    var fileTwo =undefined;
    var parsed = multipart.parseContentType(request.headers['content-type']);
    if (parsed.type === 'multipart') {
        var parser = new multipart.Parser(request, parsed.boundary);
        parser.on('part', function(part) {
            //console.log("part");
            // Fired once for each individual part of the multipart message.
            // 'part' is a ReadableStream that also emits a 'headers' event.
            var partInfo;
             
            part.on('headers', function(headers) {
                console.log( headers);
               partInfo = temp.openSync( {prefix: "nodeIM", suffix: headers['Content-Type'].replace(/\//,'.')});
            });
            part.on('data', function(chunk) {
                fs.write(partInfo.fd, chunk);
            });
            part.on('end', function() {
                fs.closeSync(partInfo.fd, function(err) {
                    if (err) throw err;
                   
                });
                    if (fileOne === undefined) {
                        fileOne = partInfo.path;
                        return;
                    }
                    fileTwo = partInfo.path; 
            });
        });
        var headerBuilder = function(){
            response.writeHead(200, {
              //  'Content-Type': 'text/plain'
             'Content-Type': 'image/'+parms.targettype
            });
            return undefined;
        }
        var ondata=  function(data) {
            if(headerBuilder!==undefined){
                headerBuilder =    headerBuilder();
            }
            console.log(data);
            response.write(data);
        };
        request.on('end', function() {
            console.log("parser end "+fileOne+" "+fileTwo);

            var comand = 'composite';
            var params = ['-geometry',parms.geometry,fileOne,fileTwo,parms.targettype+':-'];
            doWork(undefined,response,comand,params,ondata);
        });
    
    } else {
        wrongApiCall(response);
    }
}


  
http.createServer(function(request, response) {
    var parasedUrl = url.parse(request.url,true);
    if (parasedUrl.pathname.length > 1) {
        var paths = parasedUrl.pathname.split("/");
        var serverFunction = paths[1];
        var parms = parasedUrl.query;
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
                            
                if (request.method === 'POST' || request.method === 'PUT') {
                    convertImage(request, response,parms.sourcetype,parms.targettype,parms.background,parms.quality);
                }
                else {
                    wrongApiCall(response);
                }
                break;
            case "merge":
                if (request.method === 'POST' || request.method === 'PUT') {
                    compositeImage(request, response,parms);
                }
                else {
                    wrongApiCall(response);
                }
                break;
            case "mergetest":
                displayform(response);
                break;
            default:
                wrongApiCall(response);
                break;
        }
    }
    else {
        wrongApiCall(response);
    }
}).listen(port);
var wrongApiCall = function(response) {
    response.writeHead(303, {
        'Content-Type': 'text/plain',
        'Connection': 'close'
    });
    response.write("Wrong Api Call!\n");
    response.write("try on of this:\n");
    response.write("/mime  mimetype of post file\n");
    response.write("/file  output of file -bNn0\n");
    response.write("/convert convert the given image to target type params: sourcetype, targettype, backgound ( #000000 ) , quality (1-100)\n");
    response.write("/crop come soon \n");
    response.write("/merge send to image as multipart params: geometry, targettype come soon \n");
    response.write("/scale come soon\n");
    response.write("/optipng come soon\n");
    response.write("/optijpg come soon\n");

    response.end();
};
console.log('Current directory: ' + process.cwd());
console.log('Server running at http://127.0.0.1:'+port);
