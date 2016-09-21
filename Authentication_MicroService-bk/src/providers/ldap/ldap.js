//dependencies
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var ldapHelper = require('./ldapHelper');
var authProvider = require('./../middleware/auth-provider');
var jwtVerifyPrehooks = require('./../../jwt/verifyHooks');
var verify = require('./../middleware/verify');
var jwt = require('./../../jwt/jwt');
var constants = require('./../../constants.json');

//constructor
var ldap = function () {

};


//Read the config key value from env variables. This will return a JSON string with '=>' symbol in place of ':'
//Replace '=>' symbol with ':' to convert to JSON string and parse to retrieve JSON object
var envJson;
var config;
if(process.env.config) {
    envJson = process.env.config;
    envJson = envJson.replace(/=>/g, ':');
    config = JSON.parse(envJson);
}

// These APIs are used to authenticate against an ldap server
ldap.prototype.ldapAuthenticate = function (app) {

    // POST /auth/ldap
    //   This API is the initial call for performing the authentication to ldap
    //   It check for any available prehooks information and creates JWT token based on prehooks information
    //   If no prehooks are available then JWT token is generated with next call information to authenticate with ldap
    //  If any prehooks are available then returns token and status code as 303
    app.post('/auth/ldap', [jsonParser,jwtVerifyPrehooks.verifyApiKey], function (req, res) {
            var provider = "ldap";
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


    // route for ldap authentication
    // POST /ldap
    //  This API requires Token(generated from /auth/ldap call), dn, password in headers as inputs
    //  This API authenticates the user against ldap and returns the result.
    //  If no posthooks are available then returns the result with status 200
    //  If any posthooks are available then returns the nextCall, token with status as 303
    app.post("/ldap", [jsonParser,verify.verifyLdapRequest,jwtVerifyPrehooks.verifyPrehooksClearanceForLdap], function (req, res) {
        var userProfile ={};
        var configDetails = {
            ldapUrl     : config.configuration.ldap.ldapURL,
            logger      : "logger"   //TODO :: Check what is this logger parameter
        }
        var userDetails = {
            userName    : req.headers.dn,
            password    : req.headers.password
        }

        //Call authenticate method
        var ldapHelperObj = new ldapHelper();
        ldapHelperObj.authenticate(configDetails,userDetails, function(error, authFlag) {
            if (error === null && authFlag === true) {

                //Prepare the response JSON for successful authentication
                userProfile = {
                    "message": "authentication successful",
                    "authFlag": true
                }

                //Check if any posthooks are available then process the JSON and give next call with token.
                // Else just share the details of user if any attributes are present in ldap config
                getLdapResponse(userProfile,function(ldapResponse) {
                    res.setHeader("Access-Control-Allow-Headers", "*");
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
                    res.send(ldapResponse.responseJson,ldapResponse.status);
                });
            }
            else {
                console.log("Something wrong with authentication for dn "+req.headers.dn +" : "+JSON.stringify(error));
                res.setHeader("Access-Control-Allow-Headers", "*");
                res.setHeader('Content-Type', 'application/json');
                res.setHeader("Access-Control-Allow-Origin", "*");
                res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
                res.send(error, 401);
            }
        })

    });
}

function getLdapResponse(userProfile,callback){
    //Check if any posthooks are available then process the JSON and give next call with token.
    // Else just share the details of user if any attributes are present in ldap config
    if ( config.posthooks && config.posthooks["ldap"]) {
        var authenticationType = "ldap";
        var postHooks = config.posthooks[authenticationType];
        var totalNoOfPosthooks = postHooks.length;
        var hookType = "posthook";

        var nextCall;
        var channel = postHooks[0].channelprovider;

        if (postHooks[0].channel === 'OTP') {
            nextCall = '/generateOtp'
        }
        if (postHooks[0].channel === 'Captcha') {
            nextCall = '/generateCaptcha'
        }
        //Prepare JWT json info with totalNoOfPrehooks, preHooks object, currentPreHook(array number), authentication type(facebook), preparedBy(/auth/facebook)
        var jwtInfo = {
            userProfile     : userProfile,
            totalNoOfhooks  : totalNoOfPosthooks,
            hooks           : postHooks,
            currentHook     : 1,
            hookType        : hookType,
            authenticationType: authenticationType,
            nextCall        : nextCall,
            channelprovider : channel,
            iat             : Math.floor(Date.now() / 1000) - 30, //backdate a jwt 30 seconds to compensate the next execution statements
            expiresIn       : constants.expiresIn
            //preparedBy          :   authenticationType
        }

        // sign JWT token
        jwt.generateJWT(jwtInfo, function (err, token) {
            //Prepare jwt payload info json with all required values like nextcall, channel, jwt-token
            var responseJson = {
                nextCall            : nextCall,
                channelprovider     : channel,
                token               : token
            }

            var ldapResponse = {
                responseJson    : responseJson,
                status          : 303
            }
            callback(ldapResponse);
        });
    }
    else {
        var ldapResponse = {
            responseJson    : userProfile,
            status          : 200
        }
        callback(ldapResponse);
    }
}

module.exports = ldap;


