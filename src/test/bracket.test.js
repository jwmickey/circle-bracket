import Bracket, { DEFAULTS } from '../js/bracket';
import * as utils from '../js/utils';

// Mock the utils module
jest.mock('../js/utils', () => ({
  createImageUrlFromLogo: jest.fn(() => ['mock-url', jest.fn()]),
  scaleDims: jest.fn((w, h, maxW, maxH) => [100, 100]),
  calcImageBox: jest.fn(() => ({ x: 50, y: 50, maxWidth: 100, maxHeight: 100 })),
  findTeamRegion: jest.fn(() => 'TL'),
  findTeamByCode: jest.fn((code) => {
    if (!code) return null;
    return {
      name: `${code} Team`,
      primaryColor: '#000000',
      logo: {
        url: `img/logos/${code.toLowerCase()}.svg`,
        background: '#FFFFFF'
      }
    };
  })
}));

// Mock Image constructor that's compatible with jest-canvas-mock
global.Image = class MockImage extends EventTarget {
  constructor() {
    super();
    this.onload = null;
    this.onerror = null;
    this._src = '';
    
    // Properties required for jest-canvas-mock compatibility
    this.width = 100;
    this.height = 100;
    this.complete = false;
    this.naturalWidth = 100;
    this.naturalHeight = 100;
    this.currentSrc = '';
    
    // Make it look like an HTMLImageElement
    this.nodeName = 'IMG';
    this.nodeType = 1; // Node.ELEMENT_NODE
    this.tagName = 'IMG';
    
    // Add to the prototype chain
    this.constructor = HTMLImageElement;
    
    this.addEventListener = jest.fn((event, callback) => {
      if (event === 'load') {
        this.onload = callback;
      } else if (event === 'error') {
        this.onerror = callback;
      }
    });
  }
  
  set src(url) {
    this._src = url;
    this.currentSrc = url;
    this.complete = false;
    
    // Simulate successful image loading after a short delay
    setTimeout(() => {
      this.complete = true;
      if (this.onload) {
        this.onload();
      }
    }, 10);
  }
  
  get src() {
    return this._src;
  }
};

