const TO_RADIANS = Math.PI / 180;

export const drawGrid = (cvs, numEntries, margin) => {
  const ctx = cvs.getContext("2d");
  const center = cvs.width / 2;
  const roundWidth = cvs.width * 0.065;
  const numRounds = Math.sqrt(numEntries) - 1;

  // draw grid lines
  ctx.lineWidth = 1;
  ctx.strokeStyle = "#000000";
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  for (let i = 0; i < numRounds; i++) {
    const path = new Path2D();
    const radius = cvs.width / 2 - roundWidth * i - margin;
    const slots = numEntries / Math.pow(2, i);

    // outer arc
    path.arc(center, center, radius, 0, 2 * Math.PI);

    // inner lines, skip on last round
    if (numRounds > i + 1) {
      for (let j = 0; j < slots; j++) {
        let t1 = ((Math.PI * 2) / slots) * j;
        let x1 = Math.floor(radius * Math.cos(t1) + center);
        let y1 = Math.floor(radius * Math.sin(t1) + center);
        let x2 = Math.floor((radius - roundWidth) * Math.cos(t1) + center);
        let y2 = Math.floor((radius - roundWidth) * Math.sin(t1) + center);
        path.moveTo(x1, y1);
        path.lineTo(x2, y2);
      }
    }

    ctx.stroke(path);
  }
};

export const fillSlot = (cvs, numEntries, margin, round, slot, team) => {
  const ctx = cvs.getContext("2d");
  const center = cvs.width / 2;
  const roundWidth = cvs.width * 0.065;
  const radius = cvs.width / 2 - roundWidth * round - margin;
  const innerRadius = cvs.width / 2 - roundWidth * (round + 1) - margin;
  const slots = numEntries / Math.pow(2, round);
  const degrees = 360 / slots;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(center, center);
  ctx.rotate(degrees * (slot - 1) * TO_RADIANS);

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

  ctx.fillStyle = team.logo.background || team.primaryColor || "#FFFFFF";
  ctx.fill(path);

  // find logo position and dims
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

  // TODO: don't let the image get more than some percentage greater than the width/height of the slot
  const imgMaxWidth = Math.abs(x2 - x1);
  const imgMaxHeight = Math.abs(y2 - y1);
  const logo = require("../" + team.logo.url);
  const img = new Image();
  const DOMURL = window.URL || window.webkitURL || window;
  let url;
  let isSVGXML = false;

  // logo might be a path to a file or it could be a SVG XML code
  if (logo.substring(0, 4) === "<svg") {
    const svg = new Blob([logo], { type: "image/svg+xml" });
    url = DOMURL.createObjectURL(svg);
    isSVGXML = true;
  } else {
    url = logo;
  }

  img.addEventListener("load", () => {
    if (isSVGXML) {
      DOMURL.revokeObjectURL(url);
    }

    const [width, height] = scaleDims(
      img.width,
      img.height,
      imgMaxWidth,
      imgMaxHeight
    );
    const xOffset = (imgMaxWidth - width) / 2;
    const yOffset = (imgMaxHeight - height) / 2;

    ctx.save();
    // TODO: this works fine for slots that don't arc more than 1/4 of a circle.  need more points of reference for larger slots (champ teams and winner)
    ctx.beginPath();
    ctx.arc(
      center,
      center,
      radius,
      TO_RADIANS * degrees * slot,
      TO_RADIANS * (degrees + degrees * slot)
    );
    ctx.arc(
      center,
      center,
      innerRadius,
      TO_RADIANS * (degrees + degrees * slot),
      TO_RADIANS * degrees * slot,
      true
    );
    ctx.closePath();
    if (round > 4) {
      ctx.strokeStyle = "yellow";
      ctx.stroke();
    } else {
      ctx.clip();
    }
    ctx.drawImage(img, x1 + xOffset, y1 + yOffset, width, height);
    ctx.restore();
  });
  img.addEventListener("error", e => {
    console.error("Error displaying image for " + team.name, e.message);
  });
  img.src = url;
};

const scaleDims = (w, h, mW, mH) => {
  let scale = Math.min(mW, mH) / Math.max(w, h);
  return [w * scale, h * scale];
};
