import { findTeamByCode, scaleDims, calcImageBox } from './bracket-geometry';

export { findTeamByCode, scaleDims, calcImageBox };

export const createImageUrlFromLogo = logo => {
  const file = require("../" + logo);

  // this is an image object
  if (typeof file !== "string") {
    return [file, undefined];
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
  const date = new Date(year, 2, 1);
  const add = ((4 - date.getDay() + 7) % 7) + 2 * 7;
  date.setDate(1 + add);
  return date;
};

export const getTournamentEnd = year => {
  const date = getSelectionSunday(year);
  date.setDate(date.getDate() + 22);
  return date;
}
