// load express
let express = require('express');
// load path
let path = require('path');
// load cookieparser
let cookieParser = require('cookie-parser');
// load morgan (logging)
let logger = require('morgan');
// load route for api
let apiRouter = require('./routes/api');
// load monk (Database helper)
let monk = require('monk');
// load bcrypt
let bcrypt = require('bcryptjs');
// load fetch
let fetch = require("node-fetch");
// load sessions
let session = require('express-session');
// load MongoDBStore (For sessions)
let MongoDBStore = require('connect-mongodb-session')(session);
// Initialize express
let app = express();

let server = require('http').Server(app);
// load socket for chatrooms
let io = require('socket.io')(server);

//load environment configs from file .env 
require('dotenv').config({
    path: __dirname + '/.env'
});

let mongoDB_URI = `${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_SERVER}/${process.env.MONGODB_DATABASE}?authSource=${process.env.MONGODB_DATABASE}&w=1`
// Monk DB-connection
const db = monk(mongoDB_URI);

let store = new MongoDBStore({
    uri: `mongodb://${mongoDB_URI}`,
    collection: 'clientSessions'
  });

// view engine setup
app.use(express.static("views"));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// make it possible to use database connection elsewhere.
app.use(function(req, res, next) {
    req.db = db;
    next();
});

// Creates sessions.
app.use(require('express-session')({
    secret: process.env.SESSION_SECRET,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
    },
    store: store,
    resave: true,
    saveUninitialized: true
  }));

// create route for our api
app.use('/api/v1', apiRouter);

app.get('/login', (request, response) => {
    if(request.session.authenticated) {
        response.send("You are already authenticated!");
    }
    else {
        response.render('login', { title: "Discord V2" });
    }
});

app.post('/login', (request, response) => {
    let email = request.body.email;

    let password = request.body.password;

    fetch(`http://localhost:8080/api/v1/getPasswordHash/${email}`)
        .then((response => response.json()))
        .then(json => {
            if(json.result){
                bcrypt.compare(password, json.result).then(res => {
                    if (res) {
                        response.send("You have been authenticated");
                        // Set data to the session
                        request.session.authenticated = true;
                        // Save the session so you can use it later.
                        request.session.save();
                    } else {
                        response.send("You are unauthorized");
                    }
                });
            } else {
                response.send("Wrong password or username");
            }
            
        });
});

app.get('/newUser', (request, response) => {
    response.render('newUser', { title: "Discord V2" });
});

app.get('/profile/:name', function(req, res) {
    let nameToFind = req.params.name;

    let db = req.db;

    let usersCollection = db.get('users');
    usersCollection.find({ "username": nameToFind }, {}, (err, data) => {
        console.log(data);
        res.render('./profile.ejs', { "data": data });
    });
});

app.get('/chatroom', function (req, res) {
    res.render('chatroom');
    let db = req.db;
    let collection = db.get('messages');

io.on('connection', function (socket) {
    socket.on('chat message', function (msg) {
        collection.insert({
            'message': msg
        });
        io.emit('chat message', msg);
    });
});
});

app.get('/login', (request, response) => {
    response.render('login', { title: "Discord V2" });
});
server.listen(8080);