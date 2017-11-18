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

const firebaseLibrary = require("./../functions/firebaseLibrary.js")(db);
const pushHelper = require("./../functions/pushHelper.js")(firebaseLibrary, settings.isPushMocked ? null : require('web-push'));
const pushMessageTrigger = require("./../functions/pushMessageTrigger.js")(firebaseLibrary, pushHelper);
const urlRegisterer = require("./../functions/urlRegisterer.js")(pushMessageTrigger, firebaseLibrary);

pushHelper.setVapidDetails(
    'mailto:info.stef.kaeser@gmail.com',
    settings.vapidKeys.publicKey,
    settings.vapidKeys.privateKey
);

app.get('/sayHelloDefault', (req, res) => {
    res.send('Hello World! ' + req.body);
});

app.get('/sayHello', (req, res) => {
    return urlRegisterer.sayHello(req, res);
});

app.post('/unregisterPush', (req, res) => {
        return urlRegisterer.unregisterPush(req, res);
});

app.post('/registerPush', (req, res) => {
        return urlRegisterer.registerPush(req, res);
});

app.post('/pushMessage', (req, res) => {
    return urlRegisterer.pushMessage(req, res);
});

app.post('/pushContent', (req, res) => {
    return urlRegisterer.pushContent(req, res);
});



app.listen(7070, function () {
    console.log('Example app listening on port 7070!')
});