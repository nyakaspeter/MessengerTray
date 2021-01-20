const { app, screen, ipcMain, Menu } = require("electron");
const { menubar } = require("menubar");
const path = require("path");
const jimp = require("jimp");
const { spawnChat, arrangeChats, closeAllChats } = require("./chat");

function spawnSidebar() {
  global.sidebar = menubar({
    index: "https://www.messenger.com",
    icon: "messenger.png",
    tooltip: "Messenger",
    windowPosition: "topRight",
    browserWindow: {
      resizable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      height: screen.getPrimaryDisplay().workAreaSize.height,
      width: global.settings.sidebarWidth,
      webPreferences: {
        partition: "persist:sitePoller",
        preload: path.join(__dirname, "preload.js"),
      },
    },
    preloadWindow: true,
  });

  global.sidebar.on("ready", () => {
    setContextMenu();
    loginIfNeeded();
    styleSidebar();
    global.sidebar.window.webContents.on("did-navigate-in-page", openChat);
    global.sidebar.window.webContents.on("did-navigate", styleSidebar);
  });

  global.sidebar.on("after-show", () => {
    global.sidebar.positioner.move("topRight");
    arrangeChats();
  });

  global.sidebar.on("after-hide", () => {
    global.sidebar.window.setBounds({
      x:
        global.sidebar.window.getBounds().x +
        global.sidebar.window.getBounds().width,
      //global.settings.sidebarWidth,
    });
    arrangeChats();
  });
}

function setContextMenu() {
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Show/hide sidebar",
      click: () => global.sidebar.tray.emit("click"),
    },
    {
      label: "Close all chats",
      click: () => closeAllChats(),
    },
    { label: "Log out", click: () => logOut() },
    { type: "separator" },
    { label: "Exit", click: () => app.exit() },
  ]);

  global.sidebar.tray.setContextMenu(contextMenu);
}

function styleSidebar() {
  global.sidebar.window.webContents.insertCSS(`
      ::-webkit-scrollbar {
        display: none;
      }
    `);

  global.sidebar.window.webContents.executeJavaScript(`
      var hideInfo = setInterval(function() { 
        var info = document.querySelector("#mount_0_0 > div > div:nth-child(1) > div > div.rq0escxv.l9j0dhe7.du4w35lb > div > div > div.j83agx80.cbu4d94t.d6urw2fd.dp1hu0rb.l9j0dhe7.du4w35lb > div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.pfnyh3mw.jifvfom9.gs1a9yip.owycx6da.btwxx1t3.buofh1pr.dp1hu0rb > div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.g5gj957u.d2edcug0.hpfvmrgz.rj1gh0hx.buofh1pr.dp1hu0rb > div > div > div > div > div > div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.g5gj957u.f4tghd1a.ifue306u.kuivcneq.t63ysoy8");
        if (info) {
          document.querySelector("#mount_0_0 > div > div:nth-child(1) > div > div.rq0escxv.l9j0dhe7.du4w35lb > div > div > div.j83agx80.cbu4d94t.d6urw2fd.dp1hu0rb.l9j0dhe7.du4w35lb > div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.pfnyh3mw.jifvfom9.gs1a9yip.owycx6da.btwxx1t3.buofh1pr.dp1hu0rb > div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.g5gj957u.d2edcug0.hpfvmrgz.rj1gh0hx.buofh1pr.dp1hu0rb > div > div > div > div > div > div > div.bafdgad4.tkr6xdv7 > div > div.rq0escxv.l9j0dhe7.du4w35lb.j83agx80.cbu4d94t.pfnyh3mw.d2edcug0.hpfvmrgz.p8fzw8mz.pcp91wgn.iuny7tx3.ipjc6fyt > div > div:nth-child(3) > span > div").click();
          clearInterval(hideInfo);
        }
      }, 100);
  `);

  if (global.settings.nightMode) {
    global.sidebar.window.webContents.executeJavaScript(`
        var html = document.getElementsByTagName('html')[0];
        html.setAttribute('class', '__fb-dark-mode');
      `);
  }
}

function openChat(e, url) {
  const chat = global.chats.find((c) => c.url === url);
  if (chat) {
    chat.chat.tray.emit("click");
  } else {
    global.sidebar.window.webContents.executeJavaScript(`
      var anchors = [];

      document.querySelectorAll('[role="navigation"]')
        .forEach(n => {
          var a = n.getElementsByTagName('a');
          anchors.push(...a);
      });

      var anchor = anchors.find(a => a.href.includes('${url}'));
      var pic = anchor.getElementsByTagName('image')[0].getAttribute('xlink:href');

      window.ipcRenderer.send('openChat', JSON.stringify({ url: '${url}', pic }));
    `);
  }
}

ipcMain.on("openChat", (event, msg) => {
  let url = JSON.parse(msg).url;
  let picture = JSON.parse(msg).pic;

  jimp.read(picture, (err, image) => {
    if (err) {
      spawnChat(url);
    } else {
      image.write("chat.png", () => spawnChat(url, "chat.png"));
    }
  });
});

ipcMain.on("consoleLog", (event, msg) => {
  console.log(msg);
});

function loginIfNeeded() {
  global.sidebar.window.webContents.session.cookies
    .get({ url: "https://www.messenger.com" })
    .then((cookies) => {
      if (!cookies.some((c) => c.name === "c_user")) {
        global.sidebar.window.setBounds({
          width: global.settings.loginSidebarWidth,
        });
        global.sidebar.tray.emit("click");
        let checkLogin = setInterval(() => {
          global.sidebar.window.webContents.session.cookies
            .get({ url: "https://www.messenger.com" })
            .then((cookies) => {
              if (cookies.some((c) => c.name === "c_user")) {
                clearInterval(checkLogin);
                global.sidebar.window.setBounds({
                  width: global.settings.sidebarWidth,
                });
                global.sidebar.positioner.move("topRight");
                global.sidebar.window.reload();
              }
            });
        }, 1000);
      }
    });
}

function logOut() {
  closeAllChats();
  global.sidebar.window.webContents.session.clearStorageData([], (data) => {});
  global.sidebar.window.reload();

  if (global.sidebar.window.isVisible()) {
    global.sidebar.tray.emit("click");
  }

  loginIfNeeded();
}

module.exports = { spawnSidebar };
