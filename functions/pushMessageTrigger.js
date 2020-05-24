module.exports = function (refFirebase, webpushHelper, utility) {
  var firebase = refFirebase;
  // if no utility is passed we use this default utility
  var defaultUtils = {
    isLurinday: function () {
      return new Date().getMonth() == 9 && new Date().getDate() == 24;
    },
    randomBool: function () {
      return +new Date() % 2;
    },
  };
  var utils = utility || defaultUtils;

  const isTimeToRun = function (pushState, checkIsTimeToRun) {
    if (!pushState || !pushState.lastPushMessage) {
      return { isTimeToRun: false };
    }

    //define min time diffrence between push message.
    const minTimeDiffSecondsNewContent =
      (pushState && pushState.pushNewContentEveryXHours * 3600) || 3600 * 24;
    const minTimeDiffSecondsRandomContent =
      (pushState && pushState.pushRandomContentEveryXDays * 24 * 3600) ||
      3600 * 24;
    const minTimeToLurinDay = 3600 * 24;

    var isTime = function (timeDiff) {
      return (
        (new Date().getTime() - pushState.lastPushMessage) / 1000 > timeDiff
      );
    };

    const isTimeToPushNew =
      !checkIsTimeToRun || isTime(minTimeDiffSecondsNewContent);
    const isTimeToPushRandom =
      !checkIsTimeToRun || isTime(minTimeDiffSecondsRandomContent);
    const isTimeToLurinDay = isTime(minTimeToLurinDay);

    var isTimeToRun = isTimeToPushNew || isTimeToPushRandom || isTimeToLurinDay;
    return {
      isTimeToRun,
      isTimeToPushRandom,
      isTimeToPushNew,
      isTimeToLurinDay,
    };
  };

  const getNewContentToPush = function (pushState) {
    return firebase.getNewestFact(pushState.lastFactDate).then(function (fact) {
      if (fact) {
        return {
          pushMessage: createPushMsg(
            "newfact",
            "New wisdom about lurin",
            fact.fact + " | by " + fact.contributor,
            null,
            fact.itemKey
          ),
          updateFn: function (state) {
            state.lastFactDate = fact.insertTime;
            return state;
          },
        };
      }
      return firebase
        .getNewestImage(pushState.lastImageDate)
        .then(function (image) {
          if (image) {
            return {
              pushMessage: createPushMsg(
                "newimage",
                "Lurin is on another trip!",
                image.imageTitle + "\n " + image.funFact,
                null,
                image.imageKey
              ),
              updateFn: function (state) {
                state.lastImageDate = image.insertTime;
                return state;
              },
            };
          }
          return null;
        });
    });
  };

  const getRandomContentToPush = function (content) {
    if (utils.randomBool()) {
      return firebase.getRandomImage().then(function (image) {
        if (image) {
          return {
            pushMessage: createPushMsg(
              "randomimage",
              "Have you already been in?",
              image.imageTitle + "\n " + image.funFact,
              null,
              image.imageKey
            ),
            updateFn: function (state) {
              state.randomImage = state.randomImage || [];
              state.randomImage.push(image.imageKey);
              return state;
            },
          };
        }
        return null;
      });
    }
    return firebase.getRandomFact().then(function (fact) {
      if (fact) {
        return {
          pushMessage: createPushMsg(
            "randomfact",
            "Did you know?",
            fact.fact + " | by " + fact.contributor,
            null,
            fact.itemKey
          ),
          updateFn: function (state) {
            state.randomFact = state.randomFact || [];
            state.randomFact.push(fact.itemKey);
            return state;
          },
        };
      }
      return null;
    });
  };

  const createPushMsg = function (type, title, message, imageLink, itemKey) {
    return { title, message, type, imageLink, itemKey };
  };

  const pushSomeContentInternal = function (pushState, timeToRunResult) {
    return getContentInternal(pushState, timeToRunResult).then((content) => {
      if (content && content.pushMessage) {
        console.log(
          "gotAnyContent to push: " +
            content.pushMessage.type +
            " title : " +
            content.pushMessage.title
        );
        return webpushHelper
          .pushContent(content.pushMessage)
          .then(function (subscriptions) {
            return { subscriptions, content };
          });
      } else {
        return Promise.resolve({ result: "nocontenttopush" });
      }
    });
  };

  const getContentInternal = function (pushState, timeToRunResult) {
    if (timeToRunResult.isTimeToLurinDay && utils.isLurinday()) {
      var msg = {
        pushMessage: createPushMsg(
          "lurinday",
          "Happy lurinday everyone",
          "have a nice day!"
        ),
      };
      return Promise.resolve(msg);
    }
    if (timeToRunResult.isTimeToPushNew) {
      return getNewContentToPush(pushState).then((content) => {
        if (!content && timeToRunResult.isTimeToPushRandom) {
          return getRandomContentToPush(pushState);
        }
        return content;
      });
    }
    return getRandomContentToPush(pushState);
  };

  const pushSomeContent = function (skipTimeCheckKey) {
    return firebase.getPushState().then(function (pushState) {
      if (!pushState || !pushState.lastPushMessage) {
        return Promise.resolve({ result: "nopushstate" });
      }
      skipTimeCheckKey && console.log("skipTimeCheckKey: " + skipTimeCheckKey);
      var checkTimeToRun = !(
        pushState.skipTimeCheckKey &&
        skipTimeCheckKey == pushState.skipTimeCheckKey
      );
      var timeToRunResult = isTimeToRun(pushState, checkTimeToRun);
      if (!timeToRunResult.isTimeToRun) {
        return Promise.resolve({ result: "nottimetorun" });
      }
      console.log("its time to push something", timeToRunResult);

      pushState.lastPushMessage = +new Date();
      return firebase.updatePushState(pushState).then(function () {
        return pushSomeContentInternal(pushState, timeToRunResult).then(
          function (result) {
            const pushMessage = result.content && result.content.pushMessage;
            if (pushMessage) {
              var newPushState = result.content.updateFn
                ? result.content.updateFn(pushState)
                : pushState;
              return firebase
                .updatePushState(newPushState)
                .then(function (updateResult) {
                  return Promise.resolve({
                    result: "contentpushed",
                    pushMessage: pushMessage,
                  });
                });
            }
            return Promise.resolve({ result: "nocontent" });
          }
        );
      });
    });
  };

  const pushMessage = function (title, message) {
    var msg = createPushMsg("custom", title, message);
    return webpushHelper.pushContent(msg);
  };

  const pushMessageTo = function (title, message, receiver) {
    var msg = createPushMsg("custom", title, message);
    return webpushHelper.pushContentTo(msg, receiver);
  };

  return {
    isTimeToRun,
    getNewContentToPush,
    pushSomeContent,
    pushMessage,
    pushMessageTo,
  };
};
