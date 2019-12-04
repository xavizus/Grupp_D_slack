//Mongo
const client = require('mongodb').MongoClient
const url = 'mongodb://gruppD:Ne0fOismqHFU1XQMAXgY@xav-p-mongodb.xavizus.com?authSource=gruppDDB&w=1'
client.connect(url, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}, (err, client) => {
if (err) {
  console.error(err)
  console.log("Not work");
  return
}else {
  console.log("Kom in i databas");
  const db = client.db('gruppDDB')
  const collection = db.collection('TESTING');
  collection.insertOne({name: 'Roger'}, (err, result) => {   
   
  });
  client.close();
}

//...
})

//Mongo end