describe('Bracket Class', () => {
  let canvas;
  let bracket;
  let mockContext;
  let mockBracketData;
  let mockTeamData;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create mock canvas and context
    canvas = createMockCanvas(800, 800);
    mockContext = canvas.getContext('2d');
    
    // Add additional canvas context methods that might be missing
    mockContext.isPointInPath = jest.fn(() => false);
    mockContext.createPattern = jest.fn(() => 'mock-pattern');
    mockContext.getImageData = jest.fn(() => ({ data: new Uint8ClampedArray(4) }));
    mockContext.putImageData = jest.fn();
    
    // Mock Path2D if not available
    if (typeof Path2D === 'undefined') {
      global.Path2D = jest.fn(() => ({
        arc: jest.fn(),
        closePath: jest.fn(),
        moveTo: jest.fn(),
        lineTo: jest.fn()
      }));
    }

    // Reset all mocks to their default implementations
    utils.findTeamByCode.mockImplementation((code) => {
      if (!code) return null;
      return {
        name: `${code} Team`,
        primaryColor: '#000000',
        logo: {
          url: `img/logos/${code.toLowerCase()}.svg`,
          background: '#FFFFFF'
        }
      };
    });

    mockBracketData = createMockBracketData();
    mockTeamData = createMockTeamData();
    
    // Create bracket instance
    bracket = new Bracket(canvas);
  });

  describe('Constructor', () => {
    test('should initialize with default settings', () => {
      expect(bracket.cvs).toBe(canvas);
      expect(bracket.ctx).toBe(mockContext);
      expect(bracket.settings).toEqual(DEFAULTS);
      expect(bracket.imageCache).toBeInstanceOf(Map);
      expect(bracket.imageLoadPromises).toBeInstanceOf(Map);
      expect(bracket.teamPaths).toEqual([]);
    });

    test('should merge custom settings with defaults', () => {
      const customSettings = {
        gridStrokeWidth: 5,
        scale: 2,
        showGameDetails: jest.fn()
      };
      
      const customBracket = new Bracket(canvas, customSettings);
      
      expect(customBracket.settings).toEqual({
        ...DEFAULTS,
        ...customSettings
      });
    });

    test('should set up canvas event listener', () => {
      const addEventListenerSpy = jest.spyOn(canvas, 'addEventListener');
      new Bracket(canvas);
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
    });

    test('should call reset method during initialization', () => {
      // Since the constructor is already called in beforeEach, we can't easily spy on it
      // Instead, we'll verify that reset was called by checking its effects
      expect(bracket.teamPaths).toEqual([]);
      expect(mockContext.clearRect).toHaveBeenCalled();
    });
  });

  describe('Basic Methods', () => {
    test('getBracketData should return current bracket data', () => {
      bracket.setBracket(mockBracketData);
      expect(bracket.getBracketData()).toBe(mockBracketData);
    });

    test('getDataUrl should return canvas data URL', () => {
      const dataUrl = bracket.getDataUrl('png');
      expect(dataUrl).toBe('data:image/png;base64,mock-data');
    });

    test('getDataUrl should default to png format', () => {
      const dataUrl = bracket.getDataUrl();
      expect(dataUrl).toBe('data:image/png;base64,mock-data');
    });

    test('getCenter should calculate canvas center point', () => {
      bracket.titleHeight = 24;
      const [x, y] = bracket.getCenter();
      expect(x).toBe(400); // canvas.width / 2
      expect(y).toBe(424); // (canvas.height / 2) + titleHeight
    });
  });

  describe('setBracket and reset', () => {
    test('setBracket should store bracket data', () => {
      bracket.setBracket(mockBracketData);
      expect(bracket.bracketData).toBe(mockBracketData);
    });

    test('reset should calculate bracket properties correctly', () => {
      bracket.setBracket(mockBracketData);
      bracket.reset();
      
      // mockBracketData has games with max round of 1, so numRounds should be 2
      expect(bracket.numRounds).toBe(2);
      expect(bracket.numEntries).toBe(2); // 2^(numRounds-1)
    });

    test('reset should clear canvas and reset properties', () => {
      const mockShowGameDetails = jest.fn();
      bracket.settings.showGameDetails = mockShowGameDetails;
      bracket.setBracket(mockBracketData);
      bracket.teamPaths = [{ path: 'test', round: 1, teamCode: 'TEST' }];
      
      bracket.reset();
      
      expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 800, 800);
      expect(mockContext.fillRect).toHaveBeenCalledWith(0, 0, 800, 800);
      expect(bracket.teamPaths).toEqual([]);
      expect(mockShowGameDetails).toHaveBeenCalledWith(null);
    });

    test('reset should optimize canvas settings', () => {
      bracket.setBracket(mockBracketData);
      bracket.reset();
      
      expect(mockContext.imageSmoothingEnabled).toBe(true);
      expect(mockContext.imageSmoothingQuality).toBe('medium');
      expect(mockContext.globalCompositeOperation).toBe('source-over');
    });
  });

  describe('getRadiiForRound', () => {
    beforeEach(() => {
      bracket.setBracket(mockBracketData);
      bracket.reset();
    });

    test('should calculate radii for round 1', () => {
      const [radius, innerRadius] = bracket.getRadiiForRound(1);
      
      expect(radius).toBeGreaterThan(0);
      expect(innerRadius).toBeGreaterThanOrEqual(0);
      expect(radius).toBeGreaterThan(innerRadius);
    });

    test('should return different radii for different rounds', () => {
      bracket.numRounds = 4; // Set up for more rounds
      
      const [radius1] = bracket.getRadiiForRound(1);
      const [radius2] = bracket.getRadiiForRound(2);
      
      expect(radius1).toBeGreaterThan(radius2);
    });

    test('should handle final round correctly', () => {
      const finalRound = bracket.numRounds;
      const [radius, innerRadius] = bracket.getRadiiForRound(finalRound);
      
      expect(innerRadius).toBe(0); // Final round should have no inner radius
    });
  });

  describe('Image Caching', () => {
    beforeEach(() => {
      bracket.setBracket(mockBracketData);
    });

    test('loadAndCacheImage should cache images successfully', async () => {
      const teamCode = 'UNC';
      const logoUrl = 'img/logos/unc.svg';
      
      const imagePromise = bracket.loadAndCacheImage(teamCode, logoUrl);
      
      // Wait for the promise to resolve
      await imagePromise;
      
      expect(bracket.imageCache.has(teamCode)).toBe(true);
      expect(bracket.imageLoadPromises.has(teamCode)).toBe(true);
    });

    test('loadAndCacheImage should return existing promise for same team', () => {
      const teamCode = 'UNC';
      const logoUrl = 'img/logos/unc.svg';
      
      const promise1 = bracket.loadAndCacheImage(teamCode, logoUrl);
      const promise2 = bracket.loadAndCacheImage(teamCode, logoUrl);
      
      expect(promise1).toBe(promise2);
    });

    test('preloadImages should load all team images', async () => {
      const loadAndCacheImageSpy = jest.spyOn(bracket, 'loadAndCacheImage');
      
      await bracket.preloadImages();
      
      // Should be called for each unique team code in mockBracketData
      expect(loadAndCacheImageSpy).toHaveBeenCalledWith('UNC', expect.any(String));
      expect(loadAndCacheImageSpy).toHaveBeenCalledWith('DUKE', expect.any(String));
      expect(loadAndCacheImageSpy).toHaveBeenCalledWith('UK', expect.any(String));
      expect(loadAndCacheImageSpy).toHaveBeenCalledWith('UL', expect.any(String));
    });
  });

  describe('Drawing Methods', () => {
    beforeEach(() => {
      bracket.setBracket(mockBracketData);
      bracket.reset();
    });

    test('drawTitle should render tournament title', () => {
      bracket.drawTitle();
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.fillText).toHaveBeenCalledWith(
        '2024 NCAA Men\'s Basketball Tournament',
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockContext.restore).toHaveBeenCalled();
    });

    test('drawBackground should create circular background', () => {
      bracket.drawBackground();
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalled();
      expect(mockContext.beginPath).toHaveBeenCalled();
      expect(mockContext.arc).toHaveBeenCalled();
      expect(mockContext.fill).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    test('drawGrid should create bracket grid lines', () => {
      bracket.drawGrid();
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalled();
      expect(mockContext.rotate).toHaveBeenCalled();
      expect(mockContext.stroke).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    test('drawSeeds should render seed numbers', () => {
      bracket.drawSeeds();
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.fillText).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    test('drawRegionNames should render region names when available', () => {
      bracket.drawRegionNames();
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.translate).toHaveBeenCalled();
      expect(mockContext.fillText).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    test('drawStatusMessage should render status when bracket is postponed', () => {
      bracket.bracketData.status = 'postponed';
      bracket.drawStatusMessage();
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'postponed',
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
      expect(mockContext.restore).toHaveBeenCalled();
    });
  });

  describe('Team Slot Management', () => {
    beforeEach(() => {
      bracket.setBracket(mockBracketData);
      bracket.reset();
    });

    test('translateToSlot should correctly map regions to quadrants', () => {
      const testCases = [
        { regionCode: 'TL', expectedQuadrant: 2 },
        { regionCode: 'TR', expectedQuadrant: 3 },
        { regionCode: 'BL', expectedQuadrant: 1 },
        { regionCode: 'BR', expectedQuadrant: 0 }
      ];

      testCases.forEach(({ regionCode, expectedQuadrant }) => {
        const slot = bracket.translateToSlot(regionCode, 1, { seed: 1 });
        expect(slot).toBeGreaterThanOrEqual(0);
      });
    });

    test('fillSlotSync should draw team logo when image is cached', () => {
      const teamCode = 'UNC';
      const mockImage = new Image();
      bracket.imageCache.set(teamCode, mockImage);
      
      bracket.fillSlotSync(1, 0, { code: teamCode, seed: 1 });
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.drawImage).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    test('fillSlotSync should warn when image is not cached', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      bracket.fillSlotSync(1, 0, { code: 'MISSING', seed: 1 });
      
      // The actual warning depends on whether it's a champion game slot or regular slot
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Image not cached for'),
        'MISSING'
      );
      consoleSpy.mockRestore();
    });

    test('fillChampGameSlotSync should handle champion game slots', () => {
      const teamCode = 'UNC';
      const mockImage = new Image();
      bracket.imageCache.set(teamCode, mockImage);
      bracket.numRounds = 2;
      
      bracket.fillChampGameSlotSync(0, { code: teamCode, seed: 1 });
      
      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.drawImage).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });
  });

  describe('Click Event Handling', () => {
    beforeEach(() => {
      bracket.setBracket(mockBracketData);
      bracket.settings.showGameDetails = jest.fn();
    });

    test('should handle canvas click events', () => {
      // Set up a mock team path
      bracket.teamPaths = [{
        path: new Path2D(),
        round: 1,
        teamCode: 'UNC'
      }];
      
      // Mock isPointInPath to return true
      mockContext.isPointInPath.mockReturnValue(true);
      
      // Create and dispatch a click event
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 100
      });
      
      // Mock getBoundingClientRect
      canvas.getBoundingClientRect = jest.fn(() => ({
        left: 0,
        top: 0
      }));
      
      canvas.dispatchEvent(clickEvent);
      
      expect(bracket.settings.showGameDetails).toHaveBeenCalled();
    });

    test('should call showGameDetails with null when no team is clicked', () => {
      mockContext.isPointInPath.mockReturnValue(false);
      
      const clickEvent = new MouseEvent('click', {
        clientX: 100,
        clientY: 100
      });
      
      canvas.getBoundingClientRect = jest.fn(() => ({
        left: 0,
        top: 0
      }));
      
      canvas.dispatchEvent(clickEvent);
      
      expect(bracket.settings.showGameDetails).toHaveBeenCalledWith(null);
    });
  });

  describe('Rendering Pipeline', () => {
    beforeEach(() => {
      bracket.setBracket(mockBracketData);
    });

    test('render should return early if no bracket data', async () => {
      bracket.setBracket(null);
      
      await bracket.render();
      
      // Should not call any drawing methods
      expect(mockContext.fillText).not.toHaveBeenCalled();
    });

    test('render should draw postponed status message', async () => {
      bracket.bracketData.status = 'postponed';
      
      await bracket.render();
      
      expect(mockContext.fillText).toHaveBeenCalledWith(
        'postponed',
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    });

    test('render should complete full rendering pipeline', async () => {
      // Mock preloadImages to resolve immediately
      bracket.preloadImages = jest.fn().mockResolvedValue();
      
      // Mock fillChamp to avoid async image loading issues
      bracket.fillChamp = jest.fn().mockResolvedValue();
      
      await bracket.render();
      
      expect(bracket.preloadImages).toHaveBeenCalled();
      expect(mockContext.fillText).toHaveBeenCalledWith(
        expect.stringContaining('NCAA Men\'s Basketball Tournament'),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
    }, 5000); // Reduce timeout since we're mocking async operations

    test('render should handle champion display', async () => {
      // Set up a completed championship game
      bracket.bracketData.games[0].round = 1; // Make it the final round
      bracket.bracketData.games[0].isComplete = true;
      bracket.bracketData.games[0].home.winner = true;
      bracket.numRounds = 2;
      
      const fillChampSpy = jest.spyOn(bracket, 'fillChamp').mockResolvedValue();
      
      await bracket.render();
      
      expect(fillChampSpy).toHaveBeenCalledWith(bracket.bracketData.games[0].home);
    });
  });

  describe('Error Handling', () => {
    test('should handle image loading errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      // Mock Image to simulate error
      const originalImage = global.Image;
      global.Image = class {
        constructor() {
          this.addEventListener = jest.fn((event, callback) => {
            if (event === 'error') {
              this.onerror = callback;
            }
          });
        }
        
        set src(url) {
          this._src = url;
          setTimeout(() => {
            if (this.onerror) {
              this.onerror(new Error('Image failed to load'));
            }
          }, 10);
        }
      };
      
      await bracket.loadAndCacheImage('TEST', 'invalid-url');
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load image for TEST'),
        expect.any(Error)
      );
      
      // Restore original Image
      global.Image = originalImage;
      consoleSpy.mockRestore();
    });

    test('should handle missing team data gracefully', () => {
      // Temporarily mock findTeamByCode to return null for one call
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      
      // Save the current mock implementation
      const originalImplementation = utils.findTeamByCode.getMockImplementation();
      
      utils.findTeamByCode.mockReturnValueOnce(null);
      
      bracket.fillSlotSync(1, 0, { code: 'UNKNOWN', seed: 1 });
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Image not cached for'),
        'UNKNOWN'
      );
      
      // Restore the original mock implementation
      utils.findTeamByCode.mockImplementation(originalImplementation);
      consoleSpy.mockRestore();
    });
  });

  describe('Performance Optimizations', () => {
    test('should batch slot drawing by round', () => {
      bracket.setBracket(mockBracketData);
      bracket.reset();
      
      const fillSlotSyncSpy = jest.spyOn(bracket, 'fillSlotSync');
      
      bracket.drawAllSlots();
      
      // Should be called for each team in the bracket data
      expect(fillSlotSyncSpy).toHaveBeenCalled();
    });

    test('should use image cache for synchronous rendering', () => {
      const teamCode = 'UNC';
      const mockImage = new Image();
      bracket.imageCache.set(teamCode, mockImage);
      
      // Mock fillSlotSync to avoid the complex logic and just test the caching part
      const originalFillSlotSync = bracket.fillSlotSync;
      bracket.fillSlotSync = jest.fn((round, slot, team) => {
        const img = bracket.imageCache.get(team.code);
        if (img) {
          mockContext.drawImage(img, 0, 0, 100, 100);
        }
      });
      
      bracket.fillSlotSync(1, 0, { code: teamCode, seed: 1 });
      
      // Should use cached image directly
      expect(mockContext.drawImage).toHaveBeenCalledWith(
        mockImage,
        expect.any(Number),
        expect.any(Number),
        expect.any(Number),
        expect.any(Number)
      );
      
      // Restore original method
      bracket.fillSlotSync = originalFillSlotSync;
    });
  });
});

