var app = require('express')();
app.get('/', function(req, res){
  res.send("hello world");
})

app.listen(3000, function(){
   console.log("http app running on localhost port 3000")
})
