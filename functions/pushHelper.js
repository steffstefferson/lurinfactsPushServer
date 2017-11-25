module.exports = function (refFirebase, webPush) {
    var firebase = refFirebase;
    //webpush mock
    const webpush_Mock = {
        setVapidDetails: function () {},
        sendNotification: function (receiver, data) {
            console.log('Send webpush to ' + receiver.keys.auth, [receiver, data]);return Promise.resolve();
        }
    };
    //if webpush is not given we use a mock library
    const webpushLibary = webPush || webpush_Mock;
    console.log('use webpushLibary mock: '+!webPush);

    const pushContent = function (message) {
        message.timestamp = new Date();
        return firebase.getSubscriptionsFromDatabase().then(function (subscriptions) {
            var promiseChain = Promise.resolve();
            subscriptions.forEach(function (subscription) {
                promiseChain = promiseChain.then(() => {
                    return triggerPushMsg(subscription.val(), message);
                });
            });
            return promiseChain.then(function (result) {
                return message;
            });
        });
    };

    const pushContentTo = function (message,reciever) {
        return triggerPushMsg(reciever, message);
    };

    const triggerPushMsg = function (subscription, dataToSend) {
        return webpushLibary.sendNotification(subscription, JSON.stringify(dataToSend)).then(function () {
            console.log('sendNotification successful for p256dh: ' + subscription.keys.p256dh + ' data: ',dataToSend);
            return subscription;
        }).catch(err => {
            if (err.statusCode === 410 || err.errno == 'ENOTFOUND') {
                console.log('Subscription is no longer valid and will be deleted', subscription);
                return firebase.deleteSubscriptionFromDatabase(subscription);
            } else {
                console.log('Unhandled error sendNotification while sending to: ' + subscription.keys.p256dh, err);
            }
        });
    };

    return { pushContent,pushContentTo, setVapidDetails: webpushLibary.setVapidDetails };
};