// dependencies
var fs = require('fs');
var express = require('express');
var passport = require('passport');
var path = require('path');
var app = express();
var cors = require('cors');
var constants = require('./constants.json');

var corOptions = {
    origin : true,
    methods : ['GET', 'PUT', 'POST', 'OPTIONS', 'DELETE'],
    "preflightContinue": true
}

// configure Express
app.configure(function() {
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade');
    app.use(express.logger());
    app.use(express.cookieParser('micro'));
    app.use(express.bodyParser());
    app.use(express.methodOverride());
    app.use(cors(corOptions));
    app.use(express.session({ secret: process.env.secretKey, maxAge: constants.sessionMaxAge }));

    // Initialize Passport!  Also use passport.session() middleware, to support
    // persistent login sessions (recommended).
    app.use(passport.initialize());
    app.use(passport.session({secret: process.env.secretKey, maxAge: constants.sessionMaxAge}));
    app.use(app.router);
    app.use(express.static(__dirname + '/public'));

});



//Read the config key value from env variables. This will return a JSON string with '=>' symbol in place of ':'
//Replace '=>' symbol with ':' to convert to JSON string and parse to retrieve JSON object
var envJson;
var config;
if(process.env.config) {
    envJson = process.env.config;
    envJson = envJson.replace(/=>/g, ':');
    config = JSON.parse(envJson);
}

//Initiate provider configuration and routes.

//verify if all required credentials available in VCAP for Facebook and then Initiate facebook
if (config.configuration && config.configuration.facebook && config.configuration.facebook.clientID && config.configuration.facebook.clientSecret && config.configuration.facebook.scope) {
    var facebook = require('./providers/oauth/facebook');
    new facebook(app);
}


//verify if all required credentials available in VCAP for Google and then Initiate google
if (config.configuration && config.configuration.google && config.configuration.google.clientID && config.configuration.google.clientSecret && config.configuration.google.scope) {
    var google = require('./providers/oauth/google');
    new google(app);
}


//verify if all required credentials available in VCAP for Linkedin and then Initiate linkedin
if (config.configuration && config.configuration.linkedin && config.configuration.linkedin.clientID && config.configuration.linkedin.clientSecret && config.configuration.linkedin.scope) {
    var linkedin = require('./providers/oauth/linkedin');
    new linkedin(app);
}


//verify if all required credentials available in VCAP for Twitter and then Initiate twitter
if (config.configuration && config.configuration.twitter && config.configuration.twitter.clientID && config.configuration.twitter.clientSecret) {
    var twitter = require('./providers/oauth/twitter');
    new twitter(app);
}

var authComplete = require('./providers/auth-complete');
new authComplete(app);

//LDAP initiation
if (config.configuration && config.configuration.ldap && config.configuration.ldap.ldapURL) {
    var ldap = require('./providers/ldap/ldap');
    var ldapObj = new ldap();
    ldapObj.ldapAuthenticate(app);
}

//custom Oauth initiation
if (config.configuration && config.configuration.custom && config.configuration.custom.clientID && config.configuration.custom.clientSecret && config.configuration.custom.authorizationURL && config.configuration.custom.tokenURL) {
    var customOauth = require('./providers/oauth/customOauth');
    new customOauth(app);
}


//Hooks initiation
if (config.configuration && (config.configuration.twilio || config.configuration.sendgrid)) {
    var otp = require('./hooks/otp.js');
    var otpObj = new otp();
    otpObj.generateOtp(app);
    otpObj.validateOtp(app);
}

//webApi hook initiation
//if (config.configuration && config.configuration.httpRequest && config.configuration.httpRequest.url && config.configuration.httpRequest.method && config.configuration.httpRequest.headers && config.configuration.httpRequest.headers.Accept) {
    var webApi = require('./hooks/webapi.js');
    var httpObj = new webApi();
    httpObj.manageWebApi(app);


//}


// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session. This would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// application does not have a database, the complete Provider(facebook/google/twitter/linkedin)
// profile along with accessToken is serialized and deserialized.
passport.serializeUser(function(user, cb) {
    cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
    cb(null, obj);
});


//Terminate an existing login session and redirect to login page.
//app.get('/logout', function(req, res){
//    req.logout();
//    res.redirect(req.query.callbackUrl);
//});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/login');
}

// port
var port = process.env.PORT || 3000;
app.listen(port);
console.log("Running on port :"+port);
module.exports = app;


