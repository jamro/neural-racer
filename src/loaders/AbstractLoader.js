


class AbstractLoader {
  constructor() {

  }

  async start(progressCallback=(localPercent, statusText) => {}) {
    throw new Error(`Not implemented! localPercent: ${localPercent}, statusText: ${statusText}`);
  }
}

export default AbstractLoader;