const axios = require("axios");
const cheerio = require("cheerio");
const fs = require("fs");
const path = require("path");
const http = require("https");

const TEAMS_JSON_FILE = path.join(__dirname, "../src/data/teams.json");
const LOGO_DIR = path.join(__dirname, "../src/img/logos/");
const CONF_PAGE_URL =
  "https://www.ncaa.com/standings/basketball-men/d1/all-conferences";

const args = process.argv.slice(2);
const update = args.includes('--update');
const overwrite = args.includes('--overwrite');
const skipLogos = args.includes('--skip-logos');

const TEAM_TEMPLATE = {
  name: "",
  abbr: "",
  mascot: "",
  primaryColor: "",
  secondaryColor: "",
  logo: {
    url: "",
    attribution: "",
    background: ""
  },
  conference: ""
};

if (fs.existsSync(TEAMS_JSON_FILE)) {
  console.warn("TEAMS FILE ALREADY EXISTS");
  if (!update && !overwrite) {
    console.log('EXITING');
    process.exit(0);
  }
}

const newTeams = [];

function getConferencePage() {
  return new Promise((resolve, reject) => {
    const cacheDir = process.env.CACHE_DIR || path.join(__dirname, "../cache/");
    const cacheFile = path.join(cacheDir, `conference_page.html`);

    if (fs.existsSync(cacheFile)) {
      console.debug('Using cache');
      const data = fs.readFileSync(cacheFile);
      resolve(data.toString());
    } else {
      axios.get(CONF_PAGE_URL).then((res) => {
        fs.writeFileSync(cacheFile, res.data);
        resolve(res.data);
      })
    }
  });
}

getConferencePage()
  .then(html => {
    // get raw data as an array of objects with team name and logo url
    const $ = cheerio.load(html);
    let teams = [];
    $("td.standings-team").each(function(i, elem) {
      teams.push({
        ...TEAM_TEMPLATE,
        ...{
          name: $(this).text(),
          logo: {
            url: $(this)
              .children("img")
              .attr("src"),
            background: ""
          }
        }
      });
    });
    return teams;
  })
  .then(teams => {
    let orig = {};

    if (update) {
      orig = JSON.parse(fs.readFileSync(TEAMS_JSON_FILE).toString());
    }

    // convert to team-name indexed object and save to JSON file
    const asObj = teams.reduce((accu, curr) => {
      const x = curr.logo.url.lastIndexOf("/") + 1;
      const y = curr.logo.url.indexOf(".svg");
      const index = curr.logo.url.substring(x, y);

      // only add if we don't already have this team
      if (update && !accu[index]) {
        newTeams.push(index);
        accu[index] = curr;
      }

      return accu;
    }, orig);

    // sort teams
    const sorted = Object.keys(asObj).sort().reduce((acc, key) => {
      acc[key] = asObj[key];
      return acc;
    }, {});

    fs.writeFile(TEAMS_JSON_FILE, JSON.stringify(sorted, null, 2), err => {
      if (err) {
        console.error("Error writing JSON file", err);
      }
    });

    return asObj;
  })
  .then(teams => {
    // get logos
    if (!skipLogos) {
      for (const [key, val] of Object.entries(teams)) {
        if (update && newTeams.includes(key)) {
          http
              .get(val.logo.url, res => {
                const file = fs.createWriteStream(path.join(LOGO_DIR, `${key}.svg`));
                res.pipe(file);
                file.on("finish", () => file.close());
              })
              .on("error", err => {
                console.error(`Error getting logo for ${key}`, err);
              });
        }
      }
    }
  })
  .then(() => {
    // make logo urls relative to project
    fs.readFile(TEAMS_JSON_FILE, (err, data) => {
      if (err) {
        console.error("Error reading JSON file", err);
        return;
      }

      let teams = JSON.parse(data);
      for (const key of Object.keys(teams)) {
        teams[key].logo.url = `img/logos/${key}.svg`;
      }

      fs.writeFile(TEAMS_JSON_FILE, JSON.stringify(teams, null, "\t"), err => {
        if (err) {
          console.error("Error writing JSON file", err);
        } else {
          console.log("Done!");
        }
      });
    });
  })
  .catch(err => {
    console.error(err);
  });
