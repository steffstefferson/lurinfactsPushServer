const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors');
const adminOnFire = require("firebase-admin");
const settings = require(__dirname + "\\settings.json");

const app = express().use(bodyParser.json());

adminOnFire.initializeApp({
    credential: adminOnFire.credential.cert(settings.serviceAccount),
    databaseURL: settings.databaseUrl
});

const db = adminOnFire.database();

const firebaseLibrary = require("./../logic/firebaseLibrary.js")(db);
const pushHelper = require("./../logic/pushHelper.js")(firebaseLibrary, settings.isPushMocked ? null : require('web-push'));
const pushMessageTrigger = require("./../logic/pushMessageTrigger.js")(firebaseLibrary, pushHelper);

pushHelper.setVapidDetails(
    'mailto:info.stef.kaeser@gmail.com',
    settings.vapidKeys.publicKey,
    settings.vapidKeys.privateKey
);

var urlRegisterFn = {

    registerOptions: function (url, fn) {
        app.options(url, fn);
    },
    registerPost: function (url, fn) {
        app.post(url, fn);
    },
    registerGet: function (url, fn) {
        app.get(url, fn);
    }
};

const urlRegisterer = require("./../logic/urlRegisterer.js")(urlRegisterFn,cors());
urlRegisterer.registerAllUrls();

app.listen(7070, function () {
    console.log('Example app listening on port 7070!')
});