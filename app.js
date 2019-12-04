// load MongoClient
let MongoClient = require('mongodb').MongoClient;
// load express
let express = require('express');
// load path
let path = require('path');
// load cookieparser
let cookieParser = require('cookie-parser');
// load morgan (logging)
let logger = require('morgan');
//load environment configs from file .env 
require('dotenv').config({ path: __dirname + '/.env' });

// Initialize express
let app = express();

// URL connection-string to mongoDB server
let url = `mongodb://${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_SERVER}/${process.env.MONGODB_DATABASE}?authSource=${process.env.MONGODB_DATABASE}&w=1`;

// Connect to mongoDB server
MongoClient.connect(url, function(err, db) {
  // Throw error if error is encountered
  if (err) throw err;

  console.log("Successfully connected to database!");

  // closes the database connection.
  db.close();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/* GET home page. */
app.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

app.get('/login',(request, response)=> {
  response.render('login',{title: "Discord V2"});
});
app.listen(8080);