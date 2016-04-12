var app = require('express')();
var bodyParser = require('body-parser')
var mongoose = require('mongoose')
var bcrypt = require('bcryptjs')
var session = require('client-sessions')

mongoose.connect('mongodb://localhost/auth-test')

var User = mongoose.model('User', new mongoose.Schema({
  id: mongoose.Schema.ObjectId,
  firstName: String,
  lastName: String,
  email: { type: String, unique: true},
  password: String
}))

app.set('view engine', 'jade')

app.use(bodyParser.urlencoded({extended:true}))

app.use(session({
  cookieName: 'session',
  secret: 'some_random_string',
  duration: 30
}))

app.use(function (req, res, next) {
  console.log(req.session)
  if(req.session && req.session.user){
    User.findOne({email: req.session.user},{password:0}, function(err, user){
      if(user){
        res.locals.user = user
        req.session.user = user.email
      }
      next()
    })
  }else{
    next()
  }
})

app.get('/', function(req, res){
  res.render('index');
})

app.get('/register', function (req, res) {
  res.render('register')
})

app.post('/register', function (req, res){
  var salt = bcrypt.genSaltSync(10)
  var hash = bcrypt.hashSync(req.body.password, salt)

  new User({
    firstName: req.body.firstName,
    lastName: req.body.lastName,
    email: req.body.email,
    password: hash
  })
  .save(function(err, user){
    if(err){
      var error = 'Something bad happened!. Please try again.'
      if(err.code === 11000){
        error = 'That email is already taken, please try another.'
      }
      res.render('register',{error: error})
    }else{
      req.session.user = user.email
      res.redirect('/dashboard')
    }
  })
})

app.get('/login', function (req, res) {
  res.render('login')
})

app.post('/login', function (req, res){
  User.findOne({email: req.body.email},function(err, user){
    if(!user){
      res.render('login', {error:'incorrect email/password'})
    }else{
      if(bcrypt.compareSync(req.body.password, user.password)){
        req.session.user = user.email
        res.redirect('/dashboard');
      }else{
        res.render('login',{error:'incorrect email/password'})
      }
    }
  })
})

app.get('/dashboard', requireLogin, function (req, res) {
  res.render('dashboard')
})

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

app.listen(process.env.PORT, function(){
   console.log("http app running on localhost port", process.env.PORT)
})