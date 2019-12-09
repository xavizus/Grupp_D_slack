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
// load fileUpload
const fileUpload = require("express-fileupload");
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
app.use(express.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload({
    createParentPath: true
}));

// make it possible to use database connection elsewhere.
app.use(function (req, res, next) {
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


app.get('/', (request, response) => {
    if (request.session.authenticated) {
        response.redirect('/chatroom');
    } else {
        response.redirect('/login');
    }
});

app.get('/login', (request, response) => {
    if (request.session.authenticated) {
        response.redirect('/chatroom');
    } else {
        response.render('login', {
            title: "Discord V2"
        });
    }
});

app.post('/login', (request, response) => {
    let email = request.body.email;

    let password = request.body.password;

    fetch(`http://localhost:8080/api/v1/getPasswordHash/${email}`)
        .then((response => response.json()))
        .then(json => {
            if (json.result) {
                bcrypt.compare(password, json.result).then(res => {
                    if (res) {
                        // Set data to the session
                        request.session.authenticated = true;

                        fetch(`http://localhost:8080/api/v1/getUserInfo/${email}`)
                            .then(response => response.json())
                            .then(result => {
                                console.log(result);
                                request.session.username = result.result.username;
                                request.session.userID = result.result._id;
                                // Save the session so you can use it later.
                                request.session.save();
                                response.redirect('/chatroom');
                            });
                    } else {
                        response.send("You are unauthorized");
                    }
                });
            } else {
                response.send("Wrong password or username");
            }

        });
});

app.get('/newAccount', (request, response) => {
    response.render('newAccount', {
        title: "Discord V2"
    });
});

app.post('/newAccount', (request, response) => {
    let email = request.body.email;
    let username = request.body.username;
    let password = request.body.password;
    let data = {
        email: email,
        username: username
    };
    bcrypt.genSalt(10, function (err, salt) {
        bcrypt.hash(password, salt, function (err, hash) {
            data.password = hash;
            fetch('http://localhost:8080/api/v1/addUser', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            }).then((response => response.json())).then(result => {
                if (result.result == "OK") {
                    response.redirect('/login');
                } else {
                    response.send(result);
                }
            });
        });
    });
});

// 
app.get('/profile/:name', function (req, res) {
    let nameToShow = req.params.name;
    console.log(nameToShow);
    console.log(req.session.username);
    let db = req.db;
    let usersCollection = db.get('users');
    usersCollection.find({"username": nameToShow}, {}, (err, data) => {
        if (data.length != 0) {
            res.render('./profile.ejs', {
                "data": data
            });
        } else {
            res.send("user does not exist");
        }
    })
})

app.get('/profile/edituser/:username', async function (req, res) {
    var db = req.db;
    var collection = db.get('users');
    //console.log(req.params.username);
    collection.findOne({
        username: req.params.username
    }, function (e, data) {
        //console.log(data);
        res.render('editCurrentUser', {
            "data": data
        });
    });
});

// Chatroom
app.get('/chatroom', function (req, res) {
    res.redirect('chatroom/General');
});

app.get('/chatroom/:room', function (req, res) {
    //Spara loginnamn i variabel och skicka med den i view
    let currentUser = req.session.username;
    // checks if the chatroom the user is trying to access exists
    db.get('chatrooms').findOne({
        roomname: req.params.room
    }).then((docs) => {
        if (docs == null) {
            return res.redirect('/chatroom/General');
        } else {
            db.get('chatrooms').find({}).then((docs) => {
                res.render('chatroom', {
                    'chatrooms': docs,
                    roomName: req.params.room,
                    currentUser : currentUser
                });
            });
        }
    });
});

// WebSocket
io.on('connection', function (socket) {
    // does stuff when user connects
    socket.on('user-connected', function (room, name) {
        socket.join(room);

        // sends old chatroom messages from database to client
        db.get('messages').find({
            chatroomid: room
        }).then((docs) => {
            for (doc of docs) {
                // TODO: only send to user that just connected
                io.in(room).emit('chat message', doc.message);
            }
        });
    });

    // add new chat room to database
    socket.on('create-chat-room', function (newChatRoom) {
        db.get('chatrooms').insert(newChatRoom);
    });

    // receives message data from client
    socket.on('chat message', function (room, data) {
        // store data in database
        db.get('messages').insert({
            'userid': data.userid,
            'chatroomid': room,
            'date': new Date().toLocaleDateString('sv'),
            'time': new Date().toLocaleTimeString('sv', {
                hour: '2-digit',
                minute: '2-digit'
            }),
            'message': data.message
        });

        // sends message to client
        io.in(room).emit('chat message', data.message);
    });

    // does stuff when user disconnects
    socket.on('disconnect', function (room, name) {
        // maybe something here...
    });
});

//Edit user
app.post('/profile/:olduser', async (request, response) => {
    let db = request.db;
    let userTabell = db.get('users');

    try {
        if (!request.files) {
            //Om ingen bild skickas med gör något
            response.send(404);

        } else {
            //Om en bild skickas med, edita i databas och lägg till bild i bildmapp.
            let newUserName = request.body.username;
            let newEmail = request.body.useremail;
            let oldUserName = request.params.olduser;
            let newImageName = request.files.profile_image;
            newImageName.mv('./public/images/' + newImageName.name);
            userTabell.update({
                'username': oldUserName
            }, {
                $set: {
                    'username': newUserName,
                    'email': newEmail,
                    'profilePicturePath': "/images/" + newImageName.name
                }
            }, (err, item) => {
                if (err) {
                    // If it failed, return error
                    response.send("There was a problem adding the information to the database.");
                } else {
                    //profile_pic.mv('./images/' + profile_pic.name);
                    response.redirect("/profile/" + newUserName);
                }
            });
        }

    } catch (err) {
        response.status(500).send(err);
    }

});

//Delete user
app.get('/profile/deleteuser/:user', (request, response) => {
    let db = request.db;
    let userTabell = db.get('users');

    let userToDelete = request.params.user;
    console.log(userToDelete);
    userTabell.findOneAndDelete({
        'username': userToDelete
    }, (err, item) => {
        if (err) {
            // If it failed, return error
            response.send("There was a problem adding the information to the database.");
        } else {
            // And forward to success pages
            response.redirect("/login");
        }
    })
});



server.listen(8080);