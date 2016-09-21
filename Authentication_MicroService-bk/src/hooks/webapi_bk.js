/**
 * Created by 423919 on 5/18/2016.
 * This is the Otp module which generate a token and validate the same
 */
// dependencies for this module

var randomString = require("randomstring");
var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var Jwt = require("./../jwt/jwt.js");
var async = require('async');
var constants = require('./../constants.json');
var validator = require('is-my-json-valid');
var validatorSchema = require('./requestschema/webapi.json');
var request = require('request');

//constructor
var WebApi = function () {

};


//Read the config key value from env variables. This will return a JSON string with '=>' symbol in place of ':'
//Replace '=>' symbol with ':' to convert to JSON string and parse to retrieve JSON object
var envJson;
var config;
if (process.env.config) {
    envJson = process.env.config;
    envJson = envJson.replace(/=>/g, ':');
    config = JSON.parse(envJson);
    webApiConfig = config.configuration.httpRequest;

}


// validating the Jwt and get the decodedInfo
var validateJwt = function(request,callback){


    var jwtToken = request.headers.token; //getting the Jwt token from headers
    var onCallback = function(err,result){
        if(err){

            return callback(err);
        }
        else{
            var RequestObj = {};
            RequestObj.tokenDetails = result;
            RequestObj.request =  request; // inserting the request input params for further processing in proceeding calls

            return callback(null,RequestObj)
        }
    }
    Jwt.validateJWT(jwtToken,onCallback);
};

var getConfigJson = function(restApiDetails,callback){



    if(Object.keys(webApiConfig).length === 0){
        return callback({error:"kindly configure for webapi"});
    }else{
        var options = {};
        var webConfig = {};
        var req = restApiDetails.request;

        if(req.apiType === constants.generate){
            webConfig = webApiConfig.contentGenerationEndPoint;
        } else if(req.apiType === constants.validate){
            webConfig = webApiConfig.validationEndpoint;
        }
        var validate = validator(validatorSchema);
        if(validate(webConfig).length){

            return callback(validate.errors);
        }
        else{
            //webConfig.req = restApiDetails;
            webConfig.apiType = req.apiType;
            webConfig.tokenDetails = restApiDetails.tokenDetails;
            return callback(null,webConfig);
        }

    }


};

var getPathUrl = function(inputRequest,callback){

    var url = inputRequest.url

    var replace =  function(replaceStr,callback){
        var key = Object.keys(replaceStr)[0]
        var searchStr = ":"+key;

        var replaced =  url.replace(searchStr, replaceStr[key]);
        url = replaced;

        return callback(null,url);
    }
    var finalCallback = function(err,result){
        if(err){
            return callback(err);
        }
        else{
            delete inputRequest.url;
            inputRequest.url = result[result.length - 1];
            return callback(null,inputRequest);
        }
    }
    if(inputRequest.path.length) {

        async.map(inputRequest.path, replace, finalCallback);
    }
    else{

        delete inputRequest.url;
        inputRequest.url = url
        callback(null,inputRequest) ;
    }
};

