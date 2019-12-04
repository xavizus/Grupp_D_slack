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

// Initialize express
let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// create route for our api
app.use('/api/v1', apiRouter);

app.get('/login',(request, response)=> {
  response.render('login',{title: "Discord V2"});
});
app.listen(8080);