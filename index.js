var fs = require('fs');
var async = require('async');
var mkdirp = require('mkdirp');


function isObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
}

function Storage(filename) {
  if (!filename) {
    throw new Error('Storage requires path to a storage file');
  }

  var self = this;

  self.filename = filename;
  self.tempFilename = filename + '~';
  self.backupFilename = filename + '~~';

  self.queue = async.queue(function(task, cb) {
    self._persist(function(err) {
      if (err) {
        throw err;
      }

      cb();
    });
  });

  self.store = self._load();
  self._resolvePath();
}

Storage.prototype.get = function(key) {
  if (typeof key !== 'string') {
    throw new Error('key must be a string');
  }

  return this._getDeep(key.split('.'));
};

Storage.prototype.put = function(key, value) {
  if (typeof key !== 'string') {
    throw new Error('key must be a string');
  }

  this._setDeep(key.split('.'), value, false);
  this.queue.push();
};

Storage.prototype.remove = function(key) {
  if (typeof key !== 'string') {
    throw new Error('key must be a string');
  }

  this._setDeep(key.split('.'), undefined, true);
  this.queue.push();
};

Storage.prototype._getDeep = function(path) {
  var storage = this.store;

  for (var i = 0; i < path.length; i++) {
    var p = path[i];

    if (!isObject(storage)) {
      throw new Error(path.slice(0, i).join('.') + ' is not an object');
    }

    if (!storage.hasOwnProperty(p)) {
      return undefined;
    }

    storage = storage[p];
  }

  return storage;
};

Storage.prototype._setDeep = function(path, value, remove) {
  var storage = this.store;

  for (var i = 0; i < path.length; i++) {
    var p = path[i];

    if (!isObject(storage)) {
      throw new Error(path.slice(0, i).join('.') + ' is not an object');
    }

    if (i === path.length - 1) {
      setOrRemove(storage, p);
      return;
    }

    if (!storage.hasOwnProperty(p)) {
      storage[p] = {};
    }

    storage = storage[p];
  }

  function setOrRemove(obj, key) {
    if (remove) {
      delete obj[key];
    } else {
      obj[key] = value;
    }
  }
};

Storage.prototype._persist = function(cb) {
  var self = this;
  var _data = JSON.stringify(self.store);

  async.series([
    async.apply(self._fileMustNotExist, self.tempFilename),
    async.apply(self._fileMustNotExist, self.backupFilename),
    async.apply(self._doBackup.bind(self)),
    async.apply(self.writeData, self.tempFilename, _data),
    async.apply(fs.rename, self.tempFilename, self.filename),
    async.apply(self._fileMustNotExist, self.backupFilename)
  ], cb);
};

Storage.prototype.writeData = function(filename, data, cb) {
  var _fd;

  async.waterfall([
    async.apply(fs.open, filename, 'w'),

    function(fd, cb) {
      _fd = fd;
      var buf = new Buffer(data);
      var offset = 0;
      var position = 0;

      fs.write(fd, buf, offset, buf.length, position, cb);
    },

    function(written, buf, cb) {
      fs.fsync(_fd, cb);
    },

    function(cb) {
      fs.close(_fd, cb);
    }
  ], function(err) {
    cb(err);
  });
};

Storage.prototype._doBackup = function(cb) {
  var self = this;

  fs.exists(self.filename, function(exists) {
    if (!exists) {
      return cb(null);
    }

    fs.rename(self.filename, self.backupFilename, cb);
  });
};

Storage.prototype._load = function() {
  var data;

  try {
    data = JSON.parse(fs.readFileSync(this.filename));
  } catch (e) {
    if (e.code !== 'ENOENT') {
      throw e;
    }

    data = {};
  }

  return data;
};

Storage.prototype._fileMustNotExist = function(file, cb) {
  fs.exists(file, function(exists) {
    if (!exists) {
      return cb(null);
    }

    fs.unlink(file, function(err) {
      return cb(err);
    });
  });
};

Storage.prototype._resolvePath = function() {
  var _path = this.filename.split('/').slice(0, -1).join('/');

  if (_path) {
    mkdirp.sync(_path);
  }
};

module.exports = Storage;
