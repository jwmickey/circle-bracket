#!/usr/bin/env node
/**
 * Generates favicon images from the completed bracket.
 * Shows the final four teams, championship finalists, and champion in the center.
 * Run after fetch-bracket when the tournament is complete.
 *
 * Usage: node bin/generate-favicon.js [year]
 */

const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const {
    findTeamByCode,
    scaleDims,
    calcImageBox,
    getRadiiForRound,
    translateToSlot,
} = require('../src/js/bracket-geometry');

const TO_RADIANS = Math.PI / 180;

const FAVICON_DIR = path.resolve(__dirname, '../favicon');
const RENDER_SIZE = 600;

// Favicon output sizes: [size, filename]
const FAVICON_OUTPUTS = [
    [16, 'favicon-16x16.png'],
    [32, 'favicon-32x32.png'],
    [180, 'apple-touch-icon.png'],
    [192, 'android-chrome-192x192.png'],
    [512, 'android-chrome-512x512.png'],
];

/**
 * Finds a team's original region from the games dataset.
 * Since final four/championship games have no region, we look at earlier games.
 */
function findTeamRegion(games, teamCode) {
    const game = games.find(g =>
        (g.home.code === teamCode || g.away.code === teamCode) && g.region
    );
    return game ? game.region : null;
}

async function loadTeamLogo(teamCode) {
    const teamInfo = findTeamByCode(teamCode);
    if (!teamInfo || !teamInfo.logo) {
        return { img: null, teamInfo: teamInfo || null };
    }
    const logoPath = path.resolve(__dirname, '../src', teamInfo.logo.url);
    try {
        const img = await loadImage(logoPath);
        return { img, teamInfo };
    } catch (e) {
        console.warn(`Could not load logo for ${teamCode}: ${e.message}`);
        return { img: null, teamInfo };
    }
}

/**
 * Draws a team logo in a final-four ring slot.
 */
function drawFinalFourSlot(ctx, img, teamInfo, slot, numRounds, numEntries, cx, cy, center, padding) {
    const ffRound = numRounds - 2;
    const [radius, innerRadius] = getRadiiForRound(ffRound, numRounds, center, padding);
    const slots = numEntries / Math.pow(2, ffRound - 1);
    const degrees = 360 / slots;
    const angle1 = TO_RADIANS * degrees * slot;
    const angle2 = TO_RADIANS * degrees * (slot + 1);

    ctx.save();

    // Build ring segment path using standard canvas API
    ctx.beginPath();
    ctx.arc(cx, cy, radius, angle1, angle2);
    ctx.arc(cx, cy, innerRadius, angle2, angle1, true);
    ctx.closePath();

    ctx.fillStyle = (teamInfo && teamInfo.logo && teamInfo.logo.background)
        || (teamInfo && teamInfo.primaryColor)
        || '#FFFFFF';
    ctx.fill();
    ctx.clip();

    if (img) {
        const slotsDeg = numEntries / Math.pow(2, ffRound - 1);
        const { x, y, maxWidth, maxHeight } = calcImageBox(radius, innerRadius, cx, cy, slotsDeg, slot);
        const [width, height] = scaleDims(img.width, img.height, maxWidth, maxHeight);
        const xOffset = (maxWidth - width) / 2;
        const yOffset = (maxHeight - height) / 2;
        ctx.drawImage(img, x + xOffset, y + yOffset, width, height);
    }

    ctx.restore();
}

/**
 * Draws a team in the championship game half-circle slot.
 * Matches fillChampGameSlotSync in bracket.js.
 */
