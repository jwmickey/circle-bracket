import teams from "../data/teams";

const DOMURL = window.URL || window.webkitURL || window;
const TO_RADIANS = Math.PI / 180;

const seedSlotMap = [
  [0, 14, 10, 6, 4, 8, 12, 2, 3, 13, 9, 5, 7, 11, 15, 1], // 64 teams
  [0, 7, 5, 3, 2, 4, 6, 1, 1, 6, 4, 2, 3, 5, 7, 0], // 32 teams
  [0, 3, 2, 1, 1, 2, 3, 0, 0, 3, 2, 1, 1, 2, 3, 0], // 16 teams
  [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0], // 8 teams
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] // 4 teams
];

const roundWidths = [0, 0.075, 0.09, 0.125, 0.15, 0.18, 0.22, 0.12];

export const DEFAULTS = {
  numEntries: 64,
  gridStrokeWidth: 2,
  gridStrokeStyle: "#fff",
  showGameDetails: game => console.log(game.home.name, "vs.", game.away.name)
};

export default class Bracket {
  constructor(cvs, settings = {}) {
    this.cvs = cvs;
    this.ctx = cvs.getContext("2d", { alpha: false });
    this.ctx.font = "14pt Open Sans";

    this.settings = { ...DEFAULTS, ...settings };
    this.numEntries = this.settings.numEntries;
    this.numRounds = Math.sqrt(this.numEntries) - 1;
    this.bracketData = undefined;
    this.teamPaths = [];
    this.fontSize = 14;
    this.titleHeight = 24;
    this.margin = 50;

    this.cvs.addEventListener("click", event => {
      const rect = event.target.getBoundingClientRect();
      const x = event.clientX - rect.left; //x position within the element.
      const y = event.clientY - rect.top; //y position within the element.

      for (let entry of this.teamPaths) {
        if (this.ctx.isPointInPath(entry.path, x, y)) {
          const { teamCode, round } = entry;
          const game = this.bracketData.games.find(
            g =>
              g.round === round + 1 &&
              (g.home.code === teamCode || g.away.code === teamCode)
          );
          if (game) {
            return this.settings.showGameDetails(game);
          }
        }
      }

      return this.settings.showGameDetails(null);
    });

    this.reset();
  }

  getRadiiForRound = round => {
    let center = Math.min(...this.getCenter());
    let radius = center - this.margin - this.titleHeight;
    let innerRadius = 0;

    for (let i = 1; i < round; i++) {
      radius -= center * roundWidths[i];
    }
    radius = Math.floor(radius);

    if (round < this.numRounds) {
      innerRadius = Math.floor(radius - center * roundWidths[round]);
    }

    return [radius, innerRadius];
  };

  getCenter = () => {
    return [this.cvs.width / 2, this.cvs.height / 2 + this.titleHeight];
  };

  setBracket = data => {
    this.bracketData = data;
  };

  setSize = (width, height) => {
    this.cvs.width = width;
    this.cvs.height = height;

    this.render();
  };

  reset = () => {
    this.settings.showGameDetails(null);
    // this.fontSize = this.cvs.width * 0.015;
    this.teamPaths = [];
    this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.translate(0, 0);

    this.fontSize = Math.floor(this.cvs.width * 0.01);
    this.titleHeight = Math.floor(this.fontSize * 2.5);
    this.margin = Math.floor(this.cvs.width * 0.04);
  };

  render = () => {
    if (!this.bracketData) {
      return;
    }

    this.reset();

    this.drawTitle();
    this.drawRegionNames();
    this.drawSeeds();

    const dataset = this.bracketData.games.filter(game => game.round > 0);
    for (let i = 0; i < dataset.length; i++) {
      const game = dataset[i];

      if (game.home.code) {
        let homeRegionCode = game.region;
        if (game.round >= 5) {
          homeRegionCode = findTeamRegion(dataset, game.home.code);
        }
        const homeTeamSlot = translateToSlot(
          homeRegionCode,
          game.round,
          game.home
        );
        this.fillSlot(game.round - 1, homeTeamSlot, game.home.code);
      }

      if (game.away.code) {
        let awayRegionCode = game.region;
        if (game.round >= 5) {
          awayRegionCode = findTeamRegion(dataset, game.away.code);
        }
        const awayTeamSlot = translateToSlot(
          awayRegionCode,
          game.round,
          game.away
        );
        this.fillSlot(game.round - 1, awayTeamSlot, game.away.code);
      }
    }

    setTimeout(() => {
      this.drawGrid();
    }, 500);

    // check to see if we have a champ game
    const champGame = dataset.find(game => game.round === 6 && game.isComplete);
    if (champGame) {
      let winner;
      if (champGame.home.winner) {
        winner = champGame.home.code;
      } else if (champGame.away.winner) {
        winner = champGame.away.code;
      } else {
        winner = false;
      }

      setTimeout(() => {
        this.fillChamp(winner);
      }, 500);
    }
  };

