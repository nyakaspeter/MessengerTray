const { app, screen, ipcMain, BrowserWindow } = require("electron");
const { menubar } = require("menubar");
const path = require("path");

app.on("ready", () => {
  let win = menubar({
    index: "https://www.facebook.com",
    icon: "messenger.png",
    tooltip: "Messenger",
    browserWindow: {
      frame: false,
      fullscreenable: false,
      transparent: true,
      skipTaskbar: true,
      alwaysOnTop: true,
      width: screen.getPrimaryDisplay().workAreaSize.width,
      height: screen.getPrimaryDisplay().workAreaSize.height,
      webPreferences: {
        preload: path.join(__dirname, "preload.js"),
      },
    },
    preloadWindow: true,
    windowPosition: "center",
  });

  win.on("ready", () => {
    win.window.setIgnoreMouseEvents(true, { forward: true });

    win.window.webContents.insertCSS(`
      ::-webkit-scrollbar {
        display: none;
      }
    `);

    win.window.webContents.executeJavaScript(`
      var hide = setInterval(() => {
        var chat = document.querySelector("#mount_0_0 > div > div:nth-child(1) > div.rq0escxv.l9j0dhe7.du4w35lb > div:nth-child(8)");

        if (chat) {
          clearInterval(hide);

          document.querySelector("body").style.background = "transparent";

          var root = document.querySelector("#mount_0_0 > div > div:nth-child(1) > div.rq0escxv.l9j0dhe7.du4w35lb");
          
          var div = document.createElement('div');
          div.style.width = '100vw';
          div.style.height = '100vh';

          for (let child of root.children) {
              if (child !== chat) {
                  child.style.display = "none";
              }
          }

          var inside = false;

          chat.addEventListener('mouseenter', function() {
              if (!inside) {
                inside = true;
                window.ipcRenderer.send('switchClickThrough', 'in');
              }
          });

          chat.addEventListener('mouseleave', function() {
              if (inside) {
                inside = false;
                window.ipcRenderer.send('switchClickThrough', 'out');
              }
          });

          chat.addEventListener('click', event => {
              div.addEventListener('mousemove', event => {
                if (!chat.contains(event.target)) {
                  if (inside) {
                    inside = false;
                    window.ipcRenderer.send('switchClickThrough', 'out');
                  }
                }
              }, {once: true})
          });

          setInterval(() => {
            var incomingCall = document.querySelector("body > div.l9j0dhe7.tkr6xdv7");
            if (incomingCall) {
              div.remove();

              inside = true;
              window.ipcRenderer.send('switchClickThrough', 'in');
            }
            else {
              if (!root.contains(div)) {
                div = document.createElement('div');
                div.style.width = '100vw';
                div.style.height = '100vh';

                root.prepend(div);

                div.addEventListener('mousemove', event => {
                  if (!chat.contains(event.target)) {
                    if (inside) {
                      inside = false;
                      window.ipcRenderer.send('switchClickThrough', 'out');
                    }
                  }
                }, {once: true});
              }
            }
          }, 1000);
        }
      }, 500);
    `);

    win.window.webContents.on("new-window", () => {
      console.log("new window");
    });
  });

  ipcMain.on("consoleLog", (event, msg) => {
    console.log(msg);
  });

  ipcMain.on("switchClickThrough", (event, msg) => {
    console.log(msg);

    if (msg === "in") {
      win.window.setIgnoreMouseEvents(false);
    } else {
      win.window.setIgnoreMouseEvents(true, { forward: true });
    }
  });
});
