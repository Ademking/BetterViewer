export const waitForElement = (selector) => {
  return new Promise<void>((resolve) => {
    const interval = setInterval(() => {
      if (document.querySelector(selector)) {
        clearInterval(interval);
        resolve();
      }
    }, 100);
  });
};
