var daemon = require("daemonize2").setup({
    main: "ccu.io.js",
    name: "ccu.io",
    pidfile: "ccu.io.pid"
});

switch (process.argv[2]) {

    case "start":
        daemon.start();
        break;

    case "stop":
        daemon.stop();
        break;

    default:
        console.log("Usage: [start|stop]");
}