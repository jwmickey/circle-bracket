import { scaleDims } from './utils';

describe('Utils', () => {
  describe('scaleDims', () => {
    it('scales up', () => {
      const origW = 100;
      const origH = 100;
      const scaleW = 200;
      const scaleH = 200;
      expect(scaleDims(origW, origH, scaleW, scaleH)).toEqual([scaleW, scaleH]);
    })

    it('scales down', () => {
      const origW = 100;
      const origH = 100;
      const scaleW = 50;
      const scaleH = 50;
      expect(scaleDims(origW, origH, scaleW, scaleH)).toEqual([scaleW, scaleH]);
    })
  });
})
