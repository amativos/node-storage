var fs = require('fs');
var rmrf = require('rimraf').sync;
var Storage = require('../index');
var testfile = __dirname + '/tmp/testdb';

describe('Storage', function () {
  var Store;

  before(function () {
    Store = new Storage(testfile);
  });

  after(function () {
    rmrf(__dirname + '/tmp');
  });

  it('should be able to get values from autoloaded database right after initialization', function (done) {
    var file = __dirname + '/tmp/loadgettest';

    fs.writeFile(file, JSON.stringify({ testkey: 111 }), function (err) {
      var store = new Storage(file);
      store.get('testkey').should.equal(111);
      done(err);
    });
  });

  it('should be able to put values into autoloaded database and persist them to a file', function (done) {
    var file = __dirname + '/tmp/loadputtest';
    var store = new Storage(file);

    store.queue.drain = function () {
      fs.readFile(file, function (err, data) {
        JSON.parse(data).testkey.should.equal(111);
        done(err);
      });
    };

    store.put('testkey', 111);
    store.get('testkey').should.equal(111);
  });

  it('must be able to handle dot-syntax when putting/gettings/removing values', function () {
    Store.put('some.nested.object.key', 'hello');
    Store.get('some').nested.object.key.should.equal('hello');

    Store.put('another', { nested: { key: 'world' } });
    Store.get('another.nested.key').should.equal('world');

    Store.put('deeply.nested.value', 42);
    Store.get('deeply.nested.value').should.equal(42);
    Store.get('deeply').nested.value.should.equal(42);

    Store.put('deeply.nested.anotherValue', 'hello');
    Store.get('deeply.nested').should.eql({ value: 42, anotherValue: 'hello' });

    Store.put('deeply.nested.hello', 'world');
    Store.get('deeply.nested').should.eql({ value: 42, anotherValue: 'hello', hello: 'world' });

    Store.remove('deeply.nested.value');
    Store.remove('deeply.nested.anotherValue');
    Store.remove('deeply.nested.hello');

    Store.get('deeply.nested').should.eql({});
  });

  it('must remove values from the store', function (done) {
    var file = __dirname + '/tmp/removetest';
    var store = new Storage(file);

    store.queue.drain = function () {
      fs.readFile(file, function (err, data) {
        data = JSON.parse(data);
        data.another.should.eql({ value: { hello: 'world' } });
        data.should.not.have.property('constant');
        done(err);
      });
    };

    store.put('another.value', { hello: 'world' });
    store.put('another.removed', 'value');

    store.get('another.removed').should.equal('value');

    store.put('constant', 1000);

    store.remove('another.removed');
    store.remove('constant');
  });

  it('must asynchronously persist all put values to a file', function (done) {
    var file = __dirname + '/tmp/persisttest';
    var store = new Storage(file);

    store.queue.drain = function () {
      fs.readFile(file, function (err, data) {
        data = JSON.parse(data);

        data.nested.object.should.eql({ hello: 'world' });
        data.somevalue.should.equal(333);

        done(err);
      });
    };

    store.put('nested.object', { hello: 'world' });
    store.put('somevalue', 333);
  });

  it('should throw an error if provided key is not a string', function () {
    Store.put.bind(Store, 1, 1).should.throwError();
    Store.get.bind(Store, null).should.throwError();
  });

  it('should throw an error when dot-syntax string contains value that is not an object', function () {
    Store.put('very.nested', 10);
    Store.get.bind(Store, 'very.nested.object.key').should.throwError(/^very.nested .+/);
    Store.get.bind(Store, 'very.missing').should.not.throwError();
    Store.get.bind(Store, 'very.missing.missing2').should.not.throwError();
    Store.put.bind(Store, 'very.nested.object.key', 111).should.throwError(/^very.nested .+/);
  });

  it('should properly handle multiple equal keys on a path', function () {
    Store.put('x.a.b.c.a.b', 1);
    Store.get('x').should.eql({ a: { b: { c: { a: { b: 1 } } } } });

    Store.put('y', { a: 2 });
    Store.get.bind(Store, 'y.a.b.c.a.b').should.throwError();
  });
});
