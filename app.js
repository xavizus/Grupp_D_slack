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
// Initialize express
let app = express();

//load environment configs from file .env 
require('dotenv').config({
    path: __dirname + '/.env'
});

// Monk DB-connection
const db = monk(`${process.env.MONGODB_USER}:${process.env.MONGODB_PASSWORD}@${process.env.MONGODB_SERVER}/${process.env.MONGODB_DATABASE}?authSource=${process.env.MONGODB_DATABASE}&w=1`);

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use(function(req, res, next) {
    req.db = db;
    next();
});

// create route for our api
app.use('/api/v1', apiRouter);

app.get('/login', (request, response) => {
    response.render('login', { title: "Discord V2" });
});

app.get('/newUser', (request, response) => {
    response.render('newUser', { title: "Discord V2" });
});


app.post('/newUser', (request, response) => {

});
app.listen(8080);