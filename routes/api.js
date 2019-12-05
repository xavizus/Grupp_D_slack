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

module.exports = router;