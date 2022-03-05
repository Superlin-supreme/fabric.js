// eslint 没开 es6
var chokidar = require('chokidar');
var exec = require('child_process').exec;

var dirPath = './src';

var watcher = chokidar.watch(dirPath);

console.log('🤖 begin watch ./src...');

watcher.on('change', function (path) {
  console.log('file change: ', path);

  exec('npm run build', function (err, stdout, stderr) {
    if (err) {
      console.log('err: ', err);
      return;
    }
    if (stderr) {
      console.log('stderr: ', stderr);
      return;
    }

    console.log(stdout);
    console.log('✅ build success');
  });
});
