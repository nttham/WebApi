// dependencies
var jwtVerifyAuthComplete = require('./../jwt/verifyHooks');
var jwt = require('./../jwt/jwt');
var constants = require('./../constants.json');

//Read the config key value from env variables. This will return a JSON string with '=>' symbol in place of ':'
//Replace '=>' symbol with ':' to convert to JSON string and parse to retrieve JSON object
var envJson;
var config;
if(process.env.config) {
    envJson = process.env.config;
    envJson = envJson.replace(/=>/g, ':');
    config = JSON.parse(envJson);
}

function authComplete(app){
    
     app.get('/auth/failure',function(req,res){
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader('Content-Type', 'application/json');
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");

        //console.log("res.query "+req.query);
        res.send({error:"Not a valid redirect URL"}, 400);
    });


    // POST /auth/complete
    //   This API needs JWT token and apiKey as headers
    //   This API will be called after authentication to any provider. If any Posthooks are available
    //   then it will give response details like nextCall and token for next call. Status code is 303
    //
    //   Another Scenario is no posthooks available. During that scenario user details will be given in response with statuscode 200
    app.post('/auth/complete',[jwtVerifyAuthComplete.verifyApiKey,jwt.verifyJWT], function(req, res) {

            //check if the nextCall is "/auth/complete"  expiry   and   authenticationType
            jwtVerifyAuthComplete.verifyAuthComplete(req.headers.token, function(err,payload) {

                if(err) {
                    res.send({error:"Not Authorised"}, 401);
                }
                else if ( config.posthooks && config.posthooks[payload.authenticationType]) {

                    var postHooks = config.posthooks[payload.authenticationType];
                    var totalNoOfPosthooks = postHooks.length;
                    var hookType = "posthook";
                    var authenticationType = payload.authenticationType;

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
                        userProfile     : payload.userProfile,
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
                            nextCall            : nextCall, //TODO :: Parse the json and check for type of method call
                            channelprovider     : channel, //TODO :: parse the JSON and get channel type then assign
                            token               : token
                        }
                        res.setHeader("Access-Control-Allow-Headers", "*");
                        res.setHeader('Content-Type', 'application/json');
                        res.setHeader("Access-Control-Allow-Origin", "*");
                        res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
                        res.send(responseJson, 303);
                    });
                }
                else {
                    res.setHeader("Access-Control-Allow-Headers", "*");
                    res.setHeader('Content-Type', 'application/json');
                    res.setHeader("Access-Control-Allow-Origin", "*");
                    res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
                    res.send(payload.userProfile, 200);
                }
            });
    });

}

module.exports = authComplete;
