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
            title: "Discord V2",
            error: request.query.errorMSG
        });
    }
});

app.post('/login', async(request, response) => {
    let email = request.body.email;

    let password = request.body.password;
    if ((email == '') || password == '') {
        response.redirect('/login' + '/?errorMSG=User or password not matches!');
        return;
    }
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

//Send profile info to api and return a value from the database, then check what ejs to show
app.get('/profile/:name', async function (req, res) {
    let sessionUserName = req.session.username;
    let currentUserName = req.params.name;

    let result = await fetch(`${apiURL}/getProfileData/${currentUserName}`)
    .then((response => response.json()));
   
    if (sessionUserName === currentUserName) {
        console.log("visa mainprofile");
            if (result.results.length != 0) {
                res.render('./profile.ejs', {
                    "data": result.results
                });
            } else {
                res.send("user does not exist");
            }
    } else if (sessionUserName !== currentUserName) {
        console.log("visa visitorprofile");
            if (result.results.length != 0) {
                res.render('./visitorProfile.ejs', {
                    "data": result.results
                });
            } else {
                res.send("the user you look for does not exist");
            }
    }
})

// GET the data needed to edit the database
app.get('/profile/edituser/:username', async (req, res) => {
    let currentUserName = req.params.username;

    let result = await fetch(`${apiURL}/editProfile/${currentUserName}`)
    .then((response => response.json()));
    if (result.results.length != 0) {
        res.render('editCurrentUser', {
            "data": result.results
        });
    } else {
        res.send("user you want to edit does not exist");
    }
});

//POST the data to Edit the users ... Denna kod kan förbättras(kanske skicka med filnamnet på något sätt)
app.post('/profile/:olduser', async(request, response) => {
    
    try {
        let newUserName = request.body.username;
        let newEmail = request.body.useremail;
        let oldUserName = request.params.olduser;
        let changedData = {
            'username': newUserName,
            'email': newEmail
        }

        if (request.files) {
            let newImageName = request.files.profile_image;
            newImageName.mv('./public/images/' + newImageName.name);
            changedData.profilePicturePath = "/images/" + newImageName.name;
        }

        await fetch(`${apiURL}/editProfileData/${oldUserName}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(changedData)
        }).then((response => response.json())).then(result => {
            if (result.result == "OK") {
                request.session.username = newUserName;
                response.redirect('/profile/' + newUserName);
            } else {
                response.send(result);
            }
        });

        
    } catch (err) {
        response.status(500).send(err);
    }
});

//Send delete info to api and destroy session if it returns with a deleted value
app.get('/profile/deleteuser/:user', async (request, response) => {
    let currentUserName = request.params.user;
    let result = await fetch(`${apiURL}/deleteProfile/${currentUserName}`)
    .then((response => response.json()));

    if(result.results.length !== 0) {
     request.session.destroy();
     response.redirect('/login');
    }else {
        response.redirect('/');
    }  
});



// Chatroom
app.get('/chatroom', function(req, res) {
    res.redirect('chatroom/General');
});

app.get('/chatroom/:room', async function(req, res) {
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
app.get('/dms', function(req, res) {
    res.redirect('chatroom/General');
});

app.get('/dms/:target', function(req, res) {
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
io.on('connection', function(socket) {
    // does stuff when user connects
    socket.on('user-connected', function(room, name, socketID, userId) {
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
        io.emit('status-change', socket.userId, 'Online');
    });

    // does stuff when user connects to private chat
    socket.on('user-connected-private', function(target, name, socketID) {
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
                allMessages.sort(function(a, b) {
                    return new Date(a.dateAndTime) - new Date(b.dateAndTime);
                });

                // sends old messages to the user that just connected
                for (doc of allMessages) {
                    io.to(socketID).emit('private message', doc.senderID, doc.message);
                }
            })
        })
    });

    // add new chat room to database
    socket.on('create-chat-room', function(newChatRoom) {
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
    socket.on('chat message', function(room, data) {
        // store data in database
        db.get('messages').insert({
            'userid': data.userid,
            'chatroomid': room,
            'dateAndTime': new Date(),
            'message': data.message
        }, function(err, data) {
            console.log(data);
        });

        // sends message to client
        io.in(room).emit('chat message', data.userid, data.message);
    });

    // receives private message from client
    socket.on('private message', function(target, data) {
        db.get('private-messages').insert({
            'senderID': data.userid,
            'receiverID': target,
            'dateAndTime': new Date(),
            'message': data.message
        });

        // sends message to client
        io.in(target + data.userid).emit('private message', data.userid, data.message);
        io.in(data.userid + target).emit('private message', data.userid, data.message);
    });

    // does stuff when user disconnects
    socket.on('disconnect', () => {
        io.emit('status-change', socket.userId, 'Offline');

        let dataToSend = {
            userId: socket.userId,
            status: "Offline"
        };

        fetch(`${apiURL}/updateStatus`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataToSend)
        });
    });
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});







server.listen(httpPort);