  drawGrid = () => {
    const [centerX, centerY] = this.getCenter();

    // draw grid lines
    this.ctx.save();
    this.ctx.lineWidth = this.settings.gridStrokeWidth;
    this.ctx.strokeStyle = this.settings.gridStrokeStyle;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
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
    const radius = this.getRadiiForRound(this.numRounds - 2)[0];
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
    this.ctx.font = `${this.fontSize}pt "Open Sans"`;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.translate(centerX, centerY);
    this.ctx.textAlign = "center";
    this.ctx.fillStyle = "#555";

    for (let i = 0; i < this.numEntries; i++) {
      let t1 = ((Math.PI * 2) / this.numEntries) * i;
      let t2 = ((Math.PI * 2) / this.numEntries) * (i + 1);
      let t = t1 + (t2 - t1) / 2;
      let x = Math.floor(radius * Math.cos(t));
      let y = Math.floor(radius * Math.sin(t) + 5);
      this.ctx.fillText(seeds[i % 16].toString(), x, y);
    }

    this.ctx.restore();
  };

  drawTitle = () => {
    this.ctx.save();
    this.ctx.fillStyle = "#000";
    this.ctx.textAlign = "center";
    this.ctx.font = `${this.fontSize * 1.75}pt "Open Sans"`;
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
    this.ctx.font = `${this.fontSize}pt "Open Sans"`;
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
          console.log("invalid region position", regions[i].position);
          return;
      }
      this.ctx.textAlign = textAlign;
      this.ctx.fillText(regions[i].name.toUpperCase(), x, y);
    }
    this.ctx.restore();
  };

  fillSlot = (round, slot, teamCode) => {
    if (round === 5) {
      return this.fillChampGameSlot(slot, teamCode);
    }

    const team = teams[teamCode];
    const [centerX, centerY] = this.getCenter();
    const [radius, innerRadius] = this.getRadiiForRound(round + 1);
    const slots = this.numEntries / Math.pow(2, round);
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
    const url = createImageUrlFromLogo(team.logo.url);

    img.addEventListener("load", () => {
      DOMURL.revokeObjectURL(img.url);

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
    });
    img.addEventListener("error", e => {
      console.error("Error displaying image for " + team.name, e.message);
    });
    img.src = url;
  };

  fillChampGameSlot = (slot, teamCode) => {
    const team = teams[teamCode];
    const [centerX, centerY] = this.getCenter();
    const radius = this.getRadiiForRound(this.numRounds - 1)[0];

    const img = new Image();
    const url = createImageUrlFromLogo(team.logo.url);

    img.addEventListener("load", () => {
      DOMURL.revokeObjectURL(url);
      this.ctx.save();
      const path = new Path2D();
      const startAngle = 90 * TO_RADIANS;
      const endAngle = 270 * TO_RADIANS;
      const antiClockwise = slot === 0;
      path.arc(centerX, centerY, radius, startAngle, endAngle, antiClockwise);
      path.closePath();
      this.teamPaths.push({ path, teamCode, team, round: 5 });
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
    });
    img.addEventListener("error", e => {
      console.error("Error displaying image for " + team.name, e.message);
    });
    img.src = url;
  };

  fillChamp = teamCode => {
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
    const url = createImageUrlFromLogo(team.logo.url);

    img.addEventListener("load", () => {
      DOMURL.revokeObjectURL(url);
      let size = Math.floor(radius * 3.5);
      let posX = centerX - size / 2;
      let posY = centerY - size / 2;
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(centerX + radius, centerY);
      this.ctx.strokeStyle = this.settings.gridStrokeStyle;
      this.ctx.lineWidth = this.settings.gridStrokeWidth;
      this.ctx.fillStyle = team.logo.background || team.primaryColor || "#FFF";
      this.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.shadowColor = "#000000";
      this.ctx.shadowBlur = 25;
      this.ctx.drawImage(img, posX, posY, size, size);
      this.ctx.restore();
    });
    img.addEventListener("error", e => {
      console.error("Error displaying image for " + team.name, e.message);
    });
    img.src = url;
  };

  scaleDims = (w, h, mW, mH) => {
    let scale = Math.min(mW, mH) / Math.max(w, h);
    return [Math.floor(w * scale), Math.floor(h * scale)];
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

function createImageUrlFromLogo(logo) {
  const file = require("../" + logo);
  let url;

  // logo might be a path to a file or it could be a SVG XML code
  if (file.substring(0, 4) === "<svg") {
    const svg = new Blob([file], { type: "image/svg+xml" });
    url = DOMURL.createObjectURL(svg);
  } else {
    url = file;
  }

  return url;
}

function translateToSlot(regionCode, round, team) {
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

  if (round === 5) {
    return quadrant;
  } else if (round === 6) {
    return quadrant === 2 || quadrant === 1 ? 1 : 0;
  } else {
    const slots = 64 / Math.pow(2, round - 1);
    const offset = (slots / 4) * quadrant;
    return offset + seedSlotMap[round - 1][team.seed - 1];
  }
}

function findTeamRegion(allGames, teamCode) {
  return allGames.find(game => {
    return game.home.code === teamCode || game.away.code === teamCode;
  }).region;
}
