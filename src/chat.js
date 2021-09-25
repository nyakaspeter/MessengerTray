const { shell, screen, ipcMain, Menu } = require("electron");
const { menubar } = require("menubar");
const path = require("path");
const fs = require("fs");

global.chats = [];
global.openChats = [];

function spawnChat(url, icon = undefined) {
  const chat = menubar({
    index: url,
    icon: icon,
    browserWindow: {
      x: screen.getPrimaryDisplay().size.width,
      y: screen.getPrimaryDisplay().size.height,
      height: global.settings.chatHeight,
      width: global.settings.chatWidth,
      resizable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      webPreferences: {
        partition: "persist:sitePoller",
        preload: path.join(__dirname, "preload.js"),
      },
    },
    preloadWindow: true,
  });

  global.chats.push({ url, chat });

  chat.on("ready", () => {
    const contextMenu = Menu.buildFromTemplate([
      {
        label: "Show/hide chat",
        click: () => chat.tray.emit("click"),
      },
      {
        label: "Close chat",
        click: () => closeChat(chat),
      },
    ]);

    chat.tray.setContextMenu(contextMenu);

    chat.window.webContents.on("will-navigate", handleRedirect);
    chat.window.webContents.on("new-window", handleRedirect);
    chat.window.webContents.on("did-navigate", () => styleChat(chat, url));
    styleChat(chat, url);

    chat.tray.emit("click");

    fs.unlink("temp.png", () => {});
  });

  chat.on("after-show", () => {
    if (global.openChats.length === 0) {
      chat.window.setPosition(
        global.sidebar.window.getBounds().x - global.settings.chatGap - global.settings.chatWidth,
        global.sidebar.window.getBounds().y + global.sidebar.window.getBounds().height - global.settings.chatHeight
      );
    } else {
      chat.window.setPosition(
        global.openChats[global.openChats.length - 1].window.getPosition()[0] -
          global.settings.chatGap -
          global.settings.chatWidth,
        global.sidebar.window.getBounds().y + global.sidebar.window.getBounds().height - global.settings.chatHeight
      );
    }

    global.openChats.push(chat);
  });

  chat.on("after-hide", () => {
    global.openChats = global.openChats.filter((openChat) => openChat !== chat);

    chat.window.setPosition(screen.getPrimaryDisplay().size.width, screen.getPrimaryDisplay().size.height);

    for (let i = 0; i < global.openChats.length; i++) {
      if (i === 0) {
        global.openChats[i].window.setBounds({
          x: global.sidebar.window.getBounds().x - global.settings.chatGap - global.settings.chatWidth,
        });
      } else {
        global.openChats[i].window.setBounds({
          x:
            global.openChats[i - 1].window.getBounds().x -
            global.settings.chatGap -
            global.openChats[i].window.getBounds().width,
        });
      }
    }
  });

  return chat;
}

function styleChat(chat, url) {
  chat.window.webContents.insertCSS(`
      ::-webkit-scrollbar {
        display: none;
      }
    `);

  chat.window.webContents.executeJavaScript(`
      var hideNav = setInterval(function() { 
        var navigation = document.querySelectorAll('[role="navigation"]');
        if (navigation.length !== 0) {
          navigation.forEach(n => {
            n.style.display = 'none';
          });
          clearInterval(hideNav);
        }
      }, 100);

      var setTooltip = setInterval(function() { 
        var main = document.querySelector('[role="main"]');
        if (main) {
          var tooltip = Array.from(main.getElementsByTagName('span')).find(s => s.innerText).innerText;
          window.ipcRenderer.send('setTooltip', JSON.stringify({ url: '${url}', tooltip}));
          clearInterval(setTooltip);
        }
      }, 100);
    `);

  if (global.settings.nightMode) {
    chat.window.webContents.executeJavaScript(`
        var html = document.getElementsByTagName('html')[0];
        html.setAttribute('class', '__fb-dark-mode');
      `);
  }
}

ipcMain.on("setTooltip", (event, msg) => {
  let url = JSON.parse(msg).url;
  let tooltip = JSON.parse(msg).tooltip;

  global.chats.find((c) => c.url === url).chat.tray.setToolTip(tooltip);
});

function closeChat(chat) {
  if (chat.window.isVisible()) {
    chat.tray.emit("click");
  }

  chat.window.destroy();
  chat.tray.destroy();

  global.chats = global.chats.filter((c) => c.chat !== chat);
}

function closeAllChats() {
  global.chats.forEach((chat) => {
    chat.chat.window.destroy();
    chat.chat.tray.destroy();
  });
  global.chats = [];
  global.openChats = [];
}

function arrangeChats() {
  let openChatsCopy = global.openChats.slice();

  for (let i = 0; i < 2; i++) {
    openChatsCopy.reverse().forEach((chat) => {
      chat.tray.emit("click");
    });
  }
}

function handleRedirect(e, url) {
  if (url !== e.sender.getURL()) {
    e.preventDefault();
    shell.openExternal(url);
  }
}

module.exports = {
  spawnChat,
  arrangeChats,
  closeAllChats,
};
