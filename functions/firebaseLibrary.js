module.exports = function(db) {
  const fireBaseRegistrationRef = db.ref("server/pushregistration");
  const fireBasePushStateRef = db.ref("server/pushstate");
  const fireBaseFactsRef = db.ref("facts");
  const fireBaseLocationRef = db.ref("imageMetaData");

  const errorFn = function(name) {
    return function(errorObject) {
      console.log(name + " :The read failed: " + errorObject.code);
    };
  };

  const saveSubscriptionToDatabase = function(subscription) {
    subscription.registerDate = new Date() + "";
    var p1 = new Promise(function(resolve, reject) {
      const subscriptionid = subscription.keys.p256dh;
      fireBaseRegistrationRef
        .child(subscriptionid)
        .once("value", function(snapshot) {
          var exists = snapshot.val() !== null;
          fireBaseRegistrationRef
            .child(subscriptionid)
            .set(subscription)
            .then(function() {
              resolve(exists);
            })
            .catch(function(err) {
              reject(err);
            });
        });
    });

    return p1;
  };

  const deleteSubscriptionFromDatabase = function(subscription) {
    const subscriptionid = subscription.keys.p256dh;
    console.log(
      "deleteSubscriptionFromDatabase" + subscriptionid,
      subscription
    );
    return fireBaseRegistrationRef.child(subscriptionid).remove();
  };

  const getSubscriptionsFromDatabase = function(subscription) {
    return fireBaseRegistrationRef.once(
      "value",
      function(snapshot) {
        return snapshot.val();
      },
      errorFn("getSubscriptionsFromDatabase")
    );
  };

  const getPushState = function() {
    return fireBasePushStateRef.once("value").then(function(snapshot) {
      var a = snapshot.val();
      return a;
    }, errorFn("getPushState"));
  };

  const updatePushState = function(pushState) {
    console.log("updatePushState", pushState);
    return fireBasePushStateRef.set(pushState);
  };

  function getRandomArbitrary(min, max) {
    return Math.round(Math.random() * (max - min) + min);
  }

  const getNewestAnything = function(ref, lastItemTime, fieldName) {
    return ref.once("value").then(function(snapshot) {
      const itemArray = snapshot.val();
      var arr = Object.keys(itemArray).map(p =>
        Object.assign(itemArray[p], { itemKey: p })
      );
      return getNewest(arr, lastItemTime, fieldName);
    });
  };

  const getNewest = function(itemArray, lastDateTime, fieldName) {
    itemArray.sort(function(a, b) {
      return a[fieldName] - b[fieldName];
    });
    return itemArray.find(function(e) {
      return e[fieldName] > lastDateTime;
    });
  };

  const getNewestFact = function(lastPostedImageDate) {
    return getNewestAnything(
      fireBaseFactsRef,
      lastPostedImageDate,
      "insertTime"
    );
  };

  const getNewestImage = function(lastPostedImageDate) {
    return getNewestAnything(
      fireBaseLocationRef,
      lastPostedImageDate,
      "insertTime"
    );
  };

  const getRandomAnything = function(ref) {
    return ref.once("value").then(function(snapshot) {
      const total = snapshot.numChildren();
      const randomIndex = getRandomArbitrary(0, total);
      var itemArray = snapshot.val();
      var arr = Object.keys(itemArray).map(p =>
        Object.assign(itemArray[p], { itemKey: p })
      );
      return arr[randomIndex];
    }, errorFn("getRandomAnyThing"));
  };

  const getRandomImage = function() {
    return getRandomAnything(fireBaseLocationRef);
  };

  const getRandomFact = function() {
    return getRandomAnything(fireBaseFactsRef);
  };

  return {
    updatePushState,
    getPushState,
    getRandomImage,
    getRandomFact,
    getNewestFact,
    getNewestImage,
    getSubscriptionsFromDatabase,
    saveSubscriptionToDatabase,
    deleteSubscriptionFromDatabase,
    _testOnly: { getNewest }
  };
};
