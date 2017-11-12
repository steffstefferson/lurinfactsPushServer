const functions = require('firebase-functions');
const adminOnFire = require("firebase-admin");
const path = __dirname + "//";
const settings = require(path + "settings.json");
const cors = require('cors')({origin: true});

adminOnFire.initializeApp({
    credential: adminOnFire.credential.cert(settings.serviceAccount),
    databaseURL: settings.databaseUrl
});

const db = adminOnFire.database();

const firebaseLibrary = require(path + "firebaseLibrary.js")(db);
const pushHelper = require(path + "pushHelper.js")(firebaseLibrary, settings.isPushMocked ? null : require('web-push'));
const pushMessageTrigger = require(path + "pushMessageTrigger.js")(firebaseLibrary, pushHelper);

pushHelper.setVapidDetails(
    'mailto:info.stef.kaeser@gmail.com',
    settings.vapidKeys.publicKey,
    settings.vapidKeys.privateKey
);

const urlRegisterer = function () {
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

    const isValidPushRequest = (req, res) => {
        // Check the request body has at least an endpoint.
        if (!req.body || !req.body.pushType) {
            // Not a valid subscription.
            res.status(400);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({
                error: {
                    id: 'no-valid-push-message',
                    message: 'Subscription must have a body and a pushType'
                }
            }));
            return false;
        }
        return true;
    };

    const sayHello = function (req, res) {
        res.send('Hello World!');
    };

    const pushMessage = function (req, res) {
        if (!isValidPushRequest(req, res)) {
            return false;
        }
        req.body.timestamp = new Date();
        var message = JSON.stringify(req.body);
        pushMessageTrigger.pushMessage(message).then(() => {
            console.log('pushMessageTrigger.pushMessage successful');
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ data: { success: true } }));
        }).catch(function (err) {
            console.log('pushMessage:Error:'+err.message);
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

    const pushContent = function (req, res) {
        var skipTimeCheckKey = req.body;
        pushMessageTrigger.pushSomeContent(skipTimeCheckKey).then((result) => {
            console.log('pushMessageTrigger.pushSomeContent successful: '+result.result);
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ data: { success: true } }));
        }).catch(function (err) {
            console.log('pushContent:Error:'+err.message);
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
        return firebaseLibrary.saveSubscriptionToDatabase(req.body).then(function () {
            res.setHeader('Content-Type', 'application/json');
            res.send(JSON.stringify({ data: { success: true } }));
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

    return { unregisterPush, registerPush, pushMessage, sayHello, pushContent };
}();

exports.sayHelloDefault = functions.https.onRequest((req, res) => {
    res.send('Hello World! ' + req.body);
});

exports.sayHello = functions.https.onRequest((req, res) => {
    return urlRegisterer.sayHello(req, res);
});

exports.unregisterPush = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        return urlRegisterer.unregisterPush(req, res);
    });
});

exports.registerPush = functions.https.onRequest((req, res) => {
    cors(req, res, () => {
        return urlRegisterer.registerPush(req, res);
    });
});

exports.pushMessage = functions.https.onRequest((req, res) => {
    return urlRegisterer.pushMessage(req, res);
});

exports.pushContent = functions.https.onRequest((req, res) => {
    return urlRegisterer.pushContent(req, res);
});