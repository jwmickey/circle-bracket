import { createImageUrlFromLogo } from "./utils";
import teams from "../data/teams";

const TO_RADIANS = Math.PI / 180;

const seedSlotMap = [
  [0, 14, 10, 6, 4, 8, 12, 2, 3, 13, 9, 5, 7, 11, 15, 1], // 64 teams
  [0, 7, 5, 3, 2, 4, 6, 1, 1, 6, 4, 2, 3, 5, 7, 0], // 32 teams
  [0, 3, 2, 1, 1, 2, 3, 0, 0, 3, 2, 1, 1, 2, 3, 0], // 16 teams
  [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0], // 8 teams
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] // 4 teams
];

const roundWidths = [0, 0.075, 0.09, 0.125, 0.15, 0.18, 0.22, 0.1];
// TODO: this is a temp hack to play around with widths for 32 teams (6 rounds)
const roundWidths32 = [0, 0.1, 0.15, 0.175, 0.2, 0.25, 0.1];

export const DEFAULTS = {
  gridStrokeWidth: 2,
  gridStrokeStyle: "#fff",
  scale: 1,
  showGameDetails: () => {}
};

export default class Bracket {
  constructor(cvs, settings = {}) {
    this.cvs = cvs;
    this.ctx = cvs.getContext("2d");
    this.ctx.font = '14px "Open Sans", sans-serif';

    this.fontSize = 14;
    this.titleHeight = 24;
    this.margin = 50;

    this.settings = { ...DEFAULTS, ...settings };

    this.numRounds = 0;
    this.numEntries = 0;
    this.bracketData = undefined;
    this.teamPaths = [];

    this.cvs.addEventListener("click", event => {
      const scale = this.settings.scale;
      const rect = event.target.getBoundingClientRect();
      const x = event.clientX - rect.left; //x position within the element.
      const y = event.clientY - rect.top; //y position within the element.

      for (let entry of this.teamPaths) {
        if (this.ctx.isPointInPath(entry.path, x * scale, y * scale)) {
          const { teamCode, round } = entry;
          const game = this.bracketData.games.find(
            g =>
              g.round === round &&
              (g.home.code === teamCode || g.away.code === teamCode)
          );
          if (game) {
            return this.settings.showGameDetails(
              game,
              !this.bracketData.hasOwnProperty("displaySeeds") ||
                this.bracketData.displaySeeds === true
            );
          }
        }
      }

      return this.settings.showGameDetails(null);
    });

    this.reset();
  }

  resize = size => {
    this.cvs.width = size;
    this.cvs.height = size;
    this.cvs.style.width = `${size * this.settings.scale}px`;
    this.cvs.style.height = `${size * this.settings.scale}px`;
    this.render().catch(e => console.error(e));
  };

  getBracketData = () => {
    return this.bracketData;
  };

  getDataUrl = (type = "png") => {
    return this.cvs.toDataURL("image/" + type);
  };

  getRadiiForRound = round => {
    let center = Math.min(...this.getCenter());
    let radius = center - this.margin - this.titleHeight;
    let innerRadius = 0;
    let source = this.numRounds === 7 ? roundWidths : roundWidths32;

    for (let i = 1; i < round; i++) {
      radius -= center * source[i];
    }
    radius = Math.floor(radius);

    if (round < this.numRounds) {
      innerRadius = Math.floor(radius - center * source[round]);
    }

    return [radius, innerRadius];
  };

  getCenter = () => {
    return [this.cvs.width / 2, this.cvs.height / 2 + this.titleHeight];
  };

  setBracket = data => {
    this.bracketData = data;
  };

  reset = () => {
    if (this.bracketData) {
      this.numRounds =
        this.bracketData.games.reduce(
          (max, curr) => Math.max(max, curr.round),
          0
        ) + 1; // add a round for the champ game "round" which is just the final team by itself
      this.numEntries = Math.pow(2, this.numRounds - 1); // num entries is really the number of slots.  should rename this!
    }

    this.settings.showGameDetails(null);
    this.teamPaths = [];
    this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height);
    this.ctx.fillStyle = "#fff";
    this.ctx.fillRect(0, 0, this.cvs.width, this.cvs.height);
    this.ctx.translate(0, 0);

