/**
 * Created by 423919 on 5/23/2016.
 * This module is used to send email
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
if(config && config.configuration && config.configuration.sendgrid && config.configuration.sendgrid.accountid && config.configuration.sendgrid.accounttoken) {
    var sendgrid = require('sendgrid')(config.configuration.sendgrid.accountid, config.configuration.sendgrid.accounttoken);
}
var Sendmail = function () {

};

// this api will configure the sendgrid obj and send the sms
Sendmail.prototype.sendMail = function (mailObj, callback) {
    try {

        if(config.configuration.sendgrid.accountid && config.configuration.sendgrid.accounttoken) {
            var message = {
                "to": mailObj.toRecipient,
                "from": mailObj.fromMail,
                "subject": mailObj.subject,
                "text": mailObj.text
            };

            var email = new sendgrid.Email(message);

            sendgrid.send(email, function (error, message) {
                if (!error) {
                    return callback(null, message);

                } else {
                    return callback(error);
                }
            });
        }
        else{
            return callback({error :"accountid or accounttoken missing "})
        }
    }
    catch(err){
        return callback(err);
    }
}

module.exports = Sendmail;