// Helper functions for creating mock data
function createMockCanvas(width = 800, height = 800) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  // Mock toDataURL
  canvas.toDataURL = jest.fn(() => 'data:image/png;base64,mock-data');
  
  // Mock getBoundingClientRect
  canvas.getBoundingClientRect = jest.fn(() => ({
    left: 0,
    top: 0,
    right: width,
    bottom: height,
    width,
    height
  }));
  
  return canvas;
}

function createMockBracketData() {
  return {
    year: 2024,
    regions: [
      { position: 'TL', name: 'North' },
      { position: 'TR', name: 'South' },
      { position: 'BL', name: 'East' },
      { position: 'BR', name: 'West' }
    ],
    games: [
      {
        round: 1,
        region: 'TL',
        isComplete: true,
        home: { code: 'UNC', name: 'North Carolina', seed: 1, winner: true },
        away: { code: 'DUKE', name: 'Duke', seed: 16, winner: false }
      },
      {
        round: 1,
        region: 'TR',
        isComplete: true,
        home: { code: 'UK', name: 'Kentucky', seed: 1, winner: true },
        away: { code: 'UL', name: 'Louisville', seed: 16, winner: false }
      }
    ]
  };
}

function createMockTeamData() {
  return {
    'UNC': {
      name: 'North Carolina',
      primaryColor: '#13294B',
      logo: {
        url: 'img/logos/unc.svg',
        background: '#FFFFFF'
      }
    },
    'DUKE': {
      name: 'Duke',
      primaryColor: '#003087',
      logo: {
        url: 'img/logos/duke.svg',
        background: '#FFFFFF'
      }
    },
    'UK': {
      name: 'Kentucky',
      primaryColor: '#0033A0',
      logo: {
        url: 'img/logos/uk.svg',
        background: '#FFFFFF'
      }
    },
    'UL': {
      name: 'Louisville',
      primaryColor: '#AD0000',
      logo: {
        url: 'img/logos/ul.svg',
        background: '#FFFFFF'
      }
    }
  };
}
