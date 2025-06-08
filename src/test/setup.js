import 'jest-canvas-mock';
import '@testing-library/jest-dom';

// Override HTMLCanvasElement to provide a more permissive drawImage mock
const originalGetContext = HTMLCanvasElement.prototype.getContext;
HTMLCanvasElement.prototype.getContext = function(contextType, contextAttributes) {
  const context = originalGetContext.call(this, contextType, contextAttributes);
  
  if (contextType === '2d' && context) {
    // Create a more permissive drawImage mock
    context.drawImage = jest.fn(() => {
      // Always succeed regardless of image type
      return undefined;
    });
  }
  
  return context;
};

// Mock window.URL methods
Object.defineProperty(window.URL, 'createObjectURL', {
  writable: true,
  value: jest.fn(() => 'mocked-blob-url'),
});

Object.defineProperty(window.URL, 'revokeObjectURL', {
  writable: true,
  value: jest.fn(),
});

// Mock webpack require for images
jest.mock('*.png', () => 'test-file-stub', { virtual: true });
jest.mock('*.jpg', () => 'test-file-stub', { virtual: true });
jest.mock('*.jpeg', () => 'test-file-stub', { virtual: true });
jest.mock('*.gif', () => 'test-file-stub', { virtual: true });
jest.mock('*.svg', () => '<svg></svg>', { virtual: true });

// Global test utilities
global.createMockCanvas = (width = 800, height = 800) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  // Override toDataURL to return a consistent mock value
  canvas.toDataURL = jest.fn(() => 'data:image/png;base64,mock-data');
  
  return canvas;
};

global.createMockBracketData = () => ({
  year: 2024,
  regions: [
    { position: 'TL', name: 'West' },
    { position: 'TR', name: 'East' },
    { position: 'BL', name: 'South' },
    { position: 'BR', name: 'Midwest' }
  ],
  games: [
    {
      round: 1,
      region: 'TL',
      home: { code: 'UNC', seed: 1, winner: true },
      away: { code: 'DUKE', seed: 16, winner: false },
      isComplete: true
    },
    {
      round: 1,
      region: 'TR',
      home: { code: 'UK', seed: 2, winner: false },
      away: { code: 'UL', seed: 15, winner: true },
      isComplete: true
    }
  ]
});

global.createMockTeamData = () => ({
  UNC: {
    name: 'North Carolina',
    primaryColor: '#7BAFD4',
    logo: {
      url: 'img/logos/unc.svg',
      background: '#FFFFFF'
    }
  },
  DUKE: {
    name: 'Duke',
    primaryColor: '#003087',
    logo: {
      url: 'img/logos/duke.svg',
      background: '#FFFFFF'
    }
  }
});
