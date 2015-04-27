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
app.use(express.static('public'));

app.use(session({
    secret: "secretsecret",
    resave: false,
    saveUninitialized: true
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

//this will get the current date -1 day for each API call because the PRH database is updated at the end of the day
var getDate = function() { 
	var d = new Date();
	var da = d.toString().split(' ');
	var months = {
		'Jan': '01',
		'Feb': '02',
		'Mar': '03',
		'Apr': '04',
		'May': '05',
		'Jun': '06',
		'Jul': '07',
		'Aug': '08',
		'Sep': '09',
		'Oct': '10',
		'Nov': '11',
		'Dec': '12',
	};

	var date = da[3] + '-' + months[da[1]] + '-' + (Number(da[2]) - 3); 

	return date;
};

app.get('/', function(req, res){

	var urlBoom = "http://avoindata.prh.fi:80/tr/v1?totalResults=true&resultsFrom=0&companyForm=OY&entryCode=PERUS&noticeRegistrationFrom="+getDate();+"&noticeRegistrationType=U";
	var request1 = function(cb) {
		request(urlBoom, function (error, response, header) {
		    if (!error && response.statusCode == 200) {
		      console.log('request1', getDate());
		      var jsonData = JSON.parse(header);
		      var totalBoom = jsonData.totalResults;
		      cb(null, totalBoom);
		    }
		});
	};
	
	var urlBust = "http://avoindata.prh.fi:80/tr/v1?totalResults=true&resultsFrom=0&companyForm=OY&entryCode=KONALK&noticeRegistrationFrom="+getDate();
	var request2 = function(cb) {
		request(urlBust, function (error, response, header) {
			console.log('in here', response.statusCode);
		    if (!error && response.statusCode == 200) {
		      console.log('request2');
		      var jsonData = JSON.parse(header);
		      var totalBust = jsonData.totalResults;
		      cb(null, totalBust);
		    }
		});
	};

	async.parallel([request1, request2], function(err, results) {
		console.log('3');
		res.render('index', {boom:results[0], bust:results[1]});
	});

});

app.get('/company', function(req, res){
	res.render('company');
});

app.get('/user/signup', function(req,res){
	res.render('user/signup');
});

app.post('/user/signup', function(req,res){
	var email = req.body.email;
	var password = req.body.password;
	db.User.createSecure(email,password)
	  .then(function(user){
	  	res.redirect('/user/profile');
	  });
});

app.get('/user/profile', function(req, res){
	db.Favorites.findAll({where:
		{ user_id: req.session.userId}
	}).then(function(favorites){
		res.render('user/profile', {favorites: favorites});
	});
});


app.get('/companylist/:type', function(req, res){
	
	var urlBoom = "http://avoindata.prh.fi:80/tr/v1?totalResults=true&resultsFrom=0&maxResults=150&companyForm=OY&entryCode=PERUS&noticeRegistrationFrom="+getDate();+"&noticeRegistrationType=U";
	var urlBust = "http://avoindata.prh.fi:80/tr/v1?totalResults=true&resultsFrom=0&maxResults=150&companyForm=OY&entryCode=KONALK&noticeRegistrationFrom="+getDate();
	

	// IF request has boom in it, do this
	if (req.params.type === "boom") {

		request(urlBoom, function (error, response, body) {
		    if (!error && response.statusCode == 200) {
		      
				var jsonData = JSON.parse(body);
				console.log(jsonData);
				var results = jsonData.results;
				res.render('companylist', {companyList: jsonData.results});
		    }
		});

	// IF request has bust in it, do this	
	} else if (req.params.type === "bust") {

		request(urlBust, function (error, response, body) {
		    if (!error && response.statusCode == 200) {
		      var jsonData = JSON.parse(body);
		      console.log(jsonData);
		      var results = jsonData.results;
		      res.render('companylist', {companyList: jsonData.results});
		    }
		});
	}		
});

app.delete('/logout', function(req,res){
	req.logout();
	res.redirect('/');
});


app.get('/company/:id', function(req, res){
	var companyId = req.params.id;
	console.log(companyId);	

//THIS will call another API that provides more detailed info on companies	
	var url = "http://avoindata.prh.fi:80/bis/v1/"+companyId;

	request(url, function (error, response, body){
		if (!error && response.statusCode === 200) {
		 		var jsonData = JSON.parse(body);
		 		console.log(jsonData);
		 		res.render('company', {
		 			companyName: jsonData.results[0].name,
		 			businessId: jsonData.results[0].businessId,
		 			office: jsonData.results[0].registedOffices[0].name,
		 		});
			}
		});
});


app.post('/favorites', function(req, res){
	req.currentUser().then(function(user){
		user.addToFavs(db, req.body.business_id).then(function(){
			res.redirect('/user/profile');
		});
	});
});

app.get('/user/login', function(req,res){
	req.currentUser().then(function(user){
		if (user) {
			res.redirect('/user/profile');
		} else {
			res.render('user/login');
		}
	});
});

app.post('/user/login', function(req,res){
	var email = req.body.email;
	var password = req.body.password;
	db.User.authenticate(email,password)
	  .then(function(dbUser){
	  	if(dbUser) {
	  		req.login(dbUser);
	  		res.redirect('/user/profile');
	  	} else {
	  		res.redirect('/user/login');
	  	}
	  }); 
});


app.listen(process.env.PORT || 3000);
