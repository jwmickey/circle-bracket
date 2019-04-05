export const initAnalytics = code => {
  let element = document.createElement("script");
  element.async = true;
  element.src = `https://www.googletagmanager.com/gtag/js?id=${code}`;
  return element;
};

export const runAnalytics = code => {
  let element = document.createElement("script");
  element.innerHTML =
    "window.dataLayer = window.dataLayer || [];" +
    "function gtag(){dataLayer.push(arguments);}" +
    "gtag('js', new Date());" +
    `gtag('config', '${code}');`;
  return element;
};
