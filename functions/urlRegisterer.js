module.exports = function (pushMessageTrigger, firebaseLibrary) {

    const isValidSaveRequest = (req, res) => {
        // Check the request body has at least an endpoint.
        if (!req.body || !req.body.endpoint || !req.body.keys.auth || !req.body.keys.p256dh) {
            // Not a valid subscription.
            res.status(400);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({
                error: {
                    id: 'no-valid-subscription',
                    message: 'Subscription must have an endpoint. keys.auth and keys.p256dh'
                }
            }));
            return false;
        }
        return true;
    };

    const sayHello = function (req, res) {
        res.send('Hello World!');
    };

    const isAllowed = function (key) {
        return firebaseLibrary.getPushState().then(pushState => {
            const isAllowed = (pushState.customMessageKey && key == pushState.customMessageKey);
            if (!isAllowed) {
                throw Exception('not allowed');
            }
            return true;
        });
    };

    const pushMessage = function (req, res) {

        var message = req.body.message;
        if (!message || !message.message || !message.title) {
            throw Exception("invalid request body");
        }

        var fn = function () {
            return pushMessageTrigger.pushMessage(message.title, message.message);
        }
        return pushMessageInternal(req.query.customMessageKey, fn, res);
    };

    const pushMessageTo = function (req, res) {

        var message = req.body.message;
        var receiver = req.body.to;
        if (!receiver || !message || !message.message || !message.title) {
            throw Exception("invalid request body");
        }

        var fn = function () {
            return pushMessageTrigger.pushMessageTo(message.title, message.message, receiver);
        }
        return pushMessageInternal(req.query.customMessageKey, fn, res);
    };

    const pushMessageInternal = function (key, fn, res) {
        isAllowed(key).then(() => {
            return fn().then(() => {
                console.log('pushMessageInternal.pushMessage successful');
                res.setHeader('Content-Type', 'application/json');
                res.send(JSON.stringify({ data: { success: true } }));
            });
        }).catch(function (err) {
            console.log('pushMessageInternal:Error:' + err.message);
            res.status(500);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({
                error: {
                    id: 'unable-to-send-messages',
                    message: `We were unable to send messages : ` + `'${err.message}'`
                }
            }));
        });
    };

    const pushContent = function (req, res) {
        var skipTimeCheckKey = req.query.skipTimeCheckKey;
        pushMessageTrigger.pushSomeContent(skipTimeCheckKey).then((result) => {
            console.log('pushMessageTrigger.pushSomeContent successful: ' + result.result);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ data: { success: true } }));
        }).catch(function (err) {
            console.log('pushContent:Error:' + err.message);
            res.status(500);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({
                error: {
                    id: 'unable-to-send-messages',
                    message: `We were unable to send messages to all subscriptions : ` + `'${err.message}'`
                }
            }));
        });
    };

    const registerPush = function (req, res) {
        if (!isValidSaveRequest(req, res)) {
            return;
        }
        const ok = () => {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ data: { success: true } }));
        };

        return firebaseLibrary.saveSubscriptionToDatabase(req.body).then(function (alreadyExists) {
            if (!alreadyExists) {
                return pushMessageTrigger.pushMessageTo('Lurin knew it!', 'You would register for web push! Stay tuned.', req.body).then(() => {
                    ok();
                });
            }
            ok();
        }).catch(function (err) {
            res.status(500);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({
                error: {
                    id: 'unable-to-save-subscription',
                    message: 'The subscription was received but we were unable to save it to our database.'
                }
            }));
        });
    };

    const unregisterPush = function (req, res) {
        if (!isValidSaveRequest(req, res)) {
            return;
        }
        return firebaseLibrary.deleteSubscriptionFromDatabase(req.body).then(function () {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ data: { success: true } }));
        }).catch(function (err) {
            res.status(500);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({
                error: {
                    id: 'unable-to-delete-subscription',
                    message: 'The subscription was received but we were unable to save it to our database.'
                }
            }));
        });
    };

    return { unregisterPush, registerPush, pushMessage, pushMessageTo, sayHello, pushContent };
};