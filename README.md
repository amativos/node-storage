node-storage
============

Simple file based store for node.js.
Useful for storing configs and such on something like an embedded system.

```
npm install node-storage
```

Examples:

```js
var Storage = require('node-storage');

// this will synchronously create storage file and any necessary directories
// or just load an existing file
var store = new Storage('path/to/file');

// persistence to disk is queued on every put()
store.put('hello', 'world');

// storage object is kept in memory for quick access
store.get('hello'); // 'world'

// for convenience, you can use dot notation for accessing objects when doing get/put
store.get('nested.value'); // undefined

// here, 'nested' object is created, but only if it didn't previously exist,
// in which case 'numbers' key is just added to the object
store.put('nested.numbers', [1, 2, 3]);
store.get('nested.numbers'); // [1, 2, 3]

// throws 'nested.numbers is not an object' error
store.put('nested.numbers.primes', [7, 11, 13]);

store.put('nested.primes', [7, 11, 13]);
store.get('nested'); // { numbers: [1, 2, 3], primes: [7, 11, 13] }

store.put('deeply.nested', {object: {hello: 'world'}});
store.get('deeply.nested.object.hello'); // 'world'
store.get('deeply.nested').object.hello; // 'world'

// remove also queues storage object to be persisted to disk
store.remove('deeply.nested.object');
store.get('deeply.nested.object.hello'); // undefined
store.get('deeply.nested.object'); // undefined
store.get('deeply.nested'); // {}
```
