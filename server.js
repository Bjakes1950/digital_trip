// ███████╗███████╗██████╗ ██╗   ██╗███████╗██████╗         ██╗███████╗
// ██╔════╝██╔════╝██╔══██╗██║   ██║██╔════╝██╔══██╗        ██║██╔════╝
// ███████╗█████╗  ██████╔╝██║   ██║█████╗  ██████╔╝        ██║███████╗
// ╚════██║██╔══╝  ██╔══██╗╚██╗ ██╔╝██╔══╝  ██╔══██╗   ██   ██║╚════██║
// ███████║███████╗██║  ██║ ╚████╔╝ ███████╗██║  ██║██╗╚█████╔╝███████║
// ╚══════╝╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝╚═╝  ╚═╝╚═╝ ╚════╝ ╚══════╝
// Dependencies
var express = require('express'),
    io = require('socket.io'),
    mongoose = require('mongoose'),
    // async = require('async'),
    // mongo = require('mongodb').MongoClient,
    hookshot = require('hookshot');

// Set up app with Express framework
var app = express();

// Create server
var server = app.listen(80, function() {
    console.log('Listening on port %d', server.address().port);
});

// Connect DB
mongoose.connect('mongodb://127.0.0.1:27017/DTdb');

var Schema = mongoose.Schema;

var clientsSchema = new Schema({
    cookieUID: String,
    clientId: String,
    clientIp: String,
    gameCode: String,
    timeStart: Number,
    timeEnd: Number,
    coinsCollect: Number,
    maxCoinsCheck: Boolean,
    checkup: Boolean,
});

var Client = mongoose.model('Client', clientsSchema);

var db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function callback () {
    console.log('connected to db', db.name);
});

// service functions
var genCookie = function () {
    var randomNumber=Math.random().toString();
    return randomNumber.substring(2,randomNumber.length);
};
var genRandomFloorBetween = function (min, max) {
    var rand = min - 0.5 + Math.random()*(max-min+1);
    rand = Math.round(rand);
    return rand;
};
var genGameCode = function () {
    var code = genRandomFloorBetween(0, 999999).toString();
    while (code.length < 6) {
        code = '0' + code;
    }
    return code;
};

// TODO: rework check function
var checkClient = function (clients, currentClient) {
    console.log("Handle clients from Array[" + clients.length + "]")
    var IPcounter = 0,
        UIDcounter = 0,
        paymentsCounter = 0,
        timeCounter = 0,
        data = {},
        checkup = null;

    clients.forEach(function(doc, i) {
        if (doc.clientIp === currentClient.clientIp) {
            IPcounter++;
            if (doc.wasPayed) {
                paymentsCounter++;
                timeCounter += (currentClient.timeEnd - doc.timeEnd);
            }
        }
        if (doc.cookieUID === currentClient.cookieUID) {
            UIDcounter++;
            if (doc.wasPayed) {
                paymentsCounter++;
                timeCounter += (currentClient.timeEnd - doc.timeEnd);
            }
        }
        // console.log("handle doc #" + i);
    });
    if (currentClient.maxCoinsCheck === false ||
        IPcounter > 1000 ||
        UIDcounter > 100 ||
        paymentsCounter > 10 ||
        timeCounter/paymentsCounter < 10 * 60 * 1000) {
        checkup = false;
    } else {
        checkup = true;
    }
    console.log('emit socket message in ' + currentClient.gameCode + ' with type paymentCheck, checkup: ' + checkup);
    if(currentClient.gameCode && currentClient.gameCode in socketCodes) {
        socketCodes[currentClient.gameCode].emit('message', {type: 'paymentCheck', checkup: checkup});
    }
    return checkup;
};

var checkCoins = function (timeStart, timeEnd, coinsCollect) {
    var time = (timeEnd - timeStart)/1000,
        maxCoins = calcMaxCoins(time);
    // if client recieve more coins than it may
    return coinsCollect <= maxCoins;
};

var calcMaxCoins = function (time) {
    var speedStart = 1/60,
        acceleration = 1/10000,
        path = 0,
        maxCoins = 0, 
        t = 0.25, // coins position in the tube 
        dt = 0.004, // coins position offset
        n = 10; // number of coins in a row
    path = speedStart * time + acceleration * time * time / 2;

    maxCoins = Math.floor(path / (t + dt * (n - 1)) * 10);
    console.log('time:' + time, 'maxCoins:' + maxCoins, 'path:' + path);
    return maxCoins;
};
var checkUID = function (uid) {};
var checkIp = function (ip) {};

