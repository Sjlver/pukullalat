
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')

var app = module.exports = express.createServer();

// ***************************************************************************
// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.logger());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(require('stylus').middleware({ src: __dirname + '/public' }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});


// ***************************************************************************
// Routes

app.get('/', routes.index);

// Highscore management
var highscores = [
    {name: 'ABC', score: 500},
    {name: 'DEF', score: 300},
    {name: 'GHI', score: 100},
];
app.get('/highscores', function(req, res) {
    res.writeHead(200, {'content-type': 'application/json'});
    res.write(JSON.stringify(highscores));
    res.end('\n');
});
app.post('/highscores', function(req, res) {
    console.log("received highscore: ", req.body);

    var score = {name: req.body.name, score: req.body.score};
    if (! /^[A-Z]{3}$/.test(score.name) || ! /^\d{1,5}$/.test(score.score)) {
        res.writeHead(403, {'content-type': 'text/plain'});
        res.end('\n');
    }
    highscores.push(score);
    highscores.sort(function(a, b) {
        if (a.score > b.score) {
            return -1;
        } else if (a.score == b.score) {
            return 0;
        } else {
            return 1;
        }
    });
    highscores.length = 3;

    res.writeHead(200, {'content-type': 'application/json'});
    res.write(JSON.stringify(highscores));
    res.end('\n');
});


// ***************************************************************************
// Get going
app.listen(1612);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
