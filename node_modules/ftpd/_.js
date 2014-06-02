a({
  getRoot: function(connection, callback) {
    var rootDir = '/my_home';
    var rootPath = process.cwd() + '/' + connection.username + '/my_home';
    fs.exists(rootPath, function(exists) {
      if (exists) {
        callback(null, rootDir);
      } else {
        fs.mkDir(userDir, function(err) {
          if (err) {
            callback(null, '/'); // default to root
          } else {
            callback(err, rootDir);
          }
        });
      }
    });
  }
  // If the subdir exists, callback immediately with relative path to that directory
  // If not, create the directory, and callback relative path to the directory
  // Stupidly, instead of failing, we apparently want 'worst case' scenario to allow relative root.
});