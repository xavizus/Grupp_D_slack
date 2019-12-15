let express = require('express');
let router = express.Router();

router.get('/', (request, response) => {

    let db = request.db;

    let collection = db.get('users');

    collection.find({}, {}, function(e, docs) {
        // Create a response object
        let responseObject = {
            response: "OK"
        };
        // store our result in response object
        responseObject.result = docs;

        // Send that object through the api.
        response.send(responseObject);
    });
});

router.get('/getPasswordHash/:email', (request, response) => {
    let email = request.params.email;
    let responseObject = {
        response: "OK"
    };

    let db = request.db;

    let collection = db.get("users");

    collection.find({ "email": email }, { fields: { "password": 1, _id: 0 } }, (err, data) => {
        if (err) throw err;
        if (data.length < 1 || data == "") {
            responseObject.result = false;
        } else {
            responseObject.result = data[0].password;
        }
        response.send(responseObject);
    });

});

router.get('/getUserInfo/:email', (request,response) => {
    let email = request.params.email;
    let responseObject = {
        response: "OK"
    }

    let db = request.db;
    let collection = db.get("users");

    collection.find({ "email": email }, { projection: { "username": 1, _id: 1 } }, (error, data) => {
        if (error) {
            response.send({error});
            return;
        }

        if(data.length < 1 || data == "") {
            responseObject.result = false;

            response.send(responseObject);
            return;
        }

        responseObject.result = data[0];

        response.send(responseObject);

    });
});

router.get('/exist/:dataType/:dataToSearch', (request, response) => {
    const allowedTypes = [
        "email",
        "username",
        "_id"
    ];
    let responseObject = {
        response: "OK"
    };
    let dataToSearch = request.params.dataToSearch;
    let dataType = request.params.dataType;

    if (allowedTypes.indexOf(dataType) == -1) {
        responseObject.response = "ERROR";
        responseObject.result = "Datatype not existing!";
        response.send(responseObject);
        return;
    }

    let db = request.db;
    let collection = db.get('users');
    collection.find({
        [dataType]: dataToSearch
    }, {}, (error, data) => {
        if (error) throw error;

        if (data.length < 1 || data == "") {
            responseObject.result = false;
        } else {
            responseObject.result = true;
        }
        response.send(responseObject);
    });

});

router.post('/addUser', (request,response) => {
    let db = request.db;
    let collectionUsers = db.get('users');
    collectionUsers.insert({
        "username": request.body.username,
        "email":request.body.email,
        "password": request.body.password,
        "profilePicturePath": "/images/default.png"
    },(error,result) => {
        if(error) {
            response.send({error})
            return;
        } else {
            response.send({result: "OK"});
        }
    });
});

router.get('/status/:userId', (request,response) => {
    let userId = request.params.userId;

    let db = request.db;
    let collectionUsers = db.get('users');

    let query = {
        _id: userId
    };

    let wantedData = {
        projection: {
            _id: 0,
            status: 1
        }
    };

    let responseObject = {
        response: "OK"
    };

    collectionUsers.findOne(query,wantedData, (error,result) => {
        if(result.length < 1 || result == "") {
            responseObject.response = "ERROR";
            responseObject.result.message = "Could not find user!"

            response.send(responseObject);
            return;
        }
        responseObject.result = result;
        response.send(responseObject);
    });

});

router.get('/status', (request, response) => {
    let db = request.db;
    let collectionUsers = db.get('users');
    let query = {};
    let wantedData = {
        projection: {
            _id: 1,
            status: 1,
            username: 1
        }
    };

    let responseObject = {
        response: "OK"
    };

    collectionUsers.find(query,wantedData, (error,result) => {
        if(result.length < 1 || result == "") {
            responseObject.response = "ERROR";
            responseObject.result.message = "Could not find user!"

            response.send(responseObject);
            return;
        }
        responseObject.result = result;
        response.send(responseObject);
    });
});

