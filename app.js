var app = require('express')();
var bodyParser = require('body-parser')
var mongoose = require('mongoose')
var bcrypt = require('bcryptjs')
var session = require('client-sessions')

// first you need to run mongodb to connect 
// install from here: https://www.mongodb.org/
mongoose.connect('mongodb://localhost/auth-test')

// this model allows intercation with mongodb database
// documentation: http://mongoosejs.com/
var User = mongoose.model('User', new mongoose.Schema({
  id: mongoose.Schema.ObjectId,
  firstName: String,
  lastName: String,
  email: { type: String, unique: true},
  password: String
}))

// our app uses jade to render html documents located in the /views folder
// documentation: http://jade-lang.com/
app.set('view engine', 'jade')

// req.body is the container for all the body information for our FORM info 
app.use(bodyParser.urlencoded({extended:true}))

// req.session is the container of our session variables as req.session.user
app.use(session({
  cookieName: 'session',
  secret: 'some_random_string',
  duration: 5*60*100,
  activeDuration: 5*60*1000
}))

// Remember app.use is called on each http method
app.use(function (req, res, next) {
  if(req.session && req.session.user){
    User.findOne({email: req.session.user},{password:0}, function(err, user){
      if(user){
        res.locals.user = user // res.locals is passed to jade so could be rendered
        
        req.session.user = user.email //  if the user is founded in the db then we set the email as a session variable
      }else{
        req.session.reset() // if the session sended from the client is not stored in the DB then we remove this wrong session from the client
      }
      next() // to the next middleware (login)
    })
  }else{
    next() 
  }
})

app.get('/', function(req, res){
  // the views folder does not need to be specified since is a default 
  res.render('index.jade');
})

app.get('/register', function (req, res) {
  // as default you could use register.jade as register since we specify Jade as a default template render
  res.render('register')
})

app.post('/register', function (req, res){
  var salt = bcrypt.genSaltSync(10)
  var hash = bcrypt.hashSync(req.body.password, salt) // hashed pasword
  
  // we create a new user and set their info
  new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: hash // it is important to store hash instead of the form password this avoid some security issues
  })
  .save(function(err, user){ // then we are ready to save the new user on the data base
    if(err){
      var error = 'Something bad happened!. Please try again.'
      if(err.code === 11000){
        error = 'That email is already taken, please try another.'
      }
      res.render('register.jade',{error: error})
    }else{
      req.session.user = user.email
      res.redirect('/dashboard')
    }
  })
})

app.get('/login', function (req, res) {
  res.render('login')  // login view
})

app.post('/login', function (req, res){  // here we process the Form data from login view
  User.findOne({email: req.body.email},function(err, user){
    if(!user){ // if user is not found in the database we render the login again but now with a error message on the jade file
      res.render('login', {error:'incorrect email/password'})
    }else{
      if(bcrypt.compareSync(req.body.password, user.password)){ // if user is found then we compare the hashed password with the user pasword
        req.session.user = user.email
        res.redirect('/dashboard'); // remeber to specify a path to dashboard route, we are not render dashboard in this case we are changing the route like localhost:3000/dashboard
      }else{ //if the password comparison falis then we render the ligin view with a error message
        res.render('login',{error:'incorrect email/password'})
      }
    }
  })
})

app.get('/dashboard', requireLogin, function (req, res) {
  res.render('dashboard')
})

// Middleware to be used on every route we want to require login
function requireLogin(req, res, next){
  if(!req.session.user){
    res.redirect('/login')
  }else{
    next()
  }
}

if(process.env.NODE_ENV === 'development'){
  process.env.PORT = 3000
}

// this starts the HTTP server listening to a port 3000
app.listen(process.env.PORT, function(){
   console.log("Your Super Awesome HTTP app is running on localhost port", process.env.PORT)
})