// Configure the app
app.configure(function() {
    app.use(express.cookieParser());
        // set a cookie
    app.use(function (req, res, next) {
        // check if client sent cookie
        var cookie = req.cookies.UID;
        if (cookie === undefined) {
            // no: gen a new cookie
            cookie = genCookie();
            // console.log('cookie have created successfully');
        } else {
            // yes, cookie was already present 
            // console.log('cookie exists', cookie);
        }
        // refresh cookie
        res.cookie('UID', cookie, { maxAge: 900000 });
        next(); // <-- important!
    });

    app.use('/', express.static('assets/'));
    app.use('/webhook', hookshot('refs/heads/master', 'git pull'));
    app.use(/\/m\/#\d{6}/, express.static('assets/'));
});


// Tell Socket.io to pay attention
io = io.listen(server, { log: false });

// Sockets object to save game code -> socked associations
var socketCodes = {};

// When a client connects...
io.sockets.on('connection', function(socket) {
    // Confirm the connection
    socket.emit('welcome', {});

    socket.on('message', function (data) {
        // ...emit a 'message' event to every other socket
        for (var socket in io.sockets.sockets) {
            if (io.sockets.sockets.hasOwnProperty(socket)) {
                if (io.sockets.sockets[socket].gameCode === data.gameCode) {
                    io.sockets.sockets[socket].emit('message', data);
                }
            }
        }
        if (data.type === 'gamestarted') {
            var timeStart = Date.now();
            // update client in clients collection
            Client.findOne({'clientId': data.sessionid}).exec(function(err, client) {
                if (err) {
                    console.log('Error:', err);
                    return;
                }
                if (client) {
                    client.timeStart = timeStart;
                    client.save(function (err) {
                        if (err) console.log("Error: could not save client timeStart");
                    });
                }
            });
        }
        if (data.type === 'gameover') {
            // update client in clients collection
            var timeEnd = Date.now();
            Client.findOne({'clientId': data.sessionid}).exec(function(err, client) {
                if (err) {
                    console.log('Error:', err);
                    return;
                }
                if (client) {
                    client.timeEnd = timeEnd;
                    client.coinsCollect = data.coinsCollect;
                    client.maxCoinsCheck = checkCoins(client.timeStart, timeEnd, data.coinsCollect);
                    client.save(function (err) {
                        if (err) console.log("Error: could not save client timeEnd data", err);
                    });
                }
            });
        }
        if (data.type === 'checkup') {
            Client.findOne({'clientId': data.sessionid}).exec(function(err, client) {
                if (err) {
                    console.log('Error:', err);
                    return;
                }
                if (client) {
                    Client.find({ $or: [{'clientIp': client.clientIp}, {'cookieUID': client.cookieUID}]}).exec(function(err, clients) {
                        if (err) {
                            console.log('Error:', err);
                            return;
                        }
                        // if (!clients) return;
                        client.checkup = checkClient(clients, client);
                        client.save(function (err) {
                            if (err) console.log("Error: could not save client checkup");
                        });
                    });
                }
            });
        }
    });
    
    // Receive the client device type
    socket.on('device', function(data) {
        // if client is a browser game
        if(data.type == 'game') {
            // Generate a code
            var gameCode = genGameCode();
            // Ensure uniqueness
            while(gameCode in socketCodes) {
                gameCode = genGameCode();
            }
            
            // Store game code -> socket association
            socketCodes[gameCode] = io.sockets.sockets[socket.id];
            socket.gameCode = gameCode;
            
            // Tell game client to initialize 
            //  and show the game code to the user
            socket.emit('initialize', gameCode);
            // insert data into MongoDB
            new Client({
                'cookieUID': data.cookieUID,
                'clientId': socket.id,
                'clientIp': socket.handshake.address.address,
                'gameCode': gameCode,
            }).save();

        } else if(data.type == 'controller') { // if client is a phone controller
            // if game code is valid...
            if(data.gameCode in socketCodes) {
                // save the game code for controller commands
                socket.gameCode = data.gameCode;
                // initialize the controller
                socket.emit('connected', {});
                
                // start the game
                if(data.gameCode && data.gameCode in socketCodes) {
                    socketCodes[data.gameCode].emit('connected', {});
                }
                socket.emit('message', {type: 'vibr', time: 100});
            } else {  // else game code is invalid, send fail message and disconnect
                socket.emit('fail', {});
                socket.emit('message', {type: 'vibr', time: 1000});
                socket.disconnect();
            }
        }
    });
    // send accelerate command to game client
    socket.on('accelerate', function(data) {
        var bAccelerate = data.accelerate;
        if(socket.gameCode && socket.gameCode in socketCodes) {
            socketCodes[socket.gameCode].emit('accelerate', bAccelerate);
        }
    });
    // send turn command to game client
    socket.on('turn', function(data) {
        if(socket.gameCode && socket.gameCode in socketCodes) {
            socketCodes[socket.gameCode].emit('turn', data.turn);
        }
    });
    // send click command to game client
    socket.on('click', function(data) {
        if(socket.gameCode && socket.gameCode in socketCodes) {
            socketCodes[socket.gameCode].emit('click', data.click);
        }
    });
    // send start command to game client
    socket.on('start', function(data) {
        if(socket.gameCode && socket.gameCode in socketCodes) {
            socketCodes[socket.gameCode].emit('start', data);
        }
    });
    // send disconnect command to game client
    socket.on('disconnect', function(data) {
        if(socket.gameCode && socket.gameCode in socketCodes) {
            socketCodes[socket.gameCode].emit('disconnectController', data);
        }
    });
});
// When a client disconnects...
io.sockets.on('disconnect', function(socket) {
    // remove game code -> socket association on disconnect
    if(socket.gameCode && socket.gameCode in socketCodes) {
        delete socketCodes[socket.gameCode];
    }
});