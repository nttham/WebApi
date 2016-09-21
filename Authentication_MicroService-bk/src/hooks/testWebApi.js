var fs = require('fs'),
    request = require('request');

var download = function(uri, filename, callback){
    request.head(uri, function(err, res, body){
        console.log('content-type:', res.headers['content-type']);
        console.log('content-length:', res.headers['content-length']);

        request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
    });
};

download('https://www.google.com/images/srpr/logo3w.png', 'google.png', function(){
    console.log('done');
});

//var _ = require("underscore");
//
//_.templateSettings = {
//    interpolate: /\/\:(.+?)\//g
//};
//
//var template = _.template("/generate/:path1/validate/:path2");
//var
//var ret = template({name: "/Mustache/"});
//console.log("template "+ret)




var accept = 'image/gif';
console.log(accept.split('/')[0]);
