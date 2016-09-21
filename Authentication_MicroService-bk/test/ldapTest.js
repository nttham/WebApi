
var chai = require('chai');
var chaiHttp = require('chai-http');
var should = chai.should();
var expect = require('chai').expect;
var server = require('../src/app.js');
chai.use(chaiHttp);


describe('LDAP Test Cases', function () {
    //Make sure the env variables are set. config, apiKey and secretKey should be present in env
    var apiKey = "75eb64c0-646e-11e6-b19a-e79951ac1354";
    var dn = "cn=santhosh,dc=people,dc=cts";
    var password = "password-1";
    var token;
    before(function (done) {
        this.request = chai.request(server);
        setTimeout(function () {
            done();
        }, 1000);
    });

    describe('Method POST /auth/ldap', function () {
        it('should be able to initiate LDAP authentication', function (done) {
            this.request.post("/auth/ldap")
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .set('apikey',apiKey)
                .end(function (err, res) {
                    console.log("Body after /auth/ldap API call : "+JSON.stringify(res.body));
                    res.should.have.status(303);
                    res.body.should.have.property('nextCall');
                    res.body.should.have.property('token');
                    res.should.have.property('text');
                    token = req.body.token;
                    done();
                });
        });
    });

    describe('Method POST /ldap', function () {
        it('should be able to authenticate against configured LDAP server', function (done) {
            this.request.post("/ldap")
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .set('token',token)
                .set('dn',dn)
                .set('password',password)
                .end(function (err, res) {
                    console.log("Body after LDAP authentication : "+JSON.stringify(res.body));
                    res.should.have.status(200);
                    res.body.should.have.property('message');
                    res.body.should.have.property('authFlag');
                    res.should.have.property('text');
                    done();
                });
        });
    });

});