import './index.css';
import Preloader from './loaders/Preloader';

const preloader = new Preloader(document, { windowRef: window });
preloader.show();
preloader.setProgress(0, 'Starting');

let application = null;

async function startApp() {
  const mod = await import('./app/Application');
  const Application = mod?.default;
  if (!Application) {
    throw new Error('Failed to load Application module');
  }

  application = new Application({ documentRef: document, windowRef: window, preloader });
  await application.start();
}

await startApp();

if (module.hot) {
  module.hot.accept('./app/Application', async () => {
    if (application) {
      application.destroy();
      application = null;
    }
    await startApp();
  });
  module.hot.dispose(() => {
    if (application) {
      application.destroy();
      application = null;
    }
  });
}
