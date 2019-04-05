import teams from "../data/teams";

const DOMURL = window.URL || window.webkitURL || window;
const TO_RADIANS = Math.PI / 180;

const DEFAULTS = {
  numEntries: 64,
  gridStrokeWidth: 2,
  gridStrokeStyle: "#fff",
  roundWidthPct: 0.065,
  margin: 10
};

export default class Bracket {
  constructor(cvs, settings = {}) {
    this.cvs = cvs;
    this.ctx = cvs.getContext("2d");

    this.settings = { ...DEFAULTS, ...settings };
    this.numEntries = this.settings.numEntries;
    this.numRounds = Math.sqrt(this.numEntries) - 1;

    this.bracketData = undefined;

    this.reset();
  }

  getRoundWidth = (round = 1) => {
    return this.cvs.width * this.settings.roundWidthPct;
  };

  getCenter = () => {
    return [this.cvs.width / 2, this.cvs.height / 2];
  };

  setBracket = data => {
    this.bracketData = data;
  };

  reset = () => {
    this.ctx.clearRect(0, 0, this.cvs.width, this.cvs.height);
  };

  render = () => {
    if (!this.bracketData) {
      return;
    }

    this.reset();

    const dataset = this.bracketData.games.filter(
      game => game.round > 0 && game.home.code !== ""
    );
    for (let i = 0; i < dataset.length; i++) {
      const game = dataset[i];

      let homeRegionCode = game.region;
      let awayRegionCode = game.region;

      if (game.round >= 5) {
        homeRegionCode = findTeamRegion(dataset, game.home.code);
        awayRegionCode = findTeamRegion(dataset, game.away.code);
      }

      const homeTeamSlot = translateToSlot(
        homeRegionCode,
        game.round,
        game.home
      );
      const awayTeamSlot = translateToSlot(
        awayRegionCode,
        game.round,
        game.away
      );

      this.fillSlot(game.round - 1, homeTeamSlot, teams[game.home.code]);
      this.fillSlot(game.round - 1, awayTeamSlot, teams[game.away.code]);
    }

    // draw the grid
    this.drawGrid();

    // check to see if we have a champ game
    const champGame = dataset.find(game => game.round === 6 && game.isComplete);
    if (champGame) {
      let winner;
      if (champGame.home.winner) {
        winner = teams[champGame.home.code];
      } else if (champGame.away.winner) {
        winner = teams[champGame.away.code];
      } else {
        winner = {
          name: "Vacated",
          logo: {
            url: "img/logos/vacated.svg",
            background: "brown"
          }
        };
      }

      setTimeout(() => {
        this.fillChamp(winner);
      }, 500);
    }
  };

  drawGrid = () => {
    const center = this.getCenter()[0];
    const roundWidth = this.getRoundWidth();

    // draw grid lines
    this.ctx.save();
    this.ctx.lineWidth = this.settings.gridStrokeWidth;
    this.ctx.strokeStyle = this.settings.gridStrokeStyle;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.translate(center, center);
    this.ctx.rotate(TO_RADIANS * 90);

    for (let i = 0; i < this.numRounds - 1; i++) {
      const path = new Path2D();
      const radius =
        this.getCenter()[0] - roundWidth * i - this.settings.margin;
      const slots = this.numEntries / Math.pow(2, i);

      // outer arc
      path.arc(0, 0, radius, 0, 2 * Math.PI);

      // inner lines, skip on last ring
      if (i < this.numRounds - 2) {
        for (let j = 0; j < slots; j++) {
          let t1 = ((Math.PI * 2) / slots) * j;
          let x1 = Math.floor(radius * Math.cos(t1));
          let y1 = Math.floor(radius * Math.sin(t1));
          let x2 = Math.floor((radius - roundWidth) * Math.cos(t1));
          let y2 = Math.floor((radius - roundWidth) * Math.sin(t1));
          path.moveTo(x1, y1);
          path.lineTo(x2, y2);
        }
      }

      this.ctx.stroke(path);
    }
    this.ctx.restore();
  };

  fillSlot = (round, slot, team) => {
    if (round === 5) {
      return this.fillChampSlot(slot, team);
    }

    const roundWidth = this.getRoundWidth();
    const center = this.getCenter()[0];
    const margin = this.settings.margin;
    const radius = center - roundWidth * round - margin;
    const innerRadius = center - roundWidth * (round + 1) - margin;
    const slots = this.numEntries / Math.pow(2, round);
    const degrees = 360 / slots;

    // reset and rotate the context to draw this slot in the right place
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.translate(center, center);
    const rotateAmount = degrees * (slot - 1) * TO_RADIANS;
    this.ctx.rotate(rotateAmount);

    // create path for slot, used for background color and as the image clipping path
    const path = new Path2D();
    path.arc(
      0,
      0,
      radius,
      TO_RADIANS * degrees,
      TO_RADIANS * (degrees * 2),
      false
    );
    path.arc(
      0,
      0,
      innerRadius,
      TO_RADIANS * (degrees * 2),
      TO_RADIANS * degrees,
      true
    );

    this.ctx.fillStyle = team.logo.background || team.primaryColor || "#FFFFFF";
    this.ctx.fill(path);
    this.ctx.restore();

    // find logo position and dims
    const { x1, y1, x2, y2 } = calcImageBox(
      radius,
      innerRadius,
      center,
      slots,
      slot
    );

    // TODO: don't let the image get more than some percentage greater than the width/height of the slot
    let imgMaxWidth = Math.abs(x2 - x1);
    let imgMaxHeight = Math.abs(y2 - y1);

    const img = new Image();
    const url = createImageUrlFromLogo(team.logo.url);

    img.addEventListener("load", () => {
      DOMURL.revokeObjectURL(img.url);

      let xOffset = 0,
        yOffset = 0;

      let [width, height] = this.scaleDims(
        img.width,
        img.height,
        imgMaxWidth,
        imgMaxHeight
      );
      xOffset += (imgMaxWidth - width) / 2;
      yOffset += (imgMaxHeight - height) / 2;

      // create clipping path for logo
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(
        center,
        center,
        radius,
        TO_RADIANS * degrees * slot,
        TO_RADIANS * (degrees + degrees * slot)
      );
      this.ctx.arc(
        center,
        center,
        innerRadius,
        TO_RADIANS * (degrees + degrees * slot),
        TO_RADIANS * degrees * slot,
        true
      );
      this.ctx.closePath();
      this.ctx.clip();

      if (round === 5) {
        width = innerRadius * 2;
        height = innerRadius * 2;
      }

      // draw logo in clipping path
      this.ctx.drawImage(img, x1 + xOffset, y1 + yOffset, width, height);

      // reset the context
      this.ctx.restore();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    });
    img.addEventListener("error", e => {
      console.error("Error displaying image for " + team.name, e.message);
    });
    img.src = url;
  };

