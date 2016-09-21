/**
 * Created by 423919 on 6/17/2016.
 */
var chai = require('chai');
var chaiHttp = require('chai-http');
var should = chai.should();
var expect = require('chai').expect;
var request = require('supertest');
var server = require('../src/app.js');
chai.use(chaiHttp);
var otpCode, otpKey;
var index = require('../src/hooks/sendgridservice.js');
var twilio = require('../src/hooks/twilioservice.js');

/**
 * Test Suites
 */
describe('OTP Test Cases', function () {
    // Start the server before the test case with delay of 1second to instantiate the routers
    var inputSendgrid = {
        "channel": "sendgrid",
        "otp": {
            "otpLength": 5,
            "otpType": "numeric",
            "otpExpiryTime": 4
        },
        "sendgrid": {
            "accountSID": "r8skU2912a",
            "authToken": "BPRV4rL9N7jM9272",
            "toRecipient": "santhosh.reddy1@gmail.com",
            "fromMail": "SanthoshReddy.Tirumuru@cognizant.com"
        }
    };
    before(function (done) {
        this.request = chai.request(server);
        setTimeout(function () {
            done();
        }, 1000);
    });
    describe('Method POST', function () {
        it('should be able to Generate OTP and send via sendgrid', function (done) {
            this.request.post("/generate")
                .send(inputSendgrid)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.have.property('text');
                    var resBody = JSON.parse(res.text);
                    otpCode = resBody.otpCode;
                    otpKey = resBody.otpKey;
                    done();
                });


        });
    });

    describe('Method POST', function () {
        var inputTwilio = {
            "channel": "twilio",
            "otp": {
                "otpLength": 5,
                "otpType": "numeric",
                "otpExpiryTime": 4
            },
            "twilio": {
                "accountSID": "AC728b20a72ea48a175a0cf47d11a6aa56",
                "authToken": "1c84da28903505f762c727fe1bd65700",
                "toRecipient": "+919539168770",
                "fromNo": "+17758354685"
            }
        };
        it('should be able to Generate OTP and send via twilio', function (done) {
            this.request.post("/generate")
                .send(inputSendgrid)
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.have.property('text');
                    var resBody = JSON.parse(res.text);
                    otpCode = resBody.otpCode;
                    otpKey = resBody.otpKey;
                    done();
                });


        });
    });

    describe('Method POST', function () {
        it('should be able to validate OTP', function (done) {
            this.request.post('/validate')
                .send({"otpCode": otpCode, "otpKey": otpKey})
                .end(function (err, res) {
                    res.should.have.status(200);
                    res.should.have.property('text');
                    done();
                });
        });
    });


    describe('Logger Test Cases ', function () {
        it('should be able to POST logs to Graylog server', function (done) {
            this.request.post("/savelog")
                .send({"level": "INFO", "message": "test info message", "appid": "mochatests"})
                .set('Accept', 'application/json')
                .set('Content-Type', 'application/json')
                .end(function (err, res) {
                    res.should.have.status(200);
                    // res.should.have.property('text');
                    var resBody = JSON.parse(res.text);
                    console.log(resBody.level);
                    console.log(resBody.message);
                    done();
                });


        });
    });


});

describe("check whether sendgridservice is present or not", function () {
    it("should exist", function () {
        expect(index).to.not.be.undefined;
    });
});


describe("check Email Functionality", function () {
    var sendgridservice = new index();
    var options = {
        "accountSID": "r8skU2912a",
        "accountSID": "r8skU2912a",
        "authToken": "BPRV4rL9N7jM9272",
        "toRecipient": "neethu0746@gmail.com",
        "fromMail": "uppugandlasri1987@gmail.com",
        "subject": "Hello",
        "text": "Testing Sendgrid"
    };
    it("should exist", function (done) {

        sendgridservice.sendMail(options, function (err, result) {
            expect(err).to.be.a('null');
            done();


        });
    });
});


describe("check whether sendgridservice is present or not", function () {
    it("should exist", function () {
        expect(index).to.not.be.undefined;
    });
});

describe("check Email Functionality", function () {
    var twilioservice = new twilio();
    var options = {
        "accountSID": "AC728b20a72ea48a175a0cf47d11a6aa56",
        "authToken": "1c84da28903505f762c727fe1bd65700",
        "to": "+919539168770",
        "from": "+17758354685",
        "body": "mocha test for twilio"
    };
    it("should exist", function (done) {

        twilioservice.sendMessage(options, function (err, result) {
            expect(err).to.be.a('null');
            done();
        });
    });
});







