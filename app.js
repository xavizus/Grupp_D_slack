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

// Server port
let httpPort = process.env.npm_package_config_port || 8080;
let apiURL = `http://localhost:${httpPort}/api/v1`

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

app.post('/login', async (request, response) => {
    let email = request.body.email;

    let password = request.body.password;

    let data = await fetch(`${apiURL}/getPasswordHash/${email}`)
        .then((response => response.json()));
    if (data.result) {
        let hashedPassword = await bcrypt.compare(password, data.result);
        if (hashedPassword) {
            // Set data to the session
            request.session.authenticated = true;
            let userInfoData = await fetch(`${apiURL}/getUserInfo/${email}`)
                .then((response => response.json()));
            request.session.username = userInfoData.result.username;
            request.session.userId = userInfoData.result._id;

            let dataToSend = {
                userId: request.session.userId,
                status: "Online"
            };

            let receivedData = await fetch(`${apiURL}/updateStatus`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            });

            if (!receivedData.result == "OK") {
                response.send(receivedData.message);
            }
            // Save the session so you can use it later.
            request.session.save();
            response.redirect('/chatroom');

        } else {
            response.send("You are unauthorized");
        }
    } else {
        response.send("Wrong password or username");
    }
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
    bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(password, salt, (err, hash) => {
            data.password = hash;
            fetch(`${apiURL}/addUser`, {
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
app.get('/profile/:name', async function (req, res) {
    let sessionUserName = req.session.username;
    let currentUserNAme = req.params.name;
    let db = req.db;
    let usersCollection = db.get('users');

    if (sessionUserName === currentUserNAme) {
        console.log("visa mainprofile");
        usersCollection.find({
            "username": currentUserNAme
        }, {}, (err, data) => {

            if (data.length != 0) {
                res.render('./profile.ejs', {
                    "data": data
                });
            } else {
                res.send("user does not exist");
            }
        })

    } else if (sessionUserName !== currentUserNAme) {
        console.log("visa visitorprofile");
        usersCollection.find({
            "username": currentUserNAme
        }, {}, (err, data) => {
            if (data.length != 0) {
                res.render('./visitorProfile.ejs', {
                    "data": data
                });

            } else {
                res.send("user does not exist");
            }
        })
    }
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

app.get('/chatroom/:room', async function (req, res) {
    // checks if the chatroom the user is trying to access exists
    if (!req.session.authenticated) {
        res.redirect('/login');
    }
    // Get all current status.
    let allUsersStatuses = await fetch(`${apiURL}/status`)
        .then(response => response.json());

    // checks if the chatroom the user is trying to access (/:room) exists
    db.get('chatrooms').findOne({
        roomname: req.params.room
    }).then((result) => {
        if (result == null) {
            return res.redirect('/chatroom/General');
        } else {
            // gets chatrooms from database
            db.get('chatrooms').find({}).then((chatRooms) => {
                // render the page
                res.render('chatroom', {
                    'chatrooms': chatRooms,
                    roomName: req.params.room,
                    currentUser: req.session.username,
                    userId: req.session.userId,
                    usersStatuses: allUsersStatuses.result
                });
            });
        }
    });
});

// Direct messages
app.get('/dms', function (req, res) {
    res.redirect('chatroom/General');
});

app.get('/dms/:target', function (req, res) {
    // check if user (/:target) exists
    db.get('users').findOne({
        username: req.params.target
    }).then((result) => {
        if (result == null) {
            return res.redirect('/chatroom/General');
        } else {
            // gets users from database
            db.get('users').find({}).then((users) => {
                // gets chatrooms from database
                db.get('chatrooms').find({}).then((chatRooms) => {
                    res.render('dms', {
                        // render the page
                        'chatrooms': chatRooms,
                        target: req.params.target,
                        currentUser: req.session.username,
                        allUsers: users
                    });
                });
            });
        }
    });
});

// WebSocket
io.on('connection', function (socket) {
    // does stuff when user connects
    socket.on('user-connected', function (room, name, socketID, userId) {
        socket.userId = userId;
        socket.join(room);
        // sends old chatroom messages from database to client
        db.get('messages').find({
            chatroomid: room
        }).then((docs) => {
            for (doc of docs) {
                // sends old messages to the user that just connected
                io.to(socketID).emit('chat message', doc.userid, doc.message);
            }
        });
       io.emit('status-change', socket.userId,'Online');
    });

    // does stuff when user connects to private chat
    socket.on('user-connected-private', function (target, name, socketID) {
        socket.join(name + target);

        // gets old messages sent by user
        db.get('private-messages').find({
            senderID: name,
            receiverID: target
        }).then((user_messages) => {
            // gets old messages sent by target
            db.get('private-messages').find({
                senderID: target,
                receiverID: name
            }).then((target_messages) => {
                // combine messages to one array
                let allMessages = user_messages.concat(target_messages)

                // sort array by time
                allMessages.sort(function (a, b) {
                    return Number(a.time.replace(/:/g, '')) - Number(b.time.replace(/:/g, ''));
                });

                // sort array by date
                allMessages.sort(function (a, b) {
                    return Number(a.date.replace(/-/g, '')) - Number(b.date.replace(/-/g, ''));
                });

                // sends old messages to the user that just connected
                for (doc of allMessages) {
                    io.to(socketID).emit('private message', doc.senderID, doc.message);
                }
            })
        })
    });

    // add new chat room to database
    socket.on('create-chat-room', function (newChatRoom) {
        // checks if chat room already exists
        db.get('chatrooms').findOne({
            roomname: newChatRoom.roomname
        }).then((result) => {
            if (result == null) {
                db.get('chatrooms').insert(newChatRoom);
                socket.emit('create-status', 'Chat room was created, refresh page')
            } else {
                socket.emit('create-status', 'A room with this name already exists')
            }
        });
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
        io.in(room).emit('chat message', data.userid, data.message);
    });

    // receives private message from client
    socket.on('private message', function (target, data) {
        db.get('private-messages').insert({
            'senderID': data.userid,
            'receiverID': target,
            'date': new Date().toLocaleDateString('sv'),
            'time': new Date().toLocaleTimeString('sv', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            }),
            'message': data.message
        });

        // sends message to client
        io.in(target + data.userid).emit('private message', data.userid, data.message);
        io.in(data.userid + target).emit('private message', data.userid, data.message);
    });

    // does stuff when user disconnects
    socket.on('disconnect', (userId, status) => {
        io.emit('status-change', socket.userId, 'Offline');
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

//Edit user ... Denna kod kan förbättras(kanske skicka med filnamnet på något sätt)
app.post('/profile/:olduser', async (request, response) => {
    let db = request.db;
    let userTabell = db.get('users');


    try {
        if (!request.files) {
            console.log("ingen bild skickades med");
            //Om ingen bild skickas med, uppdatera inte bilden

            let newUserName = request.body.username;
            let newEmail = request.body.useremail;
            let oldUserName = request.params.olduser;
            request.session.username = newUserName;
            request.session.email = newEmail;
            console.log(request.session.username);
            userTabell.update({
                'username': oldUserName
            }, {
                $set: {
                    'username': newUserName,
                    'email': newEmail
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
        } else {
            console.log("en bild skickades med");
            //Om en bild skickas med, edita i databas och lägg till bild i bildmapp.

            let newImageName = request.files.profile_image;
            let newUserName = request.body.username;
            let newEmail = request.body.useremail;
            let oldUserName = request.params.olduser;
            request.session.username = newUserName;
            request.session.email = newEmail;
            console.log(request.session.username);
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



server.listen(httpPort);