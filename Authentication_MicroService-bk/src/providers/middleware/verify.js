var envJson;
var config;
if(process.env.config) {
    envJson = process.env.config;
    envJson = envJson.replace(/=>/g, ':');
    config = JSON.parse(envJson);
}


//verify if callbackUrl is present in query params
exports.verifyOauthRequest = function (req, res, next) {
    if(req.query.callbackUrl) {
        next();
    }
    else {
        res.send({error:"Bad Request. No callbackUrl found in query parameters"}, 400);
    }
};

//verify if callbackUrl is present in query params and also store callbackUrl in session
exports.verifyTwitterOauthRequest = function (req, res, next) {
    if(req.query.callbackUrl) {
        res.cookie('callbackUrl', req.query.callbackUrl, {httpOnly: true});
        next();
    }
    else {
        res.send({error:"Bad Request. No callbackUrl found in query parameters"}, 400);
    }
};


//verify if all required credentials available in VCAP for Facebook
exports.verifyFacebook = function (req, res, next) {
    if (config.configuration && config.configuration.facebook && config.configuration.facebook.clientID && config.configuration.facebook.clientSecret && config.configuration.facebook.scope) {
        next();
    }
    else {
        res.send({error:"Not found"}, 404);
    }
};

//verify if all required credentials available in VCAP for Google
exports.verifyGoogle = function (req, res, next) {
    if (config.configuration && config.configuration.google && config.configuration.google.clientID && config.configuration.google.clientSecret && config.configuration.google.scope) {
        next();
    }
    else {
        res.send({error:"Not found"}, 404);
    }
};

//verify if all required credentials available in VCAP for Linkedin
exports.verifyLinkedin = function (req, res, next) {
    if (config.configuration && config.configuration.linkedin && config.configuration.linkedin.clientID && config.configuration.linkedin.clientSecret && config.configuration.linkedin.scope) {
        next();
    }
    else {
        res.send({error:"Not found"}, 404);
    }
};

//verify if all required credentials available in VCAP for Twitter
exports.verifyTwitter = function (req, res, next) {
    if (config.configuration && config.configuration.twitter && config.configuration.twitter.clientID && config.configuration.twitter.clientSecret) {
        next();
    }
    else {
        res.send({error:"Not found"}, 404);
    }
};

//verify if dn and password is present in Headers
exports.verifyLdapRequest = function (req, res, next) {
    if(req.headers.dn && req.headers.password) {
        if (req.headers.token) {
            next();
        }
        else {
            console.log("Token in headers missing");
            res.send({"error":"token missing in headers"}, 400);
        }
    }
    else {
        console.log("Credentials missing");
        res.send({"error":"credentials missing in headers"}, 400);
    }
};


//verify if all required credentials available in VCAP for customOauth
exports.verifycustomOauth = function (req, res, next) {

    if (config && config.configuration && config.configuration.custom && config.configuration.custom.clientID && config.configuration.custom.clientSecret) {
        next();
    }
    else {
        res.send({error:"Not found"}, 404);
    }
};
