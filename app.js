// grab the packages we need
var express = require('express');
var formidable = require('formidable')
var path = require('path');
var fs = require('fs');
var parse = require('csv-parse');
var http = require('http');
var async = require('async');
var XLSX = require('xlsx');

var app = express();
var port = process.env.PORT || 3000;

var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// view engine setup
app.engine('html', function (path, opt, fn) {
    fs.readFile(path, 'utf-8', function (error, str) {
        if (error) return str;
        return fn(null, str);
    });
});
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'public'));
app.use('/public', express.static(path.join(__dirname, 'public')));


//====================== Library Function Start ==========================

var notEmpty = function(data) {
    var res = true;
    var dataType = typeof data;
    switch (dataType) {
        case 'object':
        case 'array':
            if (data == null || data.length < 1)
                res = false;
            break;

        case 'undefined':
            res = false;
            break;

        case 'number':
            if (data == "")
                res = false;
            break;
        case 'string':
            if (data.trim() == "")
                res = false;
            break;
    }

    return res;
}

var uniq = function (a) {
    if(notEmpty(a)){
        try {
            return a.sort().filter(function(item, pos, ary) {
                return !pos || item != ary[pos - 1];
            })  
        } catch (error) {
            return a;
        }
        //return a;  
    }else{
        return [];
    }
}

var getMatches = function(string, regex, index) {
  index || (index = 1); // default to the first capturing group
  var matches = [];
  var match;
  while (match = regex.exec(string)) {
    matches.push(match[index]);
  }
  return matches;
}

var socialUrls = function (data) {
    //var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig;
    var urlRegex = /((https?:\/\/)?(www.)?(facebook\.com|twitter\.com|linkedin\.com|pinterest\.com|instagram\.com youtube\.com|soundcloud\.com)\/([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-]))/ig;
    return uniq(data.match(urlRegex));
}

var emails = function (data) {
    var emailRegex = /([a-zA-Z0-9._-]+(@|\(at\)|\(AT\))[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    return uniq(data.match(emailRegex));
}

var phones = function phones(data) {
    //var phoneRegex = /((\(\d{3}\) ?)|(\d{3}-))?\d{3}-\d{4}/gi;
    var phoneRegex = /\b[\s()\d-]{6,}\d\b/gi;
    return uniq(data.match(phoneRegex)).sort(function(a, b){
        // ASC  -> a.length - b.length
        // DESC -> b.length - a.length
        return b.length - a.length;
    });
}

var extractData = function (url, callBack) {    
    var request = http.request(url, function (responce) {
        var data = '';
        responce.on('data', function (chunk) {
            data += chunk;
        });
        responce.on('end', function () {
            var ml = emails(data);
            var pn = phones(data);
            var sul = socialUrls(data);
            //request.end();
            callBack({
                emails: (ml) ? ml.join(', ') : '',
                phones: (pn) ? pn.join(', ') : '',
                social: (sul) ? sul.join(', ') : ''
            })
        });
    });
    request.on('error', function (e) {
        console.log('dfg',e.message);
        request.end();
        callBack({
            emails: '',
            phones: '',
            social: ''
        })
    });
    request.end();    
}

var myUrls = function (url, callback) {
    var domainRegex = /^(?:https?:\/\/)?(?:[^@\n]+@)?(?:www\.)?([^:\/\n]+)/im;
    var domainFound = url.match(domainRegex);
    var myUrlRegex = /href="(\/?([\w.,@?^=%&:\/~+#-]*[\w@?^=%&\/~+#-])\.(html|htm|php|jsp))/ig;
    var request = http.request(domainFound[0], function (responce) {
        var data = '';
        responce.on('data', function (chunk) {
            data += chunk;
        });
        responce.on('end', function () {
            var ml = emails(data);
            var pn = phones(data);
            var sul = socialUrls(data);
            //request.end();
            callback(domainFound[0], getMatches(data,myUrlRegex,1), {
                emails: (ml) ? ml.join(', ') : '',
                phones: (pn) ? pn.join(', ') : '',
                social: (sul) ? sul.join(', ') : ''
            });
        });
    });
    request.on('error', function (e) {
        console.log(e.message);
        request.end();
        callback(domainFound,[],{
            emails: '',
            phones: '',
            social: ''
        });
    });
}

//====================== Library Function End ==========================


app.post('/upload', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        if (typeof files.file != 'undefined') {
            var csvData = [];
            var excelData =  XLSX.readFile(files.file.path);            
            var filename = files.file.name.split('.').slice(0, -1).join('.');
            async.forEachOfSeries(excelData.Sheets[filename], function (value, key, cb) {
                if(key[0] == 'A'){
                    csvData.push({ url: value.v, emails: '', phones: '', social: '' });
                }
                cb();
            }, function (err) {
                res.json({
                    status: 200,
                    data: csvData,
                    message: 'success'
                });
            });

            /*if (files.file.type == 'text/csv') {
                var csvData = [];
                fs.createReadStream(files.file.path)
                    .pipe(parse({ delimiter: ':' }))
                    .on('data', function (csvrow) {
                        csvData.push({ url: csvrow.join(':'), emails: '', phones: '', social: '' });
                    })
                    .on('end', function () {
                        res.json({
                            status: 200,
                            data: csvData,
                            message: 'success'
                        });
                    });
            } else {
                res.json({
                    status: 201,
                    message: 'Please select a CSV file!'
                });
            }*/
        } else {
            res.json({
                status: 201,
                message: 'Please select a CSV file!'
            });
        }
    });
})

app.post('/extract', function (req, res) {
    var url = req.body.url || '';
    var allUrls = req.body.all_url || 0;

    if (url != '') {
        if (allUrls == 0) {
            extractData(url, function (responce) {
                res.json({
                    status: 200,
                    data: responce,
                    message: 'success'
                });
            })
        }else{
            myUrls(url, function (domain, urls, homeData) {
                console.log(domain, urls, homeData);
                var finalData = homeData;
                if(urls.length > 0){
                    async.forEachOfSeries(urls, function (value, key, cb) {
                        var nurl = domain+'/'+value;
                        extractData(nurl, function (responce) {
                            finalData.emails = uniq(finalData.emails.concat(responce.emails));
                            finalData.phones = uniq(finalData.phones.concat(responce.phones));
                            finalData.social = uniq(finalData.social.concat(responce.social));
                            cb();
                        })
                    }, function (err) {
                        res.json({
                            status: 200,
                            data: finalData,
                            message: 'success'
                        });
                    });
                }else{
                    res.json({
                        status: 200,
                        data: finalData,
                        message: 'success'
                    });
                }
            })
        }
    } else {
        res.json({
            status: 200,
            data: {
                emails: '',
                phones: '',
                social: ''
            },
            message: 'success'
        });
    }
})

app.use('/', function (req, res) {
    res.render('layout.html');
});

// start the server
app.listen(port);
console.log('Server started! At http://localhost:' + port);