router.post('/updateStatus',(request,response) => {
    let db = request.db;
    let collectionUsers = db.get('users');
    let query = {
        _id: request.body.userId
    };
    let updatedValues = {
        $set: {
            status: request.body.status
        }
    };

    if(request.body.userId == "" || request.body.status == "") {
        response.send({
            response: "ERROR",
            result: {
                message: "userId or status missing!"
            }
        });

        return;
    }

    collectionUsers.update(query,updatedValues, (error, result) => {
        if(error) {
            response.send({
                response: "ERROR",
                result: {error} 
            });
            return;
        }
        response.send({
            response: "OK",
            result: {
                message: result
            }
        });
    });
});

//Jonas api testing
router.get('/getProfileData/:userName', (req, res) => {
   
    currentUserName = req.params.userName;
    let db = req.db;
    let usersCollection = db.get('users');
    
    usersCollection.find({
        "username": currentUserName
    }, {}, (err, data) => {
        if(err) {
            res.send("user does not exist");
        } else {
            let responseObject = {
                results : data
            };
            res.send(responseObject);
        }
        
    })
});

router.get('/editProfile/:userName', (req, res) => {
    let usernameToEdit = req.params.userName;
    let db = req.db;
    let usersCollection = db.get('users');

    usersCollection.findOne({
        username: usernameToEdit
    }, (err, data) => {
        if(err) {
            res.send("error accured when editing");
        } else {
            let responseObject = {results : data};
            res.send(responseObject);
        }
    });
});

router.post('/editProfileData/:oldusername', (request, response) => {
    let db = request.db;
    let userTabell = db.get('users');
    let newUserName = request.body.username;
    let newEmail = request.body.email;
    
    let dataToChange = {
        'username' : newUserName,
        'email' : newEmail
    };
    if (request.body.profilePicturePath) {
        let newProfilePicturePath = request.body.profilePicturePath;
        dataToChange.profilePicturePath = newProfilePicturePath;
    }
    
    console.log(dataToChange);
    userTabell.update({
        'username': request.params.oldusername
    }, {
        $set: dataToChange
    }, (err, item) => {
        if (err) {
            // If it failed, return error
            response.send("There was a problem adding the information to the database.");
        } else {
            //profile_pic.mv('./images/' + profile_pic.name);
            response.send({result: "OK"});
        }
    });

});

router.get('/deleteProfile/:userToDelete', (req, res) => {
    let userToDelete = req.params.userToDelete;
    let db = req.db;
    let userTabell = db.get('users');

    userTabell.findOneAndDelete({
        username: userToDelete
    }, (err, data) => {
        if (err) {
            // If it failed, return error
            response.send("There was a problem deleting the information to the database.");
        } else {
            let responseObject = {
                results : data
            };
            res.send(responseObject);
        }
    });
});

// find chat room
router.get('/findChatRoom/:room', (req, res) => {
    let db = req.db;
    
    db.get('chatrooms').findOne({
        roomname: req.params.room
    }, (err, data) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                result : data
            };
            res.send(responseObject);
        }
    });
});

// find user
router.get('/findUser/:user', (req, res) => {
    let db = req.db;
    
    db.get('users').findOne({
        username: req.params.user
    }, (err, data) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                result : data
            };
            res.send(responseObject);
        }
    });
});

// get chat room list
router.get('/getAllChatRooms', (req, res) => {
    let db = req.db;

    db.get('chatrooms').find({}, {
        projection: {
            roomname: 1
        }
    }, (err, data) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                results : data
            };
            res.send(responseObject);
        }
    });
});

// get old chat room messages
router.get('/getMessages/:room', (req, res) => {
    let db = req.db;
    
    db.get('messages').find({
        chatroomid: req.params.room
    }, (err, data) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                results : data
            };
            res.send(responseObject);
        }
    });
});

// get old private messages
router.get('/getPrivateMessages/:sender/:receiver', (req, res) => {
    let db = req.db;
    
    db.get('private-messages').find({
        senderID: req.params.sender,
        receiverID: req.params.receiver
    }, (err, data) => {
        if (err) {
            throw err;
        } else {
            let responseObject = {
                results : data
            };
            res.send(responseObject);
        }
    });
});

module.exports = router;