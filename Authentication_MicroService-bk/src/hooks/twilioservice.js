/**
 * Created by 423919 on 5/23/2016.
 * This module is used to send sms
 */


//Read the config key value from env variables. This will return a JSON string with '=>' symbol in place of ':'
//Replace '=>' symbol with ':' to convert to JSON string and parse to retrieve JSON object
var envJson;
var config;
if(process.env.config) {
    envJson = process.env.config;
    envJson = envJson.replace(/=>/g, ':');
    config = JSON.parse(envJson);
}

if(config && config.configuration && config.configuration.twilio && config.configuration.twilio.accountid && config.configuration.twilio.accounttoken){
    var client = require('twilio')(config.configuration.twilio.accountid, config.configuration.twilio.accounttoken);
}

var TwilioService = function () {

};

// this api will configure the twilio obj and send the sms
TwilioService.prototype.sendMessage = function (twilioObj, callback) {
    if(config.configuration.twilio.accountid && config.configuration.twilio.accountid) {
        var message = {
            to: twilioObj.to,
            from: twilioObj.from,
            body: twilioObj.body
        };
        var respData = {};

        client.sendSms(message, function (error, message) {
            if (!error) {
                respData.status = 'Success! The SID for this SMS message is:' + message.sid;
                respData.sentDate = message.dateCreated;
                return callback(null, respData);

            } else {
                respData.status = 'Oops! There was an error.' + JSON.stringify(error);
                return callback(respData);
            }
        });
    }else{
        return callback({error :"accountid or accounttoken missing "})
    }

};

module.exports = TwilioService;
