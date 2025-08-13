const { app, BrowserWindow, session } = require('electron');

function createWindow() {
  const win = new BrowserWindow({
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    }
  });

  // Add CSP header with frame-ancestors
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = `
      default-src 'self';
      script-src 'self' https://www.gstatic.com 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data:;
      connect-src 'self' https://firestore.googleapis.com https://www.googleapis.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com https://firebaseinstallations.googleapis.com;
      base-uri 'self';
      form-action 'self';
      frame-ancestors 'none';
    `.replace(/\s+/g, ' ').trim();

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      }
    });
  });

  // load your file
  win.loadFile('renderer/index.html');
}

app.whenReady().then(createWindow);
