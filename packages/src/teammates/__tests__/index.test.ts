import { test, describe, expect, beforeEach, afterEach } from "bun:test";
import { TeammateManager, generateTeammateId } from "../index.js";
import { rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

describe("TeammateManager", () => {
  let manager: TeammateManager;
  let testStoragePath: string;

  beforeEach(() => {
    testStoragePath = join(tmpdir(), `teammates-test-${Date.now()}`);
    manager = new TeammateManager(testStoragePath);
  });

  afterEach(() => {
    if (existsSync(testStoragePath)) {
      rmSync(testStoragePath, { recursive: true, force: true });
    }
  });

  test("createTeam - creates a team", () => {
    const teamName = `team-${Date.now()}`;
    const team = manager.createTeam({
      name: teamName,
      description: "Test team",
      teammates: [],
    });

    expect(team.name).toBe(teamName);
    expect(team.status).toBe("active");
    expect(team.description).toBe("Test team");
  });

  test("getTeam - returns team by name", () => {
    const teamName = `team-${Date.now()}`;
    manager.createTeam({ name: teamName, description: "", teammates: [] });

    const team = manager.getTeam(teamName);
    expect(team?.name).toBe(teamName);
  });

  test("listTeams - returns all teams", () => {
    const team1 = `team-${Date.now()}-1`;
    const team2 = `team-${Date.now()}-2`;

    manager.createTeam({ name: team1, description: "", teammates: [] });
    manager.createTeam({ name: team2, description: "", teammates: [] });

    const teams = manager.listTeams();
    expect(teams.length).toBe(2);
    expect(teams.map((t) => t.name)).toContain(team1);
    expect(teams.map((t) => t.name)).toContain(team2);
  });

  test("deleteTeam - removes team", () => {
    const teamName = `team-${Date.now()}`;
    manager.createTeam({ name: teamName, description: "", teammates: [] });

    manager.deleteTeam(teamName);
    expect(manager.getTeam(teamName)).toBeUndefined();
  });

  test("addTeammate - adds teammate to team", () => {
    const teamName = `team-${Date.now()}`;
    manager.createTeam({ name: teamName, description: "", teammates: [] });

    const teammateId = generateTeammateId();
    const result = manager.addTeammate(teamName, {
      teammateId,
      name: "agent-1",
      role: "worker",
      teamName,
      status: "pending",
    });

    expect(result).toBe(true);
    const team = manager.getTeam(teamName);
    expect(team?.teammates.length).toBe(1);
  });

  test("removeTeammate - removes teammate from team", () => {
    const teamName = `team-${Date.now()}`;
    const teammateId = generateTeammateId();

    manager.createTeam({
      name: teamName,
      description: "",
      teammates: [{ teammateId, name: "agent-1", role: "worker", teamName, status: "pending" }],
    });

    const result = manager.removeTeammate(teamName, teammateId);
    expect(result).toBe(true);
    expect(manager.getTeammate(teammateId)).toBeUndefined();
  });

  test("getTeammate - returns teammate by id", () => {
    const teamName = `team-${Date.now()}`;
    const teammateId = generateTeammateId();

    manager.createTeam({
      name: teamName,
      description: "",
      teammates: [{ teammateId, name: "agent-1", role: "worker", teamName, status: "pending" }],
    });

    const teammate = manager.getTeammate(teammateId);
    expect(teammate?.name).toBe("agent-1");
  });
});
