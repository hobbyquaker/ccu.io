var daemon = require("daemonize2").setup({
    main: "ccu.io.js",
    name: "ccu.io",
    pidfile: "ccu.io.pid"
});

var fs = require('fs');

switch (process.argv[2]) {

    case "start":
        checkDirPermission(__dirname+"/datastore");
        checkDirPermission(__dirname+"/log");
        daemon.start();
        break;

    case "stop":
        daemon.stop();
        break;

    case "kill":
        daemon.kill();
        break;

    case "restart":
        daemon.stop(function(err) {
            checkDirPermission(__dirname+"/datastore");
            checkDirPermission(__dirname+"/log");
            daemon.start();
        });
        break;

    case "status":
        var pid = daemon.status();
        if (pid)
            console.log("Daemon running. PID: " + pid);
        else
            console.log("Daemon is not running.");
        break;

    default:
        console.log("Usage: [start|stop|kill|restart|status]");
}


function checkDirPermission(path) {
    try {
        fs.writeFileSync(path+'/permission.test', 'test');
    } catch (e) {
        console.log("Error: no permission to write in "+path);
        process.exit(1);
    }
    fs.unlinkSync(path+'/permission.test');
}