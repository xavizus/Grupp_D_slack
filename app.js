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
app.use(express.static("views"));
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

app.get('/profile/:name', function(req, res) {
    let nameToShow = req.params.name;
    let db = req.db;
    let usersCollection = db.get('users');
    console.log(usersCollection.length);
        usersCollection.find({"username": nameToShow }, {}, (err, data) => {
            console.log(data.length);
            if(data.length != 0) {
                res.render('./profile.ejs', { "data": data });
            }
            else {
                res.send("user does not exist");
            }        
        })   
})

app.get('/profile/edituser/:username', function (req, res) {
    var db = req.db;
    var collection = db.get('users');
    console.log(req.params.username);
    collection.findOne({username: req.params.username}, function (e, data) {
        console.log(data);
      res.render('editCurrentUser', {
        title: 'redigera användare',
        "user": data
      });
    });
  });

  app.post('/profile/:olduser', (request, response) => {
    let db = request.db;
    let userTabell = db.get('users');

    let newUserName = request.body.username;
    let newEmail = request.body.useremail;
    let oldUserName = request.params.olduser;

    userTabell.update({'username' : oldUserName},
    {$set : {'username' : newUserName, 'email' : newEmail}}, (err, item) => {
        if (err) {
          // If it failed, return error
          response.send("There was a problem adding the information to the database.");
        } else {
          // And forward to success pages
          response.redirect("/profile/"+newUserName);
        }
    })
});

app.get('/profile/deleteuser/:user', (request, response) =>{
    let db = request.db;
    let userTabell = db.get('users');

    let userToDelete = request.params.user;
    console.log(userToDelete);
    userTabell.findOneAndDelete({'username' : userToDelete}, (err, item) => {
        if (err) {
            // If it failed, return error
            response.send("There was a problem adding the information to the database.");
          } else {
            // And forward to success pages
            response.redirect("/login");
          }
    })
});

app.get('/newUser', (request, response) => {
    response.render('newUser', { title: "Discord V2" });
});

app.get('/login', (request, response) => {
    response.render('login', { title: "Discord V2" });
});
app.listen(8080);