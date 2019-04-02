const TO_RADIANS = Math.PI / 180;

export const drawGrid = (cvs, numEntries, margin) => {
  const ctx = cvs.getContext("2d");
  const center = cvs.width / 2;
  const roundWidth = cvs.width * 0.065;
  const numRounds = Math.sqrt(numEntries) - 1;

  // draw grid lines
  ctx.lineWidth = 1;
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

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.translate(center, center);

  const radius = cvs.width / 2 - roundWidth * round - margin;
  const slots = numEntries / Math.pow(2, round);
  const degrees = 360 / slots;

  ctx.rotate(degrees * (slot - 1) * TO_RADIANS);
  let innerRadius = cvs.width / 2 - roundWidth * (round + 1) - margin;

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

  ctx.fillStyle = team.secondaryColor;
  ctx.fill(path);

  // find center point for logo position
  let t1 = ((Math.PI * 2) / slots) * slot;
  let t2 = ((Math.PI * 2) / slots) * (slot + 1);
  let x1 = Math.floor(radius * Math.cos(t1) + center);
  let y1 = Math.floor(radius * Math.sin(t1) + center);
  let x2 = Math.floor((radius - roundWidth) * Math.cos(t2) + center);
  let y2 = Math.floor((radius - roundWidth) * Math.sin(t2) + center);
  let logoX = Math.max(x1, x2) - Math.abs(x2 - x1) / 2;
  let logoY = Math.max(y2, y2) - Math.abs(y2 - y1) / 2;

  drawLogo(
    ctx,
    logoX,
    logoY,
    30,
    0, //-90 + degrees * slot,
    require("../" + team.logo.url),
    team.name
  );
};

export const drawLogo = (ctx, x, y, size, angle, logo, alt) => {
  const DOMURL = window.URL || window.webkitURL || window;
  const img = new Image();
  const svg = new Blob([logo], { type: "image/svg+xml" });
  const url = DOMURL.createObjectURL(svg);
  img.addEventListener("load", () => {
    let width, height;
    width = size;
    height = Math.floor((size / img.width) * img.height);

    ctx.translate(x, y);
    ctx.rotate(angle * (Math.PI / 180));
    ctx.drawImage(img, -width / 2, -height / 2, width, height);
    ctx.resetTransform();
    DOMURL.revokeObjectURL(url);
  });
  img.addEventListener("error", e => {
    console.log(alt, logo);
    console.error("Error displaying image for " + alt, e.message);
  });
  img.src = url;
};
