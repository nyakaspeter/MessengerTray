const fs = require("fs");

global.settings = {
  nightMode: true,
  sidebarWidth: 90,
  loginSidebarWidth: 800,
  searchSidebarWidth: 360,
  searchSidebarWidthFull: 1000,
  chatWidth: 400,
  chatHeight: 800,
  chatGap: 10,
};

function loadSettings() {
  let settings = fs.readFileSync("config.json");
  global.settings = JSON.parse(settings);
}

function saveSettings() {}

module.exports = { loadSettings, saveSettings };
