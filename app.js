var express = require('express');
var app = express();
var request = require('request');
var db = require('./models');
var bodyParser = require('body-parser');
var session = require('express-session');
var async = require('async');
var methodOverride = require('method-override');

app.use(methodOverride('_method'));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));

//CREATES A SESSION
app.use(session({
    secret: "secretsecret",
    resave: false,
    save: {
        uninitiialize: true
    }
}));

app.use("/", function(req, res, next){
    req.login = function(user){
        req.session.userId = user.id;
    };
    req.currentUser = function(){
        return db.User.find(req.session.userId)
                         .then(function(dbUser){
                               req.user = dbUser;
                                 return dbUser;
                         });
    };
    req.logout = function(){
        req.session.userId = null;
        req.user = null;
    }
    next();
});


app.get('/', function(req, res){
// THIS QUERY GETS all new registered ltd companies from given date 
// will go under fron page aka index.ejs
// Question is, how do I insert previous day to the query every time?
//to proceed to company page, needs signup
	// var urlBoom = "http://avoindata.prh.fi:80/tr/v1?totalResults=true&resultsFrom=0&companyForm=OY&companyRegistrationFrom=2015-04-13&entryCode=PERUS&noticeRegistrationType=U";
	var urlBoom = "http://avoindata.prh.fi:80/tr/v1/publicnotices?totalResults=true&resultsFrom=0&noticeRegistrationFrom=2015-04-13&noticeRegistrationType=U";
	var request1 = function(cb) {
		request(urlBoom, function (error, response, header) {
		    if (!error && response.statusCode == 200) {
		      console.log('request1');
		      var jsonData = JSON.parse(header);
		      //console.log(jsonData);
		      var totalBoom = jsonData.totalResults;
		      //console.log(totalBoom);
		      cb(null, totalBoom);
		    }
		});
	};

	var urlBust = "http://avoindata.prh.fi:80/tr/v1?totalResults=true&resultsFrom=0&companyForm=OY&entryCode=KONALK&noticeRegistrationFrom=2015-04-13";

	var request2 = function(cb) {
		request(urlBust, function (error, response, header) {
		    if (!error && response.statusCode == 200) {
		      console.log('request2');
		      var jsonData = JSON.parse(header);
		      // console.log(jsonData);
		      var totalBust = jsonData.totalResults;
		      // console.log(totalBoom);
		      cb(null, totalBust);
		    }
		});
	};

	async.parallel([request1, request2], function(err, results) {
		console.log('3');
		res.render('index', {boom:results[0], bust:results[1]});
	});

});

//RENDERS
app.get('/company', function(req, res){
	res.render('company');
});

//RENDERS
app.get('/user/signup', function(req,res){
	res.render('user/signup');
});

//WORKS
app.post('/user/signup', function(req,res){
	var email = req.body.email;
	var password = req.body.password;
	db.User.createSecure(email,password)
	  .then(function(user){
	  	res.redirect('/user/profile');
	  });
});

//RENDERS
//ADD username to ejs-page
app.get('/user/profile', function(req, res){
	res.render('user/profile');
});

app.get('/companylist', function(req, res){

	var url = "http://avoindata.prh.fi:80/tr/v1/publicnotices?totalResults=true&resultsFrom=0&noticeRegistrationFrom=2015-04-13&noticeRegistrationType=U";
	
	request(url, function (error, response, body) {
	    if (!error && response.statusCode == 200) {
	      //console.log('request');
	      var jsonData = JSON.parse(body);
	      console.log(jsonData);
	      //THIS WORKS var name = jsonData.name;
	      var results = jsonData.results;
	      // THIS WORKS res.render('companylist', {companyName: jsonData.results[0].name, companyId: jsonData.results[0].businessId});
	      res.render('companylist', {companyName: jsonData.results[1].name, companyId: jsonData.results[1].businessId, companyOffice: jsonData.results[1].registeredOffice});
	    }
	});
		
});

app.delete('/logout', function(req,res){
	req.logout();
	res.redirect('/');
});

//app.get('company/:id', function(req, res){
	//res.render('companies');
	//add save button to the page
//});

app.get('/user/login', function(req,res){
	req.currentUser().then(function(user){
		if (user) {
			res.redirect('user/profile');
		} else {
			res.render('user/login');
		}
	});
});

//WHAT'S WRONG WITH THIS
app.post('/user/login', function(req,res){
	var email = req.body.email;
	var password = req.body.password;
	db.User.authenticate(email,password)
	  .then(function(dbUser){
	  	if(dbUser) {
	  		req.login(dbUser);
	  		res.redirect('user/profile');
	  	} else {
	  		res.redirect('user/login');
	  	}
	  }); 
});

app.listen(3000);
