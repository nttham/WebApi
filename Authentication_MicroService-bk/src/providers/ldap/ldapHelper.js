module.exports = LDAPHelper;

var ldap = require('ldapjs');
function LDAPHelper() {
}

//Public function to be used for authentication
//  Below parameters are required for this function  
//      configDetails object - ldapUrl, logger
//      userDetails object   - userName, password
LDAPHelper.prototype.authenticate = function (configDetails, userDetails, callback) {
    var ldapURL = configDetails.ldapUrl;
    var clientUserName = userDetails.userName;
    var clientPassword = userDetails.password;
    var logger = configDetails.logger;
    clientBind(clientUserName, clientPassword, ldapURL, logger, function (error, authFlag, client) {
        if(error) {
            console.log(error.message);
            callback(error, authFlag);
        }
        else {
            client.unbind();
            callback(error, authFlag);
        }
    })
}

//Private function for user bind check against ldap
function clientBind(userName, password, ldapUrl, logger, callback) {
    var authenticationFlag = false;
    var authClient;
    authClient = ldap.createClient({
        "url": ldapUrl
    })
    try {
        authClient.bind(userName, password, function (err) {
            if (err) {
                callback(err, authenticationFlag, authClient);
            }
            else {
                authenticationFlag = true;
                callback(err, authenticationFlag, authClient);
            }
        });
    }
    catch(error) {
        console.log(error);
        callback(error, authenticationFlag, authClient);
    }
}

// Public function for getting user details
LDAPHelper.prototype.getUserDetails = function (configDetails, samAccountName, callback) {

    clientBind(configDetails.userName, configDetails.password, configDetails.ldapUrl, configDetails.logger, function (bindError, authenticationFlag, adminUser) {
        var logger = configDetails.logger;
        if (bindError === null) {
            var opts = {
                "filter": "(&(objectCategory=User)(|(sAMAccountName=" + samAccountName + ")(userPrincipalName=" + samAccountName + ")))",
                "scope": "sub",
                "attributes": configDetails.attributes
            };

            clientSearch(configDetails.baseDN, adminUser, opts, configDetails.logger, function (searchResult, searchError) {
                adminUser.unbind();
                callback(bindError, searchError, searchResult);
            })
        }
        else {
            adminUser.unbind();
            callback(bindError, null, null);
        }
    })
}

//Private function for searching an user/group against an LDAP server
function clientSearch(baseDN, adminUser, opts, logger, callback) {
    var searchResult = [];
    adminUser.search(baseDN, opts, function (err, res) {
        res.on('searchEntry', function (entry) {
            var eachEntry = entry.object;
            delete eachEntry.controls;
            searchResult.push(eachEntry)
        });
        res.on('error', function (err) {
            callback(searchResult, err);
        });
        res.on('end', function () {
            callback(searchResult, err);
        });
    });
}

// Public function for getting group details
LDAPHelper.prototype.getGroupDetails = function (configDetails, groupName, callback) {
    clientBind(configDetails.userName, configDetails.password, configDetails.ldapUrl, configDetails.logger, function (bindError, authenticationFlag, adminUser) {
        if (bindError === null) {
            var opts = {"filter": "(&(objectCategory=Group)(cn=" + groupName + "))",
                "scope": "sub",
                "attributes": ["objectCategory", "distinguishedName", "cn", "description", "member"]};
            clientSearch(configDetails.baseDN, adminUser, opts, configDetails.logger, function (searchResult, searchError) {
                adminUser.unbind();
                callback(bindError, searchError, searchResult);
            })
        }
        else {
            adminUser.unbind();
            callback(bindError, null, null);
        }
    });
}
