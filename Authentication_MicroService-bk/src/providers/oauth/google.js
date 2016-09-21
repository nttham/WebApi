// dependencies
var passport = require('passport');
var GoogleStrategy = require('passport-google-oauth2').Strategy;
var verify = require('./../middleware/verify');
var authProvider = require('./../middleware/auth-provider');
var scope = [];
var jwtVerifyPrehooks = require('./../../jwt/verifyHooks');
var jwt = require('./../../jwt/jwt');
var constants = require('./../../constants.json');

//Read the config key value from env variables. This will return a JSON string with '=>' symbol in place of ':'
//Replace '=>' symbol with ':' to convert to JSON string and parse to retrieve JSON object
var envJson;
var config;
if(process.env.config) {
    envJson = process.env.config;
    envJson = envJson.replace(/=>/g, ':');
    config = JSON.parse(envJson);
}

// Configure the Google strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Google API on the user's
// behalf, along with the user's profile.  The function must invoke `done`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.
if (config.configuration && config.configuration.google && config.configuration.google.clientID && config.configuration.google.clientSecret && config.configuration.google.scope) {
    scope = config.configuration.google.scope;
    passport.use(new GoogleStrategy({
            clientID: config.configuration.google.clientID,
            clientSecret: config.configuration.google.clientSecret
        },
        function(request, accessToken, refreshToken, profile, done) {
            // The function must invoke `done` with a user object, which will be set at `req.user`
            // in route handlers after authentication.(/auth/google/callback will receive `req.user`)
            var user = {
                "accessToken" : request,
                "refreshToken" : refreshToken,
                "profile" : profile
            };
            done(null, user);
        }
    ));
}

function google(app){

    // GET /google
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  The first step in Google authentication will involve
    //   redirecting the user to google.com.  After authorization, google will
    //   redirect the user back to this application at /auth/google/callback
    app.get('/google/:token', [
        verify.verifyGoogle,    //verify if all required credentials available in VCAP
        verify.verifyOauthRequest, //verify if callbackUrl is present in query params
        jwtVerifyPrehooks.verifyPrehooksClearanceForGoogle //Verify the clearance for google(all prehooks and authentication type)
    ], function(req,res,next) {
        passport.authenticate(
            'google', { scope: scope ,callbackURL: '/auth/google/callback' , state: req.query.callbackUrl}
        ) (req,res,next);
    });

    // POST /auth/google
    //   This API is the initial call for performing the authentication to google
    //   It check for any available prehooks information and creates JWT token based on prehooks information
    //   If no prehooks are available then JWT token is generated with next call information to authenticate with google
    app.post('/auth/google', [jwtVerifyPrehooks.verifyApiKey], function (req, res) {
            var provider = "google";
            authProvider.authProvider(provider,function(response) {
                res.setHeader("Access-Control-Allow-Headers", "*");
                res.setHeader('Content-Type', 'application/json');
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
                res.send(response.responseJson, response.statusCode);

            });
        }
    );


    // GET /auth/google/callback
    //   Use passport.authenticate() as route middleware to authenticate the request.
    //   On success Prepare profile data and encrypt as code.
    //   Developer has to call /account method to decrypt the code to get user account details
    app.get('/auth/google/callback',
        passport.authenticate('google', { session: false , callbackURL: '/auth/google/callback'}),
        function(req, res) {

            var nextCall = "/auth/complete";
            var authenticationType = "google";
            var protocol = "oauth";
            //Take the callbackUrl from session which is set earlier
            var callbackUrl = req.query.state;

            //Prepare the profile data received after login from google
            var profile = {
                accessToken: req.user.accessToken,
                id: req.user.profile.id,
                displayName: req.user.profile.displayName,
                provider: req.user.profile.provider
            };

            //prepare jwt info for next completeAuthenticate call
            var jwtInfo = {
                userProfile         : profile,
                nextCall            : nextCall,
                isPosthookClear     : false,
                authenticationType  : authenticationType,
                protocol            : protocol,
                iat                 : Math.floor(Date.now() / 1000) - 30, //backdate a jwt 30 seconds to compensate the next execution statements
                expiresIn           : constants.expiresIn
            }
            
            //check if callbackUrl is defined and received in state param
            if(typeof callbackUrl !== 'undefined' && callbackUrl && callbackUrl !== "undefined") {
                //encrypt the jwtInfo data as JWT token to be sent back to developer in redirection
                jwt.generateJWT(jwtInfo, function(err, token) {
                    if(err) {
                        res.setHeader("Access-Control-Allow-Headers", "*");
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader("Access-Control-Allow-Origin", "*");
                        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
                        res.send(err, 500);
                    }
                    else {
                        res.redirect(callbackUrl+'/'+token);
                    }
                });
            }
            else {
                res.setHeader("Access-Control-Allow-Headers", "*");
                res.setHeader('Content-Type', 'application/json');
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
                res.send({error:"Not a valid redirect URL"}, 400);
            }
        }
    );
}

module.exports = google;