  fillChampSlot = (slot, team) => {
    // reset and rotate the context to draw this slot in the right place
    const center = this.getCenter()[0];
    const radius = center - this.getRoundWidth() * 5 - this.settings.margin;

    // background color

    //    this.ctx.restore();

    const img = new Image();
    const url = createImageUrlFromLogo(team.logo.url);

    img.addEventListener("load", () => {
      DOMURL.revokeObjectURL(url);
      this.ctx.save();
      this.ctx.setTransform(1, 0, 0, 1, 0, 0);
      this.ctx.translate(center, center);
      this.ctx.rotate((slot ? 90 : -90) * TO_RADIANS);
      const path = new Path2D();
      path.arc(0, 0, radius, 0, TO_RADIANS * 180, false);
      this.ctx.fillStyle =
        team.logo.background || team.primaryColor || "#FFFFFF";
      this.ctx.fill(path);

      // logo
      this.ctx.beginPath();
      this.ctx.arc(0, 0, radius, 0, TO_RADIANS * 180);
      this.ctx.closePath();
      this.ctx.lineWidth = this.settings.gridStrokeWidth;
      this.ctx.strokeStyle = this.settings.gridStrokeStyle;
      this.ctx.stroke();
      this.ctx.clip();

      let size = radius * 1.5;
      let x = size / 4;
      let y = -size / 2;
      if (slot === 1) {
        x -= size;
      } else {
        x -= size / 2;
      }

      // half circle is rotated 90 degrees left or right for background.  rotate back for logo
      this.ctx.rotate((slot ? -90 : 90) * TO_RADIANS);
      this.ctx.strokeRect(0, 0, 5, 5);
      this.ctx.drawImage(img, x, y, size, size);
      this.ctx.restore();
    });
    img.addEventListener("error", e => {
      console.error("Error displaying image for " + team.name, e.message);
    });
    img.src = url;
  };

  fillChamp = team => {
    const center = this.getCenter()[0];
    const radius = center - this.getRoundWidth() * 6 - this.settings.margin;

    const img = new Image();
    const url = createImageUrlFromLogo(team.logo.url);

    img.addEventListener("load", () => {
      DOMURL.revokeObjectURL(url);
      let size = radius * 2.75;
      let pos = center - size / 2;
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.moveTo(center + radius, center);
      this.ctx.strokeStyle = this.settings.gridStrokeStyle;
      this.ctx.lineWidth = this.settings.gridStrokeWidth;
      this.ctx.fillStyle = team.logo.background || team.primaryColor || "#FFF";
      this.ctx.arc(center, center, radius, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
      this.ctx.shadowOffsetY = 5;
      this.ctx.shadowColor = "#000";
      this.ctx.shadowBlur = 20;
      this.ctx.drawImage(img, pos, pos, size, size);
      this.ctx.restore();
    });
    img.addEventListener("error", e => {
      console.error("Error displaying image for " + team.name, e.message);
    });
    img.src = url;
  };

  scaleDims = (w, h, mW, mH) => {
    let scale = Math.min(mW, mH) / Math.max(w, h);
    return [w * scale, h * scale];
  };
}

function calcImageBox(radius, innerRadius, center, slots, slot) {
  const quadrant = slot / slots;
  const t1 = ((Math.PI * 2) / slots) * slot;
  const t2 = ((Math.PI * 2) / slots) * (slot + 1);
  let x1Radius, y1Radius, x2Radius, y2Radius;

  if (quadrant <= 0.25) {
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
    Math.min(x1Radius * Math.cos(t1), x1Radius * Math.cos(t2)) + center
  );
  const y1 = Math.floor(
    Math.min(y1Radius * Math.sin(t1), y1Radius * Math.sin(t2)) + center
  );
  const x2 = Math.floor(
    Math.max(x2Radius * Math.cos(t1), x2Radius * Math.cos(t2)) + center
  );
  const y2 = Math.floor(
    Math.max(y2Radius * Math.sin(t1), y2Radius * Math.sin(t2)) + center
  );

  return { x1, y1, x2, y2 };
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

const seedSlotMap = [
  [0, 14, 10, 6, 4, 8, 12, 2, 3, 13, 9, 5, 7, 11, 15, 1], // 64 teams
  [0, 7, 5, 3, 2, 4, 6, 1, 1, 6, 4, 2, 3, 5, 7, 0], // 32 teams
  [0, 3, 2, 1, 1, 2, 3, 0, 0, 3, 2, 1, 1, 2, 3, 0], // 16 teams
  [0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0], // 8 teams
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] // 4 teams
];

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
