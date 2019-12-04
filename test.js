const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');
// Connection URL
const url = 'mongodb://gruppD:Ne0fOismqHFU1XQMAXgY@xav-p-mongodb.xavizus.com?authSource=gruppDDB&w=1';

// Database Name
const dbName = 'gruppDDB';

// Create a new MongoClient
const client = new MongoClient(url,{
    useUnifiedTopology: true,
    useNewUrlParser: true,
    });

// Use connect method to connect to the Server
client.connect(function(err) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

  const db = client.db(dbName);

  db.collection('users').insertOne({"username":"Jonas"}, (err,res) => {
      if (err) throw err;
      console.log("1 document inserted")
  })
  let users = db.collection('users').find({});

  users.toArray((err, result)=> {
      if (err) throw err;
      console.log(result);
  });

  client.close();
});
