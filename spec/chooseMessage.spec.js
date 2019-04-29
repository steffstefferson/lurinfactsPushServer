const firebase = {
  getPushState: function() {
    return true;
  },
  updatePushState: function(state) {
    return true;
  },
  getNewestFact: function() {
    return Promise.resolve(null);
  },
  getNewestImage: function() {
    return Promise.resolve(null);
  }
};

var msgTrigger = require("./../functions/pushMessageTrigger.js");

var triggerLogic = msgTrigger(firebase, {});

var assert = require("assert");

var helper = {
  provideImage: function(insertTimeOfImage) {
    return function(t) {
      if (t > new Date()) {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        img: "url",
        insertTime: insertTimeOfImage || new Date()
      });
    };
  },
  provideFact: function(inserTimeOfFact) {
    return function(t) {
      if (t > new Date()) {
        return Promise.resolve(null);
      }
      return Promise.resolve({
        fact: "imafact",
        insertTime: inserTimeOfFact || new Date()
      });
    };
  }
};

describe("#CheckGetLatestContent", function() {
  it("has no new content", function() {
    return triggerLogic.getNewContentToPush({}).then(function(content) {
      assert.equal(null, content);
    });
  });

  it("has a new fact content", function() {
    firebase.getNewestFact = function() {
      return Promise.resolve({ fact: "imafact", insertTime: new Date() });
    };
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return triggerLogic
      .getNewContentToPush({ lastFactDate: yesterday })
      .then(function(content) {
        assert.notEqual(null, content);
        assert.equal("newfact", content.pushMessage.type);
      });
  });

  it("has a fact already pushed", function() {
    firebase.getNewestFact = helper.provideFact();
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return triggerLogic
      .getNewContentToPush({ lastFactDate: tomorrow })
      .then(function(content) {
        assert.equal(null, content);
      });
  });

  it("has a new image content", function() {
    firebase.getNewestFact = function() {
      return Promise.resolve(null);
    };
    firebase.getNewestImage = helper.provideImage();
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return triggerLogic
      .getNewContentToPush({ lastImageDate: yesterday })
      .then(function(content) {
        assert.notEqual(null, content);
        assert.equal("newimage", content.pushMessage.type);
      });
  });

  it("has a image already pushed", function() {
    firebase.getNewestFact = function() {
      return Promise.resolve(null);
    };
    firebase.getNewestImage = helper.provideImage();
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return triggerLogic
      .getNewContentToPush({ lastImageDate: tomorrow })
      .then(function(content) {
        assert.equal(null, content);
      });
  });

  it("update pushState lastFact function", function() {
    var newState = {};
    var today = new Date();
    firebase.getNewestFact = helper.provideFact(today);
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return triggerLogic
      .getNewContentToPush({ lastFactDate: yesterday })
      .then(function(content) {
        assert.notEqual(null, content.updateFn);
        assert.equal(today, content.updateFn(newState).lastFactDate);
      });
  });

  it("update pushState lastImage function", function() {
    var newState = {};
    var today = new Date();
    firebase.getNewestFact = function() {
      return Promise.resolve(null);
    };
    firebase.getNewestImage = helper.provideImage(today);
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return triggerLogic
      .getNewContentToPush({ lastImageDate: yesterday })
      .then(function(content) {
        assert.notEqual(null, content.updateFn);
        assert.equal(today, content.updateFn(newState).lastImageDate);
      });
  });
});
