
module.exports = function (refFirebase, webpushHelper, utility) {
    var firebase = refFirebase;
    // if no utility is passed we use this default utility
    var defaultUtils = {
        isLurinday: function () { return new Date().getMonth() == 9 && new Date().getDate() == 24 },
        randomBool: function () { return +new Date() % 2; }
    };
    var utils = utility || defaultUtils;
    var webpushLibary = webpushHelper;

    const isTimeToRun = function (pushState) {
        //define min time diffrence between push message.
        minTimeDiffSeconds = pushState && pushState.pushEveryXHours * 3600 || 3600 * 24;

        if (!pushState || !pushState.lastPushMessage) {
            return false;
        }

        if ((new Date().getTime() - pushState.lastPushMessage) / 1000 > minTimeDiffSeconds) {
            return true;
        }
        return false;
    };

    const getNewContentToPush = function (pushState) {
        return firebase.getNewestFact(pushState.lastFactDate).then(function (fact) {
            if (fact) {
                return {
                    pushMessage: createPushMsg('newfact', 'New wisdom about lurin', fact.fact + ' | by ' + fact.contributor,null,fact.itemKey),
                    updateFn: function (state) {
                        state.lastFactDate = fact.insertTime;
                        return state;
                    }
                };
            }
            return firebase.getNewestImage(pushState.lastImageDate).then(function (image) {
                if (image) {
                    return {
                        pushMessage: createPushMsg('newimage', 'Lurin is on another trip!', image.imageTitle + '\n ' + image.funFact,null,image.imageKey),
                        updateFn: function (state) {
                            state.lastImageDate = image.insertTime;
                            return state;
                        }
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
                        pushMessage: createPushMsg('randomimage', 'Have you already be in?', image.imageTitle + '\n ' + image.funFact, null,image.imageKey),
                        updateFn: function (state) {
                            state.randomImage = state.randomImage || [];
                            state.randomImage.push(image.imageKey);
                            return state;
                        }
                    };
                }
                return null;
            });
        }
        return firebase.getRandomFact().then(function (fact) {
            if (fact) {
                return {
                    pushMessage: createPushMsg('randomfact', 'Did you know?', fact.fact + ' | by ' + fact.contributor,null,fact.itemKey),
                    updateFn: function (state) {
                        state.randomFact = state.randomFact || [];
                        state.randomFact.push(fact.itemKey);
                        return state;
                    }
                };
            }
            return null;
        })

    };

    const createPushMsg = function (type, title, message, imageLink,itemKey) {
        return { title, message, type, imageLink,itemKey };
    }

    const getCustomMessage = function () {
        return firebase.getCustomMesage().then(function (msg) {
            if (!msg) return null;
            return { pushMessage: createPushMsg('custom', 'Lurin has a message for you.', msg) };
        });
    };

    const pushSomeContentInternal = function (pushState) {
        if (utils.isLurinday()) {
            var msg = { pushMessage: createPushMsg('lurinday', 'Happy lurinday everyone', 'have a nice day!') };
            return webpushHelper.pushContent(msg);
        }

        return getAnyContent(pushState).then(function (content) {
            if (content) {
                console.log('gotAnyContent to push: ' + content.pushMessage.type + ' title : ' + content.pushMessage.title);
                return webpushHelper.pushContent(content.pushMessage).then(function (subscriptions) {
                    return { subscriptions, content };
                });
            } else {
                return Promise.resolve({ result: 'nocontenttopush' });
            }
        });
    };

    const getAnyContent = function (pushState) {
        return getCustomMessage().then(function (content) {
            if (!content) {
                return getNewContentToPush(pushState).then(function (content) {
                    if (!content) {
                        return getRandomContentToPush(pushState);
                    }
                    return content;
                });
            }
            return content;
        });
    };

    const pushSomeContent = function (skipTimeCheckKey) {

        return firebase.getPushState().then(function (pushState) {

            if (!pushState || !pushState.lastPushMessage) {
                return Promise.resolve({ result: 'nopushstate' });
            }
            skipTimeCheckKey && console.log('skipTimeCheckKey: '+skipTimeCheckKey);
            var checkTimeToRun = !(pushState.skipTimeCheckKey && skipTimeCheckKey == pushState.skipTimeCheckKey);

            if (checkTimeToRun && !isTimeToRun(pushState)) {
                return Promise.resolve({ result: 'nottimetorun' });
            };
            console.log('its time to push something');

            pushState.lastPushMessage = +new Date();
            return firebase.updatePushState(pushState).then(function () {
                return pushSomeContentInternal(pushState).then(function (result) {
                    const content = result.content;
                    if (content) {
                        var newPushState = content.updateFn ? content.updateFn(pushState) : pushState;
                        return firebase.updatePushState(newPushState).then(function (updateResult) {
                            return Promise.resolve({ result: 'contentpushed', content: content });
                        });
                    }
                    return Promise.resolve({ result: 'nocontent' });
                });
            });
        });
    };

    const pushMessage = function (msg) {
        var msg = { pushMessage: { type: 'custom', data: msg } };
        return webpushHelper.pushContent(msg);
    };

    return { isTimeToRun, getNewContentToPush, pushSomeContent, pushMessage };
};