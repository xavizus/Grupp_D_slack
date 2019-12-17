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
// URL to api.
let apiURL = `http://localhost:${httpPort}/api/v1`

// MongoDB URI
let mongoDB_URI = `${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_SERVER}/${process.env.MONGODB_DATABASE}?authSource=${process.env.MONGODB_DATABASE}&w=1`

// Monk DB-connection
const db = monk(mongoDB_URI);

// Datastore for Session (Store session in MongoDB)
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

// make it possible to use database connection in requests.
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

// Root URL
app.get('/', (request, response) => {
    if (request.session.authenticated) {
        response.redirect('/chatroom');
    } else {
        response.redirect('/login');
    }
});

// Login url
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

// POST login
app.post('/login', async (request, response) => {

    let email = request.body.email;

    let password = request.body.password;

    // if any are empty
    if ((email == '') || password == '') {
        response.redirect('/login' + '/?errorMSG=User or password not matches!');
        return;
    }

    // get password hash and prase it to json.
    let data = await fetch(`${apiURL}/getPasswordHash/${email}`)
        .then((response => response.json()));

    // If we got data bak.
    if (data.result) {
        // Compare the hashed password with the password that was given.
        let hashedPassword = await bcrypt.compare(password, data.result);
        // if the hashPassword are correct
        if (hashedPassword) {
            // mark the user as authenticated.
            request.session.authenticated = true;

            // get user info
            let userInfoData = await fetch(`${apiURL}/getUserInfo/${email}`)
                .then((response => response.json()));

            // Store the returned user info in our session
            request.session.username = userInfoData.result.username;
            request.session.userId = userInfoData.result._id;
            request.session.userRole = userInfoData.result.userRole;
            console.log(request.session.userRole);

            // Prepare post request to api.
            let dataToSend = {
                userId: request.session.userId,
                status: "Online"
            };

            // update the status for the user that just logged in.
            let receivedData = await fetch(`${apiURL}/updateStatus`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSend)
            }).then(response => response.json());
            // if we did not recive an OK message, respond with error message.
            if (!receivedData.result == "OK") {
                response.send(receivedData.message);
            }
            // Save the session
            request.session.save();

            response.redirect('/chatroom');

        } else {
            response.send("You are unauthorized");
        }
    } else {
        response.send("Wrong password or username");
    }
});

// get-request for new account
app.get('/newAccount', (request, response) => {
    response.render('newAccount', {
        title: "Discord V2"
    });
});

