// load MongoClient
const MongoClient = require('mongodb').MongoClient;

//load environment configs from file .env 
require('dotenv').config({
    path: __dirname + '/../.env'
});

// URL connection-string to mongoDB server
const url = `mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_SERVER}/${process.env.MONGODB_DATABASE}?authSource=${process.env.MONGODB_DATABASE}&w=1`;

// Create a new client
const client = new MongoClient(url, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
});

let express = require('express');
let router = express.Router();

router.get('/', (request, response) => {
        // Connect to mongoDB server
    client.connect(function (err) {
        // Throw error if error is encountered
        if (err) throw err;

        console.log("Successfully connected to database!");

        // store our current connection to the database
        const db = client.db();

        // Find all users
        let foundUsers = db.collection('users').find({});

        // convert the result to an array.
        foundUsers.toArray((err, result)=> {
            // if error, throw that error
            if (err) throw err;

            // Create a response object
            let responseObject = {
                response: "OK"
            };
            // store our result in response object
            responseObject.result = result;

            // Send that object through the api.
            response.send(responseObject);
        });

        // closes the database connection.
        client.close();
    });
    
});

module.exports = router;