const webpush_Mock = {
  setVapidDetails: function() {},
  sendNotification: function(receiver, data) {
    console.log("Send webpush to " + receiver.id, [receiver, data]);
    return Promise.resolve();
  }
};

var msgs = [];

const webpushHelper = {
  pushContent: function(msg) {
    msgs.push(msg);
    return Promise.resolve([{ subscriber: "A" }, { subscriber: "B" }]);
  }
};

var pushStates = [];

var beforeYesterday = new Date();
beforeYesterday.setDate(beforeYesterday.getDate() - 2);

const firebase = {
  getPushState: function() {
    return Promise.resolve({ lastPushMessage: beforeYesterday });
  },
  updatePushState: function(state) {
    pushStates.push(state);
    return Promise.resolve(state);
  },
  getRandomFact: function() {
    return Promise.resolve({ title: "test" });
  }
};

var helper = { makeObjectNot: "false" };

var triggerLogic = require("./../functions/pushMessageTrigger.js")(
  firebase,
  webpushHelper,
  helper
);

var assert = require("assert");

describe("#SomeContentToPush", function() {
  beforeEach(function() {
    msgs = [];
    firebase.getSubscriptionsFromDatabase = function() {
      return Promise.resolve({});
    };
    firebase.getCustomMesage = function() {
      return Promise.resolve(null);
    };
    firebase.getNewestFact = function(d) {
      return Promise.resolve(null);
    };
    firebase.getNewestImage = function(d) {
      return Promise.resolve(null);
    };
    helper.isLurinday = function() {
      return false;
    };
    helper.randomBool = function() {
      return false;
    };
    pushStates = [];
  });

  it("should push new fact content", async function() {
    var beforeNow = new Date() - 4;
    var now = new Date();
    firebase.getNewestFact = function(d) {
      return Promise.resolve({ insertTime: beforeNow, fact: "blabla" });
    };
    var a = await triggerLogic.pushSomeContent(false);
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].type, "newfact");
    assert.equal(pushStates[0].lastFactDate == beforeNow, true);
    assert.equal(pushStates[1].lastPushMessage >= now, true);
  });

  it("should push new image content", async function() {
    var beforeNow = new Date() - 4;
    var now = new Date();
    firebase.getNewestImage = function(d) {
      return Promise.resolve({
        insertTime: beforeNow,
        imageTitle: "blabla"
      });
    };
    var a = await triggerLogic.pushSomeContent(false);
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].type, "newimage");
    assert.equal(pushStates[0].lastImageDate == beforeNow, true);
    assert.equal(pushStates[1].lastPushMessage >= now, true);
  });

  it("should be lurin day", async function() {
    helper.isLurinday = function() {
      return true;
    };
    var a = await triggerLogic.pushSomeContent(false);
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].type, "lurinday");
  });

  it("should push random fact", async function() {
    helper.randomBool = function() {
      return false;
    };
    firebase.getRandomFact = function(d) {
      return Promise.resolve({ insertTime: new Date(), fact: "blabla" });
    };
    var a = await triggerLogic.pushSomeContent(false);
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].type, "randomfact");
  });

  it("should push random image", async function() {
    helper.randomBool = function() {
      return true;
    };
    firebase.getRandomImage = function(d) {
      return Promise.resolve({ insertTime: new Date(), imageTitle: "blabla" });
    };
    var a = await triggerLogic.pushSomeContent(false);
    assert.equal(msgs.length, 1);
    assert.equal(msgs[0].type, "randomimage");
  });

  it("pushstate was updated twice", async function() {
    helper.randomBool = function() {
      return true;
    };
    firebase.getRandomImage = function(d) {
      return Promise.resolve({ insertTime: new Date(), imageTitle: "blabla" });
    };
    var a = await triggerLogic.pushSomeContent(false);
    assert.equal(pushStates.length, 2);
  });

  it("pushstate has an acutal lastPushDate", async function() {
    var now = new Date();
    helper.randomBool = function() {
      return true;
    };
    firebase.getRandomImage = function(d) {
      return Promise.resolve({ insertTime: new Date(), imageTitle: "blabla" });
    };
    var a = await triggerLogic.pushSomeContent(false);
    assert.equal(pushStates[0].lastPushMessage >= now, true);
    assert.equal(pushStates[1].lastPushMessage >= now, true);
  });
});
