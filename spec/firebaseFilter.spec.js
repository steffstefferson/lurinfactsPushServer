var fbMock = { ref: function () { return {}; } };

var fb = require("../firebaseLibrary.js")(fbMock);

var assert = require('assert');
describe('#firebaseLibrary', function () {
    it('should return one', function () {
        var arr = [];
        var element = { insertDateTime: new Date(),id : 0};
        arr.push(element);
        var result = fb._testOnly.getNewest(arr,new Date()-2,'insertDateTime');
        assert.deepEqual(result,element);
    });
    it('should return null', function () {
        var arr = [];
        var element = { insertDateTime: new Date()-4,id : 0};
        arr.push(element);
        var result = fb._testOnly.getNewest(arr,new Date(),'insertDateTime');
        assert.equal(result,null);
    });

    it('it should return the older', function () {
        var arr = [];
        var element = { insertDateTime: new Date(),id : 0};
        var element2 = { insertDateTime: new Date()-1,id : 0};
        arr.push(element);
        arr.push(element2);
        var result = fb._testOnly.getNewest(arr,new Date()-2,'insertDateTime');
        assert.deepEqual(result,element2);
    });
    it('it should return the newer', function () {
        var arr = [];
        var element = { insertDateTime: new Date(),id : 0};
        var element2 = { insertDateTime: new Date()-2,id : 0};
        arr.push(element);
        arr.push(element2);
        var result = fb._testOnly.getNewest(arr,new Date()-1,'insertDateTime');
        assert.deepEqual(result,element);
    });
    it('it should return the newest after lastrun', function () {
        var arr = [];
        arr.push({ insertDateTime: new Date()-7,id : 0});
        var element = { insertDateTime: new Date()-4,id : 0};
        var element2 = { insertDateTime: new Date()-2,id : 0};
        arr.push(element);
        arr.push(element2);
        arr.push({ insertDateTime: new Date()-5,id : 0});
        var result = fb._testOnly.getNewest(arr,new Date()-3,'insertDateTime');
        assert.deepEqual(result,element2);
    });

});