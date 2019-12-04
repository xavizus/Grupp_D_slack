// load express
let express = require('express');
// load path
let path = require('path');
// load cookieparser
let cookieParser = require('cookie-parser');
// load morgan (logging)
let logger = require('morgan');

//Mongo start
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
  console.log("kopplad mot databas");
  
  const db = client.db('gruppDDB')
  const collection = db.collection('TESTING');
  /*collection.insertOne({name: 'Jonas'}, (err, result) => {   
   
  });*/
  collection.find({name:"Jonas"}).toArray((err, items) => {
    console.log(items)
  })
  
  client.close();
}

//...
})

//Mongo end

// load route for api
let apiRouter = require('./routes/api');

// Initialize express
let app = express();

var app = express();
let test = "Jonas";
// view engine setup
app.use(express.static("views"));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// create route for our api
app.use('/api/v1', apiRouter);

app.get('/profile', function(req, res) {
  res.render('./profile.ejs', {test})
})

app.get('/login',(request, response)=> {
  response.render('login',{title: "Discord V2"});
});
app.listen(8080);