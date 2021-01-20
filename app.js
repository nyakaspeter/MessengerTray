const { app } = require("electron");
const { spawnSidebar } = require("./sidebar");
require("./settings");

app.on("ready", () => {
  spawnSidebar();
});
