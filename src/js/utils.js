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

export const scaleDims = (w, h, mW, mH) => {
  let scale = Math.min(mW, mH) / Math.max(w, h);
  return [Math.floor(w * scale), Math.floor(h * scale)];
};

export const calcImageBox = (
  radius,
  innerRadius,
  centerX,
  centerY,
  slots,
  slot
) => {
  const quadrant = slot / slots;
  const t1 = ((Math.PI * 2) / slots) * slot;
  const t2 = ((Math.PI * 2) / slots) * (slot + 1);
  let x1Radius, y1Radius, x2Radius, y2Radius;

  if (quadrant < 0.25) {
    x1Radius = innerRadius;
    y1Radius = innerRadius;
    x2Radius = radius;
    y2Radius = radius;
  } else if (quadrant < 0.5) {
    x1Radius = radius;
    y1Radius = innerRadius;
    x2Radius = innerRadius;
    y2Radius = radius;
  } else if (quadrant < 0.75) {
    x1Radius = radius;
    y1Radius = radius;
    x2Radius = innerRadius;
    y2Radius = innerRadius;
  } else {
    x1Radius = innerRadius;
    y1Radius = radius;
    x2Radius = radius;
    y2Radius = innerRadius;
  }

  // these values give us over-sized areas to display the logo in
  const x1 = Math.floor(
    Math.min(x1Radius * Math.cos(t1), x1Radius * Math.cos(t2)) + centerX
  );
  const y1 = Math.floor(
    Math.min(y1Radius * Math.sin(t1), y1Radius * Math.sin(t2)) + centerY
  );
  const x2 = Math.floor(
    Math.max(x2Radius * Math.cos(t1), x2Radius * Math.cos(t2)) + centerX
  );
  const y2 = Math.floor(
    Math.max(y2Radius * Math.sin(t1), y2Radius * Math.sin(t2)) + centerY
  );

  const maxWidth = Math.abs(x2 - x1);
  const maxHeight = Math.abs(y2 - y1);

  return { x: x1, y: y1, maxWidth, maxHeight };
};

export const findTeamRegion = (allGames, teamCode) => {
  return allGames.find(game => {
    return game.home.code === teamCode || game.away.code === teamCode;
  }).region;
};

export const getSelectionSunday = year => {
  const date = getTournamentStart(year);
  date.setDate(date.getDate() - 4);
  return date;
};

export const getTournamentStart = year => {
  let date = new Date(year, 2, 1),
    add = ((4 - date.getDay() + 7) % 7) + 2 * 7;
  date.setDate(1 + add);
  return date;
};
