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
const urlRegisterer = require(path + "urlRegisterer.js")(pushMessageTrigger,firebaseLibrary);

pushHelper.setVapidDetails(
    'mailto:info.stef.kaeser@gmail.com',
    settings.vapidKeys.publicKey,
    settings.vapidKeys.privateKey
);


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

exports.pushMessageTo = functions.https.onRequest((req, res) => {
    return urlRegisterer.pushMessageTo(req, res);
});

exports.pushContent = functions.https.onRequest((req, res) => {
    return urlRegisterer.pushContent(req, res);
});