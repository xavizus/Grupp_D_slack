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

    collection.find({ "email": email }, { fields: { "username": 1, _id: 1 } }, (error, data) => {
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
        responseObject.response = "Failed";
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

module.exports = router;