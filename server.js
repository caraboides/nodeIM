var http = require('http');
var sys = require('util');
var fs = require("fs");
var im = require("./lib/imagemagick.js");

var exec  = require('child_process').exec;


http.createServer(function (request, response) {
        var filename = process.cwd()+'/root'+request.url;
        exec ('file -b  --mime-type '+filename, function (err,stdout,stderr){
                if (err) {
                        
                        response.writeHead(404,{
                                'Content-Type': 'text/plain'
                        });
                        response.write('Hau ab\n');
                        response.end();
                }else {
                            var mime= stdout;
                            response.writeHead(200, {
                                'Content-Type' : mime,
                                'Connection':'close'
                            });
                            var filestream = fs.createReadStream(filename);
                            filestream.pipe(response);
//                            filestream.on('data',function (data) { 
//                                    console.log("data");
//                                 response.write("data");
//                            });
//                            filestream.on('end',function () { 
//                                console.log("end");
//                                response.end();
//                            });
//                            filestream.on('close',function () { 
//                                console.log("close");
//                            });
//                            filestream.on('error',function (exception) {
//                                console.log(exception);
//                                response.end();
//                            });
                                                   
                           
                }
        });
        
}).listen(8124);

console.log('Current directory: ' + process.cwd());
console.log('Server running at http://127.0.0.1:8124/');
