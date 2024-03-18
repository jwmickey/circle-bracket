const axios = require("axios");
const fs = require("fs");
const path = require("path");

const cacheDir = process.env.CACHE_DIR || path.join(__dirname, "../../cache/");
const linkPrefix = "https://www.ncaa.com/game/basketball-men/d1";
const setupQueryHash = process.env.SETUP_QUERY_HASH || '5214677a0d6c0df6619a440e97006fe55abcd89c46692ac349a7b781adf5f1ad';

function fetchBracket(year, useCache = true) {
  return getDataFile(year, useCache)
    .then(contests => {
      // identify regions and their placement
      const regionCodes = ["TL", "TR", "BL", "BR"];
      const regionsMap = contests.reduce((m, c) => {
          if (!m.has(c.region.title) && regionCodes.includes(c.region.position)) {
              m.set(c.region.title, c.region.position);
          }
          return m;
      }, new Map());

      // make an easily accessible map of round name to round number
      const roundsMap = contests.reduce((m, c) => {
          if (!m.has(c.round.title)) {
              // we'll zero-base this so play in = 0, first round = 1, etc.
              m.set(c.round.title, c.round.roundNumber - 1);
          }
          return m;
      }, new Map());

      const defaultTeam = {
          name: '',
          code: '',
          seed: 0,
          score: 0,
          winner: false
      };

      const games = contests.map(c => {
          const homeTeam = c.teams.find(t => t.isHome);
          const awayTeam = c.teams.find(t => !t.isHome);
          return {
              home: homeTeam ? {
                  name: homeTeam.nameShort,
                  code: homeTeam.seoname,
                  seed: homeTeam.seed,
                  score: homeTeam.score,
                  winner: homeTeam.isWinner
              } : defaultTeam,
              away: awayTeam ? {
                  name: awayTeam.nameShort,
                  code: awayTeam.seoname,
                  seed: awayTeam.seed,
                  score: awayTeam.score,
                  winner: awayTeam.isWinner
              } : defaultTeam,
              date: c.startDate,
              location: '', // NOTE: if we want this, we need to use scores_current_web
              region: regionsMap.get(c.region.title) || '',
              round: roundsMap.get(c.round.title),
              isComplete: c.gameStateCode === 4,
              link: awayTeam && homeTeam ? createGameLink(awayTeam.seoname, homeTeam.seoname, c.startDate) : ''
          }
      }).sort((a, b) => {
        if (a.round > b.round) {
            return a;
        } else if (b.round > a.round) {
            return b;
        } else if (a.round === b.round) {
            return a.date < b.date ? a : b;
        }
      });

      let regionList = [];
      for (let [name, position] of regionsMap.entries()) {
          regionList.push({ name, position });
      }

      return {
        format: "ncaa",
        updated: new Date(),
        year,
        regions: regionList,
        games
      };
    })
    .then(data => {
      return data;
    });
}

function getDataFile(year, useCache) {
  const seasonYear = year - 1;
  const url = `https://sdataprod.ncaa.com/?operationName=official_bracket_web&variables={"seasonYear":${seasonYear}}&extensions={"persistedQuery":{"version":1,"sha256Hash":"${setupQueryHash}"}}`;
  const cacheFile = path.join(cacheDir, `official_bracket_web-${year}.json`);

  return new Promise((resolve, reject) => {
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir);
    }
    
    if (useCache && fs.existsSync(cacheFile)) {
      console.debug('Using cache');
      const data = fs.readFileSync(cacheFile);
      resolve(JSON.parse(data));
    } else {
      console.debug('Getting bracket data from source!');
      axios
        .get(url)
        .then(res => {
          const data = res.data.data.mmlContests;
          if (useCache) {
              fs.writeFile(cacheFile, JSON.stringify(data, null, "\t"), err => {
                  if (err) {
                      console.warn("Cannot write to cache file", err);
                  }
              });
          }
          resolve(data);
        })
        .catch(err => {
          reject(err);
        });
    }
  });
}

function createGameLink(awaySeoName, homeSeoName, gameDate) {
    // e.g https://www.ncaa.com/game/basketball-men/d1/2019/03/21/minnesota-louisville
    const d = new Date(gameDate);
    const year = d.getFullYear();
    let month = d.getMonth() + 1;
    if (month < 10) {
        month = `0${month}`;
    }
    let day = d.getDate();
    if (day < 10) {
        day = `0${day}`;
    }
    return `${linkPrefix}/${year}/${month}/${day}/${awaySeoName}-${homeSeoName}`;
}

module.exports = fetchBracket;
