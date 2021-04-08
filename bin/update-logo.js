const https = require('https');
const fs = require('fs');
const path = require('path');
const { optimize } = require('svgo');

const LOGO_DIR = path.join(__dirname, "../src/img/logos/");
const TEAMS = require(path.join(__dirname, "../src/data/teams.json"));
const team = process.argv[2];

const teamConfig = TEAMS[team];
if (!teamConfig) {
  console.error(`Invalid team: ${team}`);
}

const targetPath = path.join(LOGO_DIR, `${team}.svg`);
const sourcePath = `https://i.turner.ncaa.com/sites/default/files/images/logos/schools/bgl/${team}.svg`;

downloadLogo(sourcePath, targetPath)
  .then(() => optimizeLogo(targetPath))
  .then(() => console.log('Done!'))
  .catch(err => console.error(err));

function optimizeLogo(logoFile) {
  return new Promise((resolve, reject) => {
    const svgString = fs.readFileSync(logoFile);
    const result = optimize(svgString, {
      // optional but recommended field
      path: logoFile,
      // all config fields are also available here
      multipass: true
    });
    const optimizedSvgString = result.data;
    const file = fs.createWriteStream(logoFile);
    file.write(optimizedSvgString);
    file.on("finish", () => {
      file.close();
      resolve();
    }).on("error", err => {
      reject(`Error optimizing logo at ${logoFile}`, err);
    });
  });
}

function downloadLogo(url, outputFile) {
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        const file = fs.createWriteStream(outputFile);
        res.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", err => {
        reject(`Error getting logo at ${url}`, err);
      });
  });
}

