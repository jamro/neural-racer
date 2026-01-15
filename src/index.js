import './index.css';
import Application from './app/Application';

const application = new Application({ documentRef: document, windowRef: window });

await application.start();

if (module.hot) {
  module.hot.accept();
  module.hot.dispose(() => {
    application.destroy();
  });
}