// creates a JWT token
var createJwt = function(input,callback){
    var nextCall = '',userProfile = {};

    var statusCode;
    var channelprovider,message;

    var tokenDetails = input.tokenDetails;
    if(input.apiType === constants.generate) {

        delete tokenDetails.iat;
        delete tokenDetails.request
        tokenDetails.iat = Math.floor(Date.now() / 1000) - 30 //TODO :: Check this if this is reqd for expiry -- backdate a jwt 30 seconds
        tokenDetails.statusCode = 303;
        tokenDetails.nextCall = '/webapi?type=validate';
    }
    else{
        delete tokenDetails.otpExpiryTime;
        delete tokenDetails.otpCode;
        delete tokenDetails.expiresIn;
        delete tokenDetails.request;
        tokenDetails.expiresIn = constants.expiresIn;

        //creates payload for Jwt
        if(tokenDetails.currentHook < tokenDetails.totalNoOfhooks){

            tokenDetails.currentHook = (tokenDetails.currentHook + 1);

            if(tokenDetails.hooks[tokenDetails.currentHook - 1 ].channel === 'OTP'){
                tokenDetails.nextCall = '/generateOtp';
                channelprovider = tokenDetails.hooks[tokenDetails.currentHook - 1 ].channelprovider;
                tokenDetails.statusCode = 303
            }
            if(tokenDetails.hooks[tokenDetails.currentHook - 1].channel === 'Captcha'){
                tokenDetails.nextCall = '/generateCaptcha';
                tokenDetails.statusCode = 303;
            }
            if(tokenDetails.hooks[tokenDetails.currentHook - 1].channel === 'WebApIHook'){
                tokenDetails.nextCall = '/webapi?type=generate';
                tokenDetails.statusCode = 303;
            }
        }else if(tokenDetails.hookType == 'prehook'){
            delete tokenDetails.hooks;
            delete tokenDetails.totalNoOfhooks;
            delete tokenDetails.currentHook;
            delete tokenDetails.hookType;
            tokenDetails.isPrehookClear = true;
            tokenDetails.nextCall = '/'+tokenDetails.authenticationType;
            tokenDetails.statusCode = 302;
            tokenDetails.message =  "pass callbackUrl as query param"

        }
        else if(tokenDetails.hookType == 'posthook'){
            delete tokenDetails.hooks;
            delete tokenDetails.totalNoOfhooks;
            delete tokenDetails.currentHook;
            delete tokenDetails.hookType;
            userProfile = tokenDetails.userProfile;
            tokenDetails.statusCode = 200;

        }


        delete tokenDetails.iat;
        tokenDetails.iat = Math.floor(Date.now() / 1000) - 30 //TODO :: Check this if this is reqd for expiry -- backdate a jwt 30 seconds


    }

    var oncallback = function (err, token) {
        if (err) {
            return callback(err);
        }
        else {
            if(input.apiType === constants.generate) {
                input.token = token;
                return callback(null, input);
            }
            else{

                var resp = {};


                if(tokenDetails.nextCall === ("/"+tokenDetails.authenticationType) && tokenDetails.protocol === "oauth") {

                    var nextCall = tokenDetails.nextCall;
                    delete tokenDetails.nextCall;
                    delete tokenDetails.message;
                    tokenDetails.nextCall = nextCall + "/" + token;
                    tokenDetails.message    =   "pass callbackUrl as query param";
                    tokenDetails.statusCode = 302;

                }
                else if(tokenDetails.nextCall === ("/"+tokenDetails.authenticationType) ){ // for anyother call other than oauth (ie ldap ..) will have 303 status
                    delete tokenDetails.nextCall;
                    delete tokenDetails.token;
                    delete tokenDetails.statusCode
                    tokenDetails.nextCall = nextCall;
                    tokenDetails.token = token;
                    tokenDetails.statusCode = 303;

                }


                if(tokenDetails.nextCall === '/generateOtp'){
                    delete tokenDetails.channelprovider
                    tokenDetails.channelprovider = channelprovider;
                }

                if(userProfile && Object.keys(userProfile).length) {

                    return callback(null, userProfile);
                }
                else{
                    input.token = token;


                    return callback(null, input);
                }
            }

        }
    }
    Jwt.generateJWT(tokenDetails, oncallback);

};


WebApi.prototype.manageWebApi = function (app) {

    app.post("/webapi/generate", function (req, res) {

        if(req.headers.token && ((req.query.type === constants.generate) || (req.query.type === constants.validate) )){

            req.apiType = req.query.type;
            var performRequest = function(err,inputRequest) {

                if (err) {

                    res.send({"error": err}, 400);
                }
                else {

                    var options = {};
                    options.uri = inputRequest.url;
                    if (Object.keys(inputRequest.query).length !== 0) {
                        options.qs = inputRequest.query;
                    }
                    if (Object.keys(inputRequest.headers).length !== 0) {
                        options.headers = inputRequest.headers;
                    }
                    if (Object.keys(inputRequest.body).length !== 0) {
                        options.json = inputRequest.body;
                    }

                    options.method = inputRequest.method;

                    if(inputRequest.token) {
                        res.setHeader("Token", inputRequest.token);
                    }
                    if(inputRequest.tokenDetails.message) {
                        res.setHeader("message", inputRequest.tokenDetails.message);
                    }
                    if(inputRequest.tokenDetails.nextCall) {
                        res.setHeader("nextCall", inputRequest.tokenDetails.nextCall);
                    }
                    if(inputRequest.tokenDetails.channelprovider) {
                        res.setHeader("channelprovider", inputRequest.tokenDetails.channelprovider);
                    }

                    request(options).on('response', function(response) {

                            if(response.statusCode === 200) {
                                delete response.statusCode;
                                response.statusCode = inputRequest.tokenDetails.statusCode;

                            }

                        })
                        .pipe(res);

                }

            } ;

            async.waterfall([validateJwt.bind(null,req),getConfigJson,getPathUrl,createJwt],performRequest);

        }else{
            res.setHeader("Access-Control-Allow-Headers", "*");
            res.setHeader('Content-Type', 'application/json');
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE");
            res.send({"error":"Not authorised"}, 401);
        }


    });



};




module.exports = WebApi;