    this.fontSize = Math.floor(this.cvs.width * 0.0125);
    this.titleHeight = Math.floor(this.fontSize * 2.25);
    this.margin = Math.floor(this.cvs.width * 0.05);
  };

  render = () => {
    if (!this.bracketData) {
      return;
    }

    this.reset();

    this.drawTitle();
    this.drawRegionNames();

    if (
      !this.bracketData.hasOwnProperty("displaySeeds") ||
      this.bracketData.displaySeeds
    ) {
      this.drawSeeds();
    }

    // draw gray bg on radius
    const [x, y] = this.getCenter();
    const radius = this.getRadiiForRound(0)[0];
    this.ctx.save();
    this.ctx.translate(x, y);
    this.ctx.beginPath();
    this.ctx.arc(0, 0, radius, 0, TO_RADIANS * 360);
    this.ctx.fillStyle = "#F7F7F7";
    this.ctx.fill();
    this.ctx.restore();

    const dataset = this.bracketData.games.filter(game => game.round > 0);

    let slotPromises = [];
    for (let i = 0; i < dataset.length; i++) {
      const game = dataset[i];

      if (game.home.code) {
        let homeRegionCode = game.region;
        if (game.round >= this.numRounds - 2) {
          homeRegionCode = findTeamRegion(dataset, game.home.code);
        }
        const homeTeamSlot = this.translateToSlot(
          homeRegionCode,
          game.round,
          game.home
        );
        slotPromises.push(
          this.fillSlot(game.round, homeTeamSlot, game.home.code)
        );
      }

      if (game.away.code) {
        let awayRegionCode = game.region;
        if (game.round >= this.numRounds - 2) {
          awayRegionCode = findTeamRegion(dataset, game.away.code);
        }
        const awayTeamSlot = this.translateToSlot(
          awayRegionCode,
          game.round,
          game.away
        );
        slotPromises.push(
          this.fillSlot(game.round, awayTeamSlot, game.away.code)
        );
      }
    }

    return Promise.all(slotPromises)
      .then(() => {
        return this.drawGrid();
      })
      .then(() => {
        // check to see if we have a champ game
        const champGame = dataset.find(
          game => game.round === this.numRounds - 1 && game.isComplete
        );
        if (champGame) {
          let winner;
          if (champGame.home.winner) {
            winner = champGame.home.code;
          } else if (champGame.away.winner) {
            winner = champGame.away.code;
          } else {
            winner = false;
          }

          return this.fillChamp(winner);
        } else {
          return Promise.resolve;
        }
      });
  };

  drawGrid = () => {
    const [centerX, centerY] = this.getCenter();

    // draw grid lines
    this.ctx.save();
    this.ctx.lineWidth = this.settings.gridStrokeWidth;
    this.ctx.strokeStyle = this.settings.gridStrokeStyle;
    this.ctx.translate(centerX, centerY);
    this.ctx.rotate(TO_RADIANS * 90);

    for (let i = 1; i < this.numRounds; i++) {
      const path = new Path2D();
      const slots = this.numEntries / Math.pow(2, i - 1);
      const [radius, innerRadius] = this.getRadiiForRound(i);

      // outer arc
      path.arc(0, 0, radius, 0, 2 * Math.PI);

      // inner lines, skip on last ring
      if (i < this.numRounds - 1) {
        for (let j = 0; j < slots; j++) {
          let t1 = ((Math.PI * 2) / slots) * j;
          let x1 = Math.floor(radius * Math.cos(t1));
          let y1 = Math.floor(radius * Math.sin(t1));
          let x2 = Math.floor(innerRadius * Math.cos(t1));
          let y2 = Math.floor(innerRadius * Math.sin(t1));
          path.moveTo(x1, y1);
          path.lineTo(x2, y2);
        }
      }

      this.ctx.stroke(path);
    }

    // draw a line up and down the center for the champ game divider
    const radius = this.getRadiiForRound(this.numRounds - 1)[0];
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.moveTo(centerX, centerY + radius);
    this.ctx.lineTo(centerX, centerY - radius);
    this.ctx.stroke();

    this.ctx.restore();
  };

  drawSeeds = () => {
    const seeds = [1, 16, 8, 9, 5, 12, 4, 13, 6, 11, 3, 14, 7, 10, 2, 15];
    const [centerX, centerY] = this.getCenter();
    const radius = this.getRadiiForRound(1)[0] * 1.05;

    this.ctx.save();
    this.ctx.font = `${this.fontSize}px "Open Sans"`;
    this.ctx.translate(centerX, centerY);
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#555";

    // this allows for older seasons that have fewer than 16 seeds
    const seedsInBracket = this.bracketData.games.reduce((accu, curr) => {
      const homeSeed = curr.home.seed;
      const awaySeed = curr.away.seed;
      if (accu.indexOf(homeSeed) < 0) {
        accu.push(homeSeed);
      }
      if (accu.indexOf(awaySeed) < 0) {
        accu.push(awaySeed);
      }
      return accu;
    }, []);

    for (let i = 0; i < this.numEntries; i++) {
      const seed = seeds[i % 16];
      // skip seeds that don't exist for this tournament
      if (seedsInBracket.indexOf(seed) < 0) {
        continue;
      }

      let t1 = ((Math.PI * 2) / this.numEntries) * i;
      let t2 = ((Math.PI * 2) / this.numEntries) * (i + 1);
      let t = t1 + (t2 - t1) / 2;
      let x = Math.floor(radius * Math.cos(t));
      let y = Math.floor(radius * Math.sin(t) + 3);
      this.ctx.fillText(seed.toString(), x, y);
    }

    this.ctx.restore();
  };

  drawTitle = () => {
    this.ctx.save();
    this.ctx.fillStyle = "#000";
    this.ctx.textAlign = "center";
    this.ctx.font = `${this.fontSize * 1.75}px "Open Sans"`;
    this.ctx.fillText(
      `${this.bracketData.year} NCAA Men's Basketball Tournament`,
      this.getCenter()[0],
      this.titleHeight + 5,
      this.cvs.width - this.margin
    );
    this.ctx.restore();
  };

  drawRegionNames = () => {
    // only draw regions if names are present for all of them
    const regions = this.bracketData.regions.filter(
      region => region.name.length > 0
    );

    if (regions.length !== this.bracketData.regions.length) {
      return;
    }

    const [centerX, centerY] = this.getCenter();
    const radius = centerX * 0.95 - this.margin - this.titleHeight;
    let x, y, textAlign;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    this.ctx.font = `${this.fontSize * 1.5}px "Open Sans"`;
    this.ctx.fillStyle = "#999";
    for (let i = 0; i < regions.length; i++) {
      switch (regions[i].position) {
        case "TL":
          x = -radius;
          y = -radius;
          textAlign = "left";
          break;
        case "TR":
          x = radius;
          y = -radius;
          textAlign = "right";
          break;
        case "BL":
          x = -radius;
          y = radius;
          textAlign = "left";
          break;
        case "BR":
          x = radius;
          y = radius;
          textAlign = "right";
          break;
        default:
          console.error("invalid region position", regions[i].position);
          return;
      }
      this.ctx.textAlign = textAlign;
      this.ctx.fillText(regions[i].name.toUpperCase(), x, y);
    }
    this.ctx.restore();
  };

  fillSlot = (round, slot, teamCode) => {
    if (round === this.numRounds - 1) {
      return this.fillChampGameSlot(slot, teamCode);
    }

    return new Promise((resolve, reject) => {
      const team = teams[teamCode];
      const [centerX, centerY] = this.getCenter();
      const [radius, innerRadius] = this.getRadiiForRound(round);
      const slots = this.numEntries / Math.pow(2, round - 1);
      const degrees = 360 / slots;

      // find logo position and dims
      const { x, y, maxWidth, maxHeight } = calcImageBox(
        radius,
        innerRadius,
        centerX,
        centerY,
        slots,
        slot
      );

      const img = new Image();
      const [url, revoke] = createImageUrlFromLogo(team.logo.url);

      img.addEventListener("load", () => {
        revoke();

        let [width, height] = this.scaleDims(
          img.width,
          img.height,
          maxWidth,
          maxHeight
        );
        const xOffset = (maxWidth - width) / 2;
        const yOffset = (maxHeight - height) / 2;
        const angle1 = degrees * slot;
        const angle2 = angle1 + degrees;

        let imgX = x + xOffset;
        let imgY = y + yOffset;

        // TODO: for final four, offset images to fit in slice better, and oversize them a little more maybe?

        // create path for background and logo clip area
        this.ctx.save();
        const path = new Path2D();
        path.arc(
          centerX,
          centerY,
          radius,
          TO_RADIANS * angle1,
          TO_RADIANS * angle2
        );
        path.arc(
          centerX,
          centerY,
          innerRadius,
          TO_RADIANS * angle2,
          TO_RADIANS * angle1,
          true
        );
        path.closePath();
        this.ctx.fillStyle =
          team.logo.background || team.primaryColor || "#FFFFFF";
        this.ctx.fill(path);
        this.ctx.clip(path);
        this.teamPaths.push({ path, teamCode, team, round });

        // draw logo in clipping path
        this.ctx.drawImage(img, imgX, imgY, width, height);

        // reset the context
        this.ctx.restore();
        resolve();
      });
      img.addEventListener("error", e => {
        console.error("Error displaying image for " + team.name, e.message);
        resolve(); // we could reject, but don't want to stop the rest of the grid from being drawn
      });
      img.src = url;
    });
  };

  fillChampGameSlot = (slot, teamCode) => {
    return new Promise((resolve, reject) => {
      const team = teams[teamCode];
      const [centerX, centerY] = this.getCenter();
      const radius = this.getRadiiForRound(this.numRounds - 1)[0];

      const img = new Image();
      const [url, revoke] = createImageUrlFromLogo(team.logo.url);

      img.addEventListener("load", () => {
        revoke();

        this.ctx.save();
        const path = new Path2D();
        const startAngle = 90 * TO_RADIANS;
        const endAngle = 270 * TO_RADIANS;
        const antiClockwise = slot === 0;
        path.arc(centerX, centerY, radius, startAngle, endAngle, antiClockwise);
        path.closePath();
        this.teamPaths.push({
          path,
          teamCode,
          team,
          round: this.numRounds - 1
        });
        this.ctx.fillStyle =
          team.logo.background || team.primaryColor || "#FFFFFF";
        this.ctx.stroke(path);
        this.ctx.fill(path);
        this.ctx.clip(path);

        let size = Math.floor(radius * 1.5);
        let x = centerX + size / 4;
        let y = centerY - size / 2;
        if (slot === 1) {
          x -= size;
        } else {
          x -= size / 2;
        }

        this.ctx.drawImage(img, x, y, size, size);
        this.ctx.restore();
        resolve();
      });
      img.addEventListener("error", e => {
        console.error("Error displaying image for " + team.name, e.message);
        resolve();
      });
      img.src = url;
    });
  };

  fillChamp = teamCode => {
    return new Promise((resolve, reject) => {
      let team;
      if (teamCode === false) {
        team = {
          name: "Vacated",
          logo: {
            url: "img/logos/vacated.svg",
            background: "brown"
          }
        };
      } else {
        team = teams[teamCode];
      }
      const [centerX, centerY] = this.getCenter();
      const radius = centerX * roundWidths[roundWidths.length - 1];

      const img = new Image();
      const [url, revoke] = createImageUrlFromLogo(team.logo.url);

      img.addEventListener("load", () => {
        revoke();

        let size = Math.floor(radius * 4);
        let posX = centerX - size / 2;
        let posY = centerY - size / 2;
        this.ctx.save();
        this.ctx.beginPath();
        this.ctx.moveTo(centerX + radius, centerY);
        this.ctx.strokeStyle = this.settings.gridStrokeStyle;
        this.ctx.lineWidth = this.settings.gridStrokeWidth;
        this.ctx.fillStyle =
          team.logo.background || team.primaryColor || "#FFF";
        this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.shadowColor = "#000000";
        this.ctx.shadowBlur = 25;
        this.ctx.drawImage(img, posX, posY, size, size);
        this.ctx.restore();
        resolve();
      });
      img.addEventListener("error", e => {
        console.error("Error displaying image for " + team.name, e.message);
        resolve();
      });
      img.src = url;
    });
  };

  scaleDims = (w, h, mW, mH) => {
    let scale = Math.min(mW, mH) / Math.max(w, h);
    return [Math.floor(w * scale), Math.floor(h * scale)];
  };

  translateToSlot = (regionCode, round, team) => {
    let quadrant;

    switch (regionCode) {
      case "TL":
        quadrant = 2;
        break;
      case "TR":
        quadrant = 3;
        break;
      case "BL":
        quadrant = 1;
        break;
      case "BR":
        quadrant = 0;
        break;
    }

    if (round === this.numRounds - 1) {
      // champ game
      return quadrant === 2 || quadrant === 1 ? 1 : 0;
    } else if (round === this.numRounds - 2) {
      // final four
      return quadrant;
    } else {
      // regional round
      const slots = Math.pow(2, this.numRounds - round);
      const offset = (slots / 4) * quadrant;
      let roundIndex = round - 1;

      // TODO: fix this hard-coded round check that shifts our seedSlotMap down when the bracket is 32 teams or fewer
      if (this.numRounds < 7) {
        roundIndex++;
      }
      return offset + seedSlotMap[roundIndex][team.seed - 1];
    }
  };
}

function calcImageBox(radius, innerRadius, centerX, centerY, slots, slot) {
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

  // these values give us oversized areas to display the logo in
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
}

function findTeamRegion(allGames, teamCode) {
  return allGames.find(game => {
    return game.home.code === teamCode || game.away.code === teamCode;
  }).region;
}
