

const webpush_Mock = {
    setVapidDetails: function () { },
    sendNotification: function (receiver, data) { console.log('Send webpush to ' + receiver.id, [receiver, data]); return Promise.resolve(); }
};

var msgs = [];

const webpushHelper = {
    pushContent: function (msg) {
        msgs.push(msg);
        return Promise.resolve(msg);
    },
};

var pushStates = [];

var beforeYesterday = new Date();
beforeYesterday.setDate(beforeYesterday.getDate() - 2);

const firebase = {
    getPushState: function () { return Promise.resolve({ lastPushMessage: beforeYesterday }); },
    updatePushState: function (state) { pushStates.push(state); return Promise.resolve(state); },
    getRandomFact: function () { return { title: "test" } }
};

var helper = { makeObjectNot: 'false' };


var triggerLogic = require("../pushMessageTrigger.js")(firebase, webpushHelper, helper);

var assert = require('assert');
describe('#CheckTimeToRun', function () {
    it('should not run by default', function () {
        var pushState = {};
        var isTime = triggerLogic.isTimeToRun();
        assert.equal(false, isTime);
    });
    it('should run only tomorrow', function () {
        var isTime = triggerLogic.isTimeToRun({ lastPushMessage: new Date() },3600 * 24);
        assert.equal(false, isTime);
    });
    it('should run now, last run before yesterday', function () {
        var result = new Date();
        result.setDate(result.getDate() - 2);
        var isTime = triggerLogic.isTimeToRun({ lastPushMessage: result },3600 * 24);
        assert.equal(true, isTime);
    });

    it('should run now, every five minutes', function () {
        var result = new Date();
        result.setMinutes(result.getMinutes() - 10);
        var isTime = triggerLogic.isTimeToRun({ lastPushMessage: result },5 * 60);
        assert.equal(true, isTime);
    });

    it('should not run now, five minutes not passed', function () {
        var result = new Date();
        result.setMinutes(result.getMinutes() - 1);
        var isTime = triggerLogic.isTimeToRun({ lastPushMessage: result },5 * 60);
        assert.equal(false, isTime);
    });

});
describe('#SomeContentToPush', function () {
    beforeEach(function () {
        msgs = [];
        firebase.getSubscriptionsFromDatabase = function () { return Promise.resolve({}); };
        firebase.getCustomMesage = function () { return Promise.resolve(null); };
        firebase.getNewestFact = function (d) { return Promise.resolve(null); };
        firebase.getNewestImage = function (d) { return Promise.resolve(null); };
        helper.isLurinday = function () { return false; };
        helper.randomBool = function () { return false; };
        pushStates = [];
    });

    it('should push custom message', async function () {
        var msgText = 'testMsg';
        firebase.getCustomMesage = function () { return Promise.resolve(msgText); };
        var a = await triggerLogic.pushSomeContent(false);
        assert.equal(msgs.length, 1);
        assert.equal(msgs[0].pushMessage.type, 'custom');
        assert.equal(msgs[0].pushMessage.message, msgText);
    });

    it('should push new fact content', async function () {
        firebase.getNewestFact = function (d) { return Promise.resolve({ insertTime: new Date(), fact: 'blabla' }); };
        var a = await triggerLogic.pushSomeContent(false);
        assert.equal(msgs.length, 1);
        assert.equal(msgs[0].pushMessage.type, 'newfact');
    });

    it('should push new image content', async function () {
        firebase.getNewestImage = function (d) { return Promise.resolve({ insertTime: new Date(), imageTitle: 'blabla' }); };
        var a = await triggerLogic.pushSomeContent(false);
        assert.equal(msgs.length, 1);
        assert.equal(msgs[0].pushMessage.type, 'newimage');
    });

    it('should be lurin day', async function () {
        helper.isLurinday = function () { return true; }
        var a = await triggerLogic.pushSomeContent(false);
        assert.equal(msgs.length, 1);
        assert.equal(msgs[0].pushMessage.type, 'lurinday');
    });

    it('should push random fact', async function () {
        helper.randomBool = function () { return false; }
        firebase.getRandomFact = function (d) { return Promise.resolve({ insertTime: new Date(), fact: 'blabla' }); };
        var a = await triggerLogic.pushSomeContent(false);
        assert.equal(msgs.length, 1);
        assert.equal(msgs[0].pushMessage.type, 'randomfact');
    });

    it('should push random image', async function () {
        helper.randomBool = function () { return true; }
        firebase.getRandomImage = function (d) { return Promise.resolve({ insertTime: new Date(), imageTitle: 'blabla' }); };
        var a = await triggerLogic.pushSomeContent(false);
        assert.equal(msgs.length, 1);
        assert.equal(msgs[0].pushMessage.type, 'randomimage');
    });

    it('pushstate was updated twice', async function () {
        helper.randomBool = function () { return true; }
        firebase.getRandomImage = function (d) { return Promise.resolve({ insertTime: new Date(), imageTitle: 'blabla' }); };
        var a = await triggerLogic.pushSomeContent(false);
        assert.equal(pushStates.length, 2);
    });

    it('pushstate has an acutal lastPushDate', async function () {
        var now = new Date();
        helper.randomBool = function () { return true; }
        firebase.getRandomImage = function (d) { return Promise.resolve({ insertTime: new Date(), imageTitle: 'blabla' }); };
        var a = await triggerLogic.pushSomeContent(false);
        assert.equal(pushStates[0].lastPushMessage >= now, true);
        assert.equal(pushStates[1].lastPushMessage >= now, true);
    });

});