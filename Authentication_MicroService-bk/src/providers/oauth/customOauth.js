// dependencies
var OAuth2Strategy = require('passport-oauth2').Strategy;
var passport = require('passport');
var verify = require('./../middleware/verify');
var authProvider = require('./../middleware/auth-provider');
var jwtVerifyPrehooks = require('./../../jwt/verifyHooks');
var jwt = require('./../../jwt/jwt');
var constants = require('./../../constants.json');


//Read the config key value from env variables. This will return a JSON string with '=>' symbol in place of ':'
//Replace '=>' symbol with ':' to convert to JSON string and parse to retrieve JSON object
var envJson;
var config;
var options = {};
if(process.env.config) {
    envJson = process.env.config;
    envJson = envJson.replace(/=>/g, ':');
    config = JSON.parse(envJson);
    config.configuration.custom.callbackURL = config.custom_callbackURL;
    options = config.configuration.custom;
    options.failureRedirect = 'http://localhost:3000/auth/failure';


}
console.log("options "+JSON.stringify(options));


// Configure the Oauth 2.0 strategy  by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Facebook API on the user's
// behalf, along with the user's profile.  The function must invoke `done`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.



if (config && config.configuration && config.configuration.custom && config.configuration.custom.clientID && config.configuration.custom.clientSecret ) {

    passport.use(new OAuth2Strategy(config.configuration.custom,
        function(accessToken, refreshToken, profile, done) {
            // The function must invoke `done` with a user object, which will be set at `req.user`
            // in route handlers after authentication.(/auth/facebook/callback will receive `req.user`)
            var user = {
                "accessToken" : accessToken,
                "refreshToken" : refreshToken,
                "profile" : profile
            };
            done(null, user);
        }
    ));
}






function customOauth(app){

    // GET /custom
    //   Use passport.authenticate() as route middleware to authenticate the
    //   request.  The first step in Facebook authentication will involve
    //   redirecting the user to facebook.com.  After authorization, provider will
    //   redirect the user back to this application at /auth/facebook/callback

    app.get('/custom/:token', [
        verify.verifycustomOauth,    //verify if all required credentials available in VCAP
        verify.verifyOauthRequest, //verify if callbackUrl is present in query params
        jwtVerifyPrehooks.verifyPrehooksClearanceForcustomOauth //Verify the clearance for facebook(all prehooks and authentication type)
    ], function(req,res,next) {
        options.state = req.query.callbackUrl;
        passport.authenticate('oauth2',options) (req,res,next);
    });

    // POST /auth/custom
    //   This API is the initial call for performing the authentication to selected provider
    //   It check for any available prehooks information and creates JWT token based on prehooks information
    //   If no prehooks are available then JWT token is generated with next call information to authenticate with provider
    app.post('/auth/custom', [jwtVerifyPrehooks.verifyApiKey], function (req, res) {
            var provider = "custom";
            authProvider.authProvider(provider,function(response) {
                res.setHeader("Status-Code", 200);
                res.setHeader("Access-Control-Allow-Headers", "*");
                res.setHeader('Content-Type', 'application/json');
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
                res.send(response.responseJson, response.statusCode);

            });
        }
    );

// GET /auth/customcallback
    //   Use passport.authenticate() as route middleware to authenticate the request.
    //   On success Prepare profile data and encrypt as code.
    //   Developer has to call /account method to decrypt the code to get user account details


    app.get('/auth/custom/callback',
        passport.authenticate('oauth2', {"resource":"http://localhost:3000/auth/customOauth/resource","failureRedirect":"http://localhost:3000/auth/failure"}),
        function(req, res) {
console.log("after authenticate ******** ")
            var nextCall = "/auth/complete";
            var authenticationType = "custom";
            var protocol = "oauth";
            //Take the callbackUrl from session which is set earlier
            var callbackUrl = req.query.state;

            //Prepare the profile data received after login from
            var profile = {
                accessToken: req.user.accessToken,
                refreshToken:req.user.refreshToken,
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
                    res.setHeader("Access-Control-Allow-Headers", "*");
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
                    if(err) {
                        res.send(err, 500);
                    }
                    else {
                        res.redirect(callbackUrl+'/'+token);
                    }
                });
            }
            else {

                res.send({error:"Not a valid redirect URL"}, 400);
            }
        }
    );

}

module.exports = customOauth;