function drawChampGameSlot(ctx, img, teamInfo, slot, numRounds, cx, cy, center, padding) {
    const [radius] = getRadiiForRound(numRounds - 1, numRounds, center, padding);

    ctx.save();

    const startAngle = 90 * TO_RADIANS;
    const endAngle = 270 * TO_RADIANS;
    const antiClockwise = slot === 0;

    ctx.beginPath();
    ctx.arc(cx, cy, radius, startAngle, endAngle, antiClockwise);
    ctx.closePath();

    ctx.fillStyle = (teamInfo && teamInfo.logo && teamInfo.logo.background)
        || (teamInfo && teamInfo.primaryColor)
        || '#FFFFFF';
    ctx.stroke();
    ctx.fill();
    ctx.clip();

    if (img) {
        let size = Math.floor(radius * 1.5);
        let x = cx + size / 4;
        let y = cy - size / 2;
        if (slot === 1) {
            x -= size;
        } else {
            x -= size / 2;
        }
        ctx.drawImage(img, x, y, size, size);
    }

    ctx.restore();
}

/**
 * Draws the champion logo in the center circle.
 * Matches fillChamp in bracket.js.
 */
function drawChampion(ctx, img, teamInfo, vacated, numRounds, cx, cy, center, padding) {
    const [champGameRadius] = getRadiiForRound(numRounds - 1, numRounds, center, padding);
    const radius = champGameRadius / 2.25;

    ctx.save();

    if (vacated) {
        ctx.filter = 'grayscale(100%)';
    }

    ctx.beginPath();
    ctx.moveTo(cx + radius, cy);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.fillStyle = (teamInfo && teamInfo.logo && teamInfo.logo.background)
        || (teamInfo && teamInfo.primaryColor)
        || '#FFFFFF';
    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    if (img) {
        const size = Math.floor(radius * 4);
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 15;
        ctx.drawImage(img, cx - size / 2, cy - size / 2, size, size);
    }

    ctx.restore();
}

/**
 * Draws the grid (concentric circles and radial dividers) for the inner rings.
 */