// post-request for new account
app.post('/newAccount', (request, response) => {

    // store the data in variables.
    let email = request.body.email;
    let username = request.body.username;
    let password = request.body.password;

    // Prepare post request
    let data = {
        email: email,
        username: username
    };
    // generate a salt for passowrd
    bcrypt.genSalt(10, (err, salt) => {
        // Hash the password.
        bcrypt.hash(password, salt, (err, hash) => {
            // add the hashed passowrd to the post request object
            data.password = hash;

            // POST data to API.
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
    let sessionUserRole = req.session.userRole;

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
    }
     else if (sessionUserName !== currentUserName) {
        if (result.results.length != 0) {
            if(sessionUserRole == "admin") {
                console.log("visa adminview");
                res.render('./adminView.ejs', {
                    "data": result.results
                });
            }else if(sessionUserRole == null || sessionUserRole == "normalUser") {
                console.log("visa visitorprofile");
                res.render('./visitorProfile.ejs', {
                    "data": result.results
                });
            }
        } else {
            res.send("the user you look for does not exist");
        }
    }
})

// GET the data needed to edit the user
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

//POST the data to Edit the users, check if username doesnt exist
app.post('/profile/:olduser', async (request, response) => {
    let db = request.db;
    let usersCollection = db.get('users');  
    let oldUserName = request.params.olduser;

    usersCollection.findOne({
        username: request.body.username
    }, (err, data) => {
        if(data === null) {
            console.log("detta användarnamn kan användas");
            try {
                let newUserName = request.body.username;
                let newEmail = request.body.useremail;
                let changedData = {
                    'username': newUserName,
                    'email': newEmail
                }
        
                if (request.files) {
                    let newImageName = request.files.profile_image;
                    newImageName.mv('./public/images/' + newImageName.name);
                    changedData.profilePicturePath = "/images/" + newImageName.name;
                }
        
                fetch(`${apiURL}/editProfileData/${oldUserName}`, {
                    method: 'PUT',
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
        } else {
            console.log("Denna användare finns redan");
            response.redirect('/profile/' + oldUserName);
        }
    });
    
});

//Send delete info to api and destroy session if it returns with a deleted value
app.get('/profile/deleteuser/:user', async (request, response) => {
    let currentUserName = request.params.user;
    let result = await fetch(`${apiURL}/deleteProfile/${currentUserName}`)
        .then((response => response.json()));

    if (result.results.length !== 0) {
        request.session.destroy();
        response.redirect('/login');
    } else {
        response.redirect('/');
    }
});



// Chatroom
app.get('/chatroom', function (req, res) {
    res.redirect('chatroom/General');
});

app.get('/chatroom/:room', async function (req, res) {
    // checks if user is authenticated
    if (!req.session.authenticated) {
        res.redirect('/login');
    }

    // Prepare post request to api.
    let dataToSend = {
        userId: request.session.userId,
        status: "Online"
    };

    // update the status for the user that just logged in.
    fetch(`${apiURL}/updateStatus`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
    }).then(response => response.json());

    // Get all current status.
    let allUsersStatuses = await fetch(`${apiURL}/status`)
        .then(response => response.json());

    // checks if the chatroom the user is trying to access (/:room) exists
    let chatRoom = await fetch(`${apiURL}/findChatRoom/${req.params.room}`)
        .then(response => response.json());

    if (chatRoom.result == null) {
        return res.redirect('/chatroom/General');
    } else {
        // get list of all chat rooms
        let chatRoomList = await fetch(`${apiURL}/getAllChatRooms`)
            .then(response => response.json());
        console.log(req.session.userId)

        // render the page
        res.render('chatroom', {
            'chatrooms': chatRoomList.results,
            target: '',
            roomName: req.params.room,
            currentUser: req.session.username,
            userId: req.session.userId,
            usersStatuses: allUsersStatuses.result
        });
    }
});

// Direct messages
app.get('/dms', function (req, res) {
    res.redirect('chatroom/General');
});

app.get('/dms/:target', async function (req, res) {
    // checks if user is authenticated
    if (!req.session.authenticated) {
        res.redirect('/login');
    }

    // Get all current status.
    let allUsersStatuses = await fetch(`${apiURL}/status`)
        .then(response => response.json());

    // check if user (/:target) exists
    let user = await fetch(`${apiURL}/findUser/${req.params.target}`)
        .then(response => response.json());
    console.log(user.result._id);

    if (user.result == null) {
        return res.redirect('/chatroom/General');
    } else {
        // get list of all chat rooms
        let chatRoomList = await fetch(`${apiURL}/getAllChatRooms`)
            .then(response => response.json());

        // render the page
        res.render('chatroom', {
            'chatrooms': chatRoomList.results,
            target: user.result._id,
            roomName: '',
            currentUser: req.session.username,
            userId: req.session.userId,
            usersStatuses: allUsersStatuses.result
        });
    }
});

// WebSocket
io.on('connection', function (socket) {
    // does stuff when user connects
    socket.on('user-connected', async function (room, name, socketID, userId) {
        socket.userId = userId;
        socket.join(room);

        

        // sends old chatroom messages from database to client
        let oldMessages = await fetch(`${apiURL}/getMessages/${room}`)
            .then(response => response.json());

        // sorts messages by time and date
        oldMessages.results.sort(function (a, b) {
            return new Date(a.dateAndTime) - new Date(b.dateAndTime);
        });

        for (doc of oldMessages.results) {
            await fetch(`${apiURL}/getUser/${doc.userid}`)
            .then(response => response.json()).then((userData) => {
                // sends old messages to the user that just connected
                io.to(socketID).emit('chat message', userData.result.username, doc.message, doc._id, userData.result.profilePicturePath);
            });
        }

        io.emit('status-change', socket.userId, 'Online');
    });

    // does stuff when user connects to private chat
    socket.on('user-connected-private', async function (target, name, socketID, userId) {
        socket.userId = userId;
        socket.join(userId + target);



        // get old messages sent by user
        let userPrivateMessages = await fetch(`${apiURL}/getPrivateMessages/${userId}/${target}`)
            .then(response => response.json());

        // get old messages sent by receiver
        let targetPrivateMessages = await fetch(`${apiURL}/getPrivateMessages/${target}/${userId}`)
            .then(response => response.json());

        // combine messages to one array
        let allMessages = userPrivateMessages.results.concat(targetPrivateMessages.results);

        // sort array by time and date
        allMessages.sort(function (a, b) {
            return new Date(a.dateAndTime) - new Date(b.dateAndTime);
        });

        // sends old messages to the user that just connected
        for (doc of allMessages) {
            await fetch(`${apiURL}/getUser/${doc.senderID}`)
            .then(response => response.json()).then((userData) => {
                // sends old messages to the user that just connected
                
                io.to(socketID).emit('chat message', userData.result.username, doc.message, doc._id, userData.result.profilePicturePath);
            });
        }

        io.emit('status-change', socket.userId, 'Online');
    });

    // add new chat room to database
    socket.on('create-chat-room', async function (newChatRoom) {
        // checks if chat room already exists
        let chatRoom = await fetch(`${apiURL}/findChatRoom/${newChatRoom.roomname}`)
            .then(response => response.json());

        if (chatRoom.result == null) {
            await fetch(`${apiURL}/createChatRoom`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(newChatRoom)
                })
                .then(response => response.json()).then(result => {
                    if (result.response == "OK") {
                        socket.emit('create-status', 'Chat room was created, refresh page');
                    } else {
                        socket.emit('create-status', 'There was a promblem when creating the room');
                    }
                });
        } else {
            socket.emit('create-status', 'A room with this name already exists')
        }
    });

    // receives message data from client
    socket.on('chat message', async function (room, data) {
        let messageObject = {
            userid: data.userid,
            chatroomid: room,
            dateAndTime: new Date(),
            message: data.message
        }

        let user = await fetch(`${apiURL}/getUser/${data.userid}`)
            .then(response => response.json());
            //console.log(user);
            
        await fetch(`${apiURL}/addMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageObject)
            })
            .then(response => response.json()).then(data => {
                if (data.response == "OK") {
                    let messageObj = data.result;
                    io.in(room).emit('chat message', user.result.username, messageObj.message, messageObj._id, user.result.profilePicturePath);
                } else {
                    console.log('Something went wrong');
                }
            });
    });

    // receives private message from client
    socket.on('private message', async function (target, data) {

        let messageObject = {
            senderID: data.userid,
            receiverID: target,
            dateAndTime: new Date(),
            message: data.message
        }

        let sender = await fetch(`${apiURL}/getUser/${data.userid}`)
            .then(response => response.json());
            console.log(sender.result.username)

        await fetch(`${apiURL}/addPrivateMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageObject)
            })
            .then(response => response.json()).then(msgData => {
                if (msgData.response == "OK") {
                    let msgObj = msgData.result;

                    // sends message to client
                    if (data.userid == target) {
                        io.in(data.userid + target).emit('chat message', sender.result.username, msgObj.message, msgObj._id, sender.result.profilePicturePath);
                    } else {
                        io.in(target + data.userid).emit('chat message', sender.result.username, msgObj.message, msgObj._id, sender.result.profilePicturePath);
                        io.in(data.userid + target).emit('chat message', sender.result.username, msgObj.message, msgObj._id, sender.result.profilePicturePath);
                    }
                } else {
                    console.log('Something went wrong');
                }
            });
    });

    // edit message
    socket.on('edit-message', async (message, messageID, messageType) => {
        let messageObject = {
            _id: messageID,
            message: message,
            messageType: messageType
        }

        await fetch(`${apiURL}/editMessage`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageObject)
            })
            .then(response => response.json()).then(data => {
                if (data.response == "OK") {
                    console.log('Good');
                } else {
                    console.log('Something went wrong');
                }
            });
    });

    // delete message
    socket.on('delete-message', async (messageID, messageType) => {
        let messageObject = {
            _id: messageID,
            messageType: messageType
        }

        await fetch(`${apiURL}/deleteMessage`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageObject)
            })
            .then(response => response.json()).then(data => {
                if (data.response == "OK") {
                    console.log('Good');
                } else {
                    console.log('Something went wrong');
                }
            });
    });

    // when user is dissconnected
    socket.on('disconnect', () => {
        // emit to everyone that the dissconnected user is offline
        io.emit('status-change', socket.userId, 'Offline');

        let dataToSend = {
            userId: socket.userId,
            status: "Offline"
        };

        // update status of the user that discconected.
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