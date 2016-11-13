const https = require('https');
const http = require('http');
const querystring = require('querystring');
const zlib= require('zlib');
const fs = require('fs');
const entities = require('entities');

function sendToFlowdock(message) {
    var postData = querystring.stringify({
        "event": "message",
        "content": message,
        "external_user_name": "HELPBOT",
        "flow": "FlowId",
        "tags": ["#AyudaySoporte",":facepunch:"],
        
    });
    
    var options = {
      hostname: 'api.flowdock.com',
      port: 443,
      path: '/messages',
      method: 'POST',
      auth: 'Auth:a',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    var req = https.request(options, (res) => {
      console.log('STATUS: '+res.statusCode);
      console.log('HEADERS: '+JSON.stringify(res.headers));
      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        console.log('BODY: '+chunk);
      });
      res.on('end', () => {
        console.log('No more data in response.');
      });
    });
    
    req.on('error', (e) => {
        console.log("problem with request: "+e.message);
    });
    
    req.write(postData);
    req.end();
    return;
}

var regTitle=RegExp("<span class=\\\"title-span\\\" title=\\\"([^\"]+)\\\">([^<]+)<\\\/span>");
var regDate=RegExp("<span class=\\\"timeago\\\" title=\\\"([0-9]{4})-([0-9]{2})-([0-9]{2})T([0-9]{2}):([0-9]{2}):([0-9]{2}).([0-9]{3})\\+[0-9]{4}\\\">");
var regAuthor=RegExp("<span class='username'>([^<]*)<\\\/span>");
var regLink=RegExp("data-href=\\\"([^\"]*)\"");
var lastDate = new Date(Date.now());
var nextDate = lastDate;

function checkForum(firstRun = false) {
    var options = {
      hostname: 'boards.las.leagueoflegends.com',
      port: 80,
      path: '/api/X54mVVp0/discussions?sort_type=recent',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.87 Safari/537.36 OPR/41.0.2353.56',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        //'Accept-Encoding': 'gzip, deflate, lzma, sdch',
        'Accept-Language': 'es-419,es;q=0.8',
        'Connection': 'keep-alive'
        //'Content-Type': 'application/x-www-form-urlencoded',
        //'Content-Length': Buffer.byteLength(postData)
      }
    };

    var answer ="";    

    

    var req = http.request(options, (res) => {
      //console.log('STATUS: '+res.statusCode);
      //console.log('HEADERS: '+JSON.stringify(res.headers));
      
      //var gzip = zlib.createGunzip();
      //res.pipe(gzip);
      
      res.setEncoding('utf8');
      
      req.setSocketKeepAlive(true);
      res.on('data', (chunk) => {
        //answer+=chunk;
        //console.log(ended++);
        answer+=chunk;
      });
      res.on('end', () => {
        try {
            JSON.parse(answer)['discussions'].split("<\/tr>").forEach( (a) => {
                /// Each post in each a? If we are lucky enough.
                if(!regTitle.test(a)) return;
                var date=regDate.exec(a);
                date=new Date(date[1],date[2]-1,date[3],date[4],date[5],date[6],date[7]);
                if(date<=lastDate) return;
                if(date>nextDate) nextDate=date;
                if(firstRun) return;
                var autor=regAuthor.exec(a)[1];
                var titulo=regTitle.exec(a)[2];
                var resumen=regTitle.exec(a)[1];
                resumen=resumen.split("\n").join("\n>");
                // Sí, dos veces.
                resumen=entities.decodeHTML(resumen);
                resumen=entities.decodeHTML(resumen);
                var enlace="http://boards.las.leagueoflegends.com"+regLink.exec(a)[1];
                sendToFlowdock("**["+titulo+"]("+enlace+")** por **["+autor+"](http://boards.las.leagueoflegends.com/es/player/las/"+encodeURI(autor)+")** en **[Ayuda y Soporte](http://boards.las.leagueoflegends.com/es/c/ayuda-y-soporte)** \n>"+resumen);
                /*console.log("Titulo:"+regTitle.exec(a)[2]);
                console.log("Fecha:"+date);
                console.log("Autor:"+regAuthor.exec(a)[1]);
                console.log("Link:"+"http://boards.las.leagueoflegends.com"+regLink.exec(a)[1]);
                console.log("Resumen:"+regTitle.exec(a)[1]);*/
                //console.log(/<span class=\\"title-span\\" title=\\"([^"]+)\\">([^<]+)<\\\/span>/.exec(a));
                
            });
        } catch(e) {
            console.log("Un error! "+e);
            fs.writeFile("errors/jsonParseError"+Date.now(),answer);
        }
        //console.log("What?");
      });
      req.on('error', (e) => {
        console.log("problem with request: "+e.message);
      });
    });
    lastDate=nextDate;

    //req.write(postData);
    req.end();
    return 0;
}

//http://boards.las.leagueoflegends.com/api/X54mVVp0/discussions
var handler;

function doIt(firstRun = false) {
    console.log("Mirando... "+new Date());
    checkForum(firstRun);
    handler=setTimeout(doIt,30000);
}

doIt(true);
