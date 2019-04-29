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
    return Promise.resolve(msg);
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
describe("#CheckTimeToRun", function() {
  it("should not run by default", function() {
    var pushState = {};
    var isTime = triggerLogic.isTimeToRun();
    assert.equal(false, isTime.isTimeToRun);
  });

  it("should run only tomorrow", function() {
    var isTime = triggerLogic.isTimeToRun(
      { lastPushMessage: new Date() },
      true
    );
    assert.equal(false, isTime.isTimeToRun);
  });
  it("should run now, one day passed", function() {
    var result = new Date();
    var oneDayInMs = 3600 * 25 * 1000;
    result = new Date(result.getTime() - oneDayInMs);
    var isTime = triggerLogic.isTimeToRun({ lastPushMessage: result }, true);
    assert.equal(true, isTime.isTimeToRun);
  });

  it("should not run now, one day not passed", function() {
    var result = new Date();
    var almostOneDayInMs = 3600 * 23 * 1000;
    result = new Date(result.getTime() - almostOneDayInMs);
    var isTime = triggerLogic.isTimeToRun({ lastPushMessage: result }, true);
    assert.equal(false, isTime.isTimeToRun);
  });
});
