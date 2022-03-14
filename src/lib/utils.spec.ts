import {
  getTournamentStart,
  getSelectionSunday,
  scaleDims,
  findTeamRegion,
  findTeamByCode
} from "./utils";
import { Game, RegionPosition } from "./types/Bracket";
import mockBracket from "../../seasons/bracket-2015.json";

describe("Utils", () => {
  describe("scaleDims", () => {
    it("scales up", () => {
      const origW = 100;
      const origH = 100;
      const scaleW = 200;
      const scaleH = 200;
      expect(scaleDims(origW, origH, scaleW, scaleH)).toEqual([scaleW, scaleH]);
    });

    it("scales down", () => {
      const origW = 100;
      const origH = 100;
      const scaleW = 50;
      const scaleH = 50;
      expect(scaleDims(origW, origH, scaleW, scaleH)).toEqual([scaleW, scaleH]);
    });
  });

  describe("getTournamentStart", () => {
    it("gets a date in March", () => {
      [2010, 2023, 2035].forEach((year) => {
        const startDate = getTournamentStart(year);
        expect(startDate).toBeDefined();
        expect(startDate.getMonth()).toEqual(2);
      });
    });
  });

  describe("getSelectionSunday", () => {
    it("gets selection  March", () => {
      [2010, 2023, 2035].forEach((year) => {
        const bidDate = getSelectionSunday(year);
        expect(bidDate).toBeDefined();
        expect(bidDate.getMonth()).toEqual(2);
      });
    });
  });

  describe("findTeamRegion", () => {
    let mockGames: Game[];

    beforeEach(() => {
      mockGames = JSON.parse(JSON.stringify(mockBracket.games));
    });

    it("returns a region position", () => {
      const region = findTeamRegion(mockGames, "north-carolina-st");
      expect(region).toBeDefined();
      expect(region).toEqual(RegionPosition.BR);
    });

    it("returns undefined when cannot find a team", () => {
      const region = findTeamRegion(mockGames, "penn-st");
      expect(region).toBeUndefined();
    });
  });

  describe("findTeamByCode", () => {
    it("finds an existing team", () => {
      const team = findTeamByCode("pittsburgh");
      expect(team).toBeDefined();
      expect(team.name).toEqual("Pittsburgh");
    });

    it("finds a team by alternate name", () => {
      const team = findTeamByCode("pitt");
      expect(team).toBeDefined();
      expect(team.name).toEqual("Pittsburgh");
    });

    it("returns undefined for an unknown team", () => {
      const team = findTeamByCode("podunks");
      expect(team).toBeUndefined();
    });
  });
});
