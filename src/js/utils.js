export const createImageUrlFromLogo = logo => {
  const file = require("../" + logo);

  // this is an image object
  if (typeof file !== "string") {
    return file;
  }

  let url;

  // logo might be a path to a file or it could be a SVG XML code
  if (file.substring(0, 4) === "<svg") {
    const svg = new Blob([file], { type: "image/svg+xml" });
    url = window.URL.createObjectURL(svg);
  } else {
    url = file;
  }

  const revoke = () => {
    return window.URL.revokeObjectURL(url);
  };

  return [url, revoke];
};