function drawGridLines(ctx, numRounds, numEntries, cx, cy, center, padding) {
    const ffRound = numRounds - 2;
    const [ffOuterRadius] = getRadiiForRound(ffRound, numRounds, center, padding);
    const [champRadius] = getRadiiForRound(numRounds - 1, numRounds, center, padding);

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#FFFFFF';

    // Outer circle of final four ring
    ctx.beginPath();
    ctx.arc(cx, cy, ffOuterRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Inner circle of final four ring (= outer circle of champ game ring)
    ctx.beginPath();
    ctx.arc(cx, cy, champRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Radial dividers for the final four ring
    // Grid is drawn with 90-degree rotation, so lines are at 90°, 180°, 270°, 0°
    const ffSlots = numEntries / Math.pow(2, ffRound - 1);
    for (let j = 0; j < ffSlots; j++) {
        // Rotated coordinate system: add 90 degrees offset
        const angle = ((Math.PI * 2) / ffSlots) * j + (Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(cx + ffOuterRadius * Math.cos(angle), cy + ffOuterRadius * Math.sin(angle));
        ctx.lineTo(cx + champRadius * Math.cos(angle), cy + champRadius * Math.sin(angle));
        ctx.stroke();
    }

    // Vertical center divider for the championship game
    ctx.beginPath();
    ctx.moveTo(cx, cy + champRadius);
    ctx.lineTo(cx, cy - champRadius);
    ctx.stroke();

    ctx.restore();
}

async function generateFavicon(year) {
    const bracketPath = path.resolve(__dirname, '../seasons', `bracket-${year}.json`);

    if (!fs.existsSync(bracketPath)) {
        console.error(`Bracket file not found: ${bracketPath}`);
        process.exit(1);
    }

    const bracketData = JSON.parse(fs.readFileSync(bracketPath, 'utf8'));
    const allGames = bracketData.games;
    const numRounds = allGames.reduce((max, curr) => Math.max(max, curr.round), 0) + 1;
    const numEntries = Math.pow(2, numRounds - 1);
    const champRound = numRounds - 1;
    const ffRound = numRounds - 2;

    // Check if the tournament is complete (championship game has a winner)
    const champGame = allGames.find(g => g.round === champRound && g.isComplete);
    if (!champGame) {
        console.log('Tournament not yet complete, skipping favicon generation.');
        return false;
    }

    const champion = champGame.home.winner ? champGame.home : champGame.away;
    console.log(`Generating favicon for ${year} champion: ${champion.name}`);

    // Set up the rendering canvas
    const size = RENDER_SIZE;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    const cx = size / 2;
    const cy = size / 2;
    const center = size / 2;
    const padding = Math.floor(size * 0.03);

    // Compute the outer radius of the final four ring for cropping
    const [ffOuterRadius] = getRadiiForRound(ffRound, numRounds, center, padding);

    // White background
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, size, size);

    // Gray background disc for the inner area
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, ffOuterRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#F7F7F7';
    ctx.fill();
    ctx.restore();

    // Only use non-play-in games (round > 0)
    const games = allGames.filter(g => g.round > 0);

    // Draw the final four teams in their ring slots
    const ffTeams = [];
    games.filter(g => g.round === ffRound).forEach(game => {
        ffTeams.push(game.home, game.away);
    });

    for (const team of ffTeams) {
        if (!team.code) continue;
        const region = findTeamRegion(games, team.code);
        if (!region) continue;
        const slot = translateToSlot(region, ffRound, numRounds);
        const { img, teamInfo } = await loadTeamLogo(team.code);
        drawFinalFourSlot(ctx, img, teamInfo, slot, numRounds, numEntries, cx, cy, center, padding);
    }

    // Draw the championship game finalists in the inner half-circle slots
    const champTeams = [];
    games.filter(g => g.round === champRound).forEach(game => {
        champTeams.push(game.home, game.away);
    });

    for (const team of champTeams) {
        if (!team.code) continue;
        const region = findTeamRegion(games, team.code);
        if (!region) continue;
        const slot = translateToSlot(region, champRound, numRounds);
        const { img, teamInfo } = await loadTeamLogo(team.code);
        drawChampGameSlot(ctx, img, teamInfo, slot, numRounds, cx, cy, center, padding);
    }

    // Draw grid lines over the slot fills
    drawGridLines(ctx, numRounds, numEntries, cx, cy, center, padding);

    // Draw the champion in the very center
    const { img: champImg, teamInfo: champInfo } = await loadTeamLogo(champion.code);
    drawChampion(ctx, champImg, champInfo, champion.vacated === true, numRounds, cx, cy, center, padding);

    // Crop to a square centered on the bracket center, sized to include the final four ring
    const cropRadius = ffOuterRadius;
    const cropSize = cropRadius * 2;
    const cropX = cx - cropRadius;
    const cropY = cy - cropRadius;

    // Create a cropped canvas with a circular clip mask
    const cropCanvas = createCanvas(cropSize, cropSize);
    const cropCtx = cropCanvas.getContext('2d');

    cropCtx.save();
    cropCtx.beginPath();
    cropCtx.arc(cropRadius, cropRadius, cropRadius, 0, Math.PI * 2);
    cropCtx.clip();
    cropCtx.drawImage(canvas, cropX, cropY, cropSize, cropSize, 0, 0, cropSize, cropSize);
    cropCtx.restore();

    // Generate each favicon size
    if (!fs.existsSync(FAVICON_DIR)) {
        fs.mkdirSync(FAVICON_DIR, { recursive: true });
    }

    for (const [outputSize, filename] of FAVICON_OUTPUTS) {
        const outCanvas = createCanvas(outputSize, outputSize);
        const outCtx = outCanvas.getContext('2d');
        outCtx.drawImage(cropCanvas, 0, 0, cropCanvas.width, cropCanvas.height, 0, 0, outputSize, outputSize);

        const outPath = path.join(FAVICON_DIR, filename);
        const buffer = outCanvas.toBuffer('image/png');
        fs.writeFileSync(outPath, buffer);
        console.log(`✓ Saved ${outPath} (${outputSize}x${outputSize})`);
    }

    return true;
}

const year = parseInt(process.argv[2]) || new Date().getFullYear();

generateFavicon(year)
    .then(success => {
        if (!success) {
            console.log('No favicon generated.');
        }
    })
    .catch(err => {
        console.error('Error generating favicon:', err);
        process.exit(1);
    });
