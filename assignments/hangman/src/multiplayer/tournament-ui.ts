/**
 * Tournament Bracket UI - Three.js visual bracket display
 * Shows tournament bracket with player names, match results, and current round highlighting
 */

import * as THREE from 'three';
import type {
  Tournament,
  TournamentMatch,
  TournamentPlayer,
  TournamentSize,
} from '../../server/tournament';

export interface TournamentUIConfig {
  position: { x: number; y: number; z: number };
  scale: number;
}

const DEFAULT_CONFIG: TournamentUIConfig = {
  position: { x: 0, y: 0, z: 0 },
  scale: 1,
};

// Colors for bracket elements
const COLORS = {
  background: 0x1a1a2e,
  border: 0x333355,
  pendingMatch: 0x2a2a4e,
  playingMatch: 0x4ecdc4,
  completedMatch: 0x16213e,
  currentRoundHighlight: 0x4ecdc4,
  winnerHighlight: 0x44a08d,
  loserText: 0x888888,
  connectionLine: 0x444466,
  textDefault: 0xffffff,
  championGold: 0xffd700,
};

/**
 * Manages the 3D tournament bracket visualization
 */
export class TournamentUI {
  private group: THREE.Group;
  private scene: THREE.Scene;
  private config: TournamentUIConfig;
  private matchSlots: Map<string, MatchSlot> = new Map();
  private connectionLines: THREE.Line[] = [];
  private currentTournament: Tournament | null = null;
  private championDisplay: ChampionDisplay | null = null;
  private roundLabels: THREE.Sprite[] = [];
  private animationTime: number = 0;

  constructor(scene: THREE.Scene, config: Partial<TournamentUIConfig> = {}) {
    this.scene = scene;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.group = new THREE.Group();
    this.group.name = 'tournament-bracket';
    this.group.position.set(
      this.config.position.x,
      this.config.position.y,
      this.config.position.z
    );
    this.group.scale.setScalar(this.config.scale);
    scene.add(this.group);
  }

  /**
   * Update the bracket display with tournament data
   */
  updateTournament(tournament: Tournament): void {
    this.currentTournament = tournament;
    this.clearBracket();

    const { size, bracket, currentRound, state } = tournament;
    const numRounds = bracket.rounds.length;

    // Calculate layout dimensions
    const slotWidth = 3;
    const slotHeight = 1.2;
    const roundSpacing = 4;
    const matchSpacing = 1.5;

    // Create round labels
    this.createRoundLabels(numRounds, slotWidth, roundSpacing);

    // Create match slots for each round
    bracket.rounds.forEach((round, roundIndex) => {
      const roundNumber = roundIndex + 1;
      const isCurrentRound = roundNumber === currentRound && state === 'in_progress';
      const matchesInRound = round.length;

      // Calculate vertical spacing based on round progression
      const verticalSpread = Math.pow(2, roundIndex) * (slotHeight + matchSpacing);

      round.forEach((match, matchIndex) => {
        const x = roundIndex * (slotWidth + roundSpacing);
        const y = (matchesInRound - 1 - matchIndex * 2) * verticalSpread / 2;

        const slot = new MatchSlot(
          this.group,
          match,
          roundNumber,
          isCurrentRound,
          tournament.players
        );

        slot.setPosition(x, y, 0);
        this.matchSlots.set(match.matchId, slot);
      });
    });

    // Create connection lines between rounds
    this.createConnectionLines(bracket, slotWidth, roundSpacing, slotHeight, matchSpacing);

    // Create champion display if tournament is complete
    if (state === 'completed' && bracket.champion) {
      const championPlayer = tournament.players.get(bracket.champion);
      if (championPlayer) {
        const championX = numRounds * (slotWidth + roundSpacing);
        this.championDisplay = new ChampionDisplay(this.group, championPlayer);
        this.championDisplay.setPosition(championX, 0, 0);
      }
    }
  }

  /**
   * Create labels for each round
   */
  private createRoundLabels(numRounds: number, slotWidth: number, roundSpacing: number): void {
    const roundNames = this.getRoundNames(numRounds);

    for (let i = 0; i < numRounds; i++) {
      const x = i * (slotWidth + roundSpacing) + slotWidth / 2;
      const label = this.createTextSprite(roundNames[i], 0.4, COLORS.textDefault);
      label.position.set(x, 4, 0.1);
      this.group.add(label);
      this.roundLabels.push(label);
    }
  }

  /**
   * Get round names based on tournament size
   */
  private getRoundNames(numRounds: number): string[] {
    if (numRounds === 2) return ['Semifinals', 'Final'];
    if (numRounds === 3) return ['Quarterfinals', 'Semifinals', 'Final'];
    if (numRounds === 4) return ['Round of 16', 'Quarterfinals', 'Semifinals', 'Final'];
    return Array.from({ length: numRounds }, (_, i) => `Round ${i + 1}`);
  }

  /**
   * Create connection lines between matches
   */
  private createConnectionLines(
    bracket: Tournament['bracket'],
    slotWidth: number,
    roundSpacing: number,
    slotHeight: number,
    matchSpacing: number
  ): void {
    const lineMaterial = new THREE.LineBasicMaterial({
      color: COLORS.connectionLine,
      linewidth: 2,
    });

    bracket.rounds.forEach((round, roundIndex) => {
      if (roundIndex === 0) return; // No connections from first round

      const prevRound = bracket.rounds[roundIndex - 1];
      const currentX = roundIndex * (slotWidth + roundSpacing);
      const prevX = (roundIndex - 1) * (slotWidth + roundSpacing);
      const midX = prevX + slotWidth + roundSpacing / 2;

      round.forEach((match, matchIndex) => {
        // Two matches feed into one
        const prevMatch1Index = matchIndex * 2;
        const prevMatch2Index = matchIndex * 2 + 1;

        const verticalSpreadPrev = Math.pow(2, roundIndex - 1) * (slotHeight + matchSpacing);
        const verticalSpreadCurrent = Math.pow(2, roundIndex) * (slotHeight + matchSpacing);

        const prevMatches = prevRound.length;
        const y1 = (prevMatches - 1 - prevMatch1Index * 2) * verticalSpreadPrev / 2;
        const y2 = (prevMatches - 1 - prevMatch2Index * 2) * verticalSpreadPrev / 2;
        const yCurrent = (round.length - 1 - matchIndex * 2) * verticalSpreadCurrent / 2;

        // Create V-shaped connection
        const points: THREE.Vector3[] = [
          new THREE.Vector3(prevX + slotWidth, y1, 0),
          new THREE.Vector3(midX, yCurrent, 0),
          new THREE.Vector3(prevX + slotWidth, y2, 0),
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, lineMaterial);
        this.group.add(line);
        this.connectionLines.push(line);
      });
    });

    // Connect to champion if complete
    if (bracket.champion && bracket.rounds.length > 0) {
      const finalRound = bracket.rounds[bracket.rounds.length - 1];
      if (finalRound.length === 1) {
        const finalMatch = finalRound[0];
        const finalX = (bracket.rounds.length - 1) * (slotWidth + roundSpacing);
        const championX = bracket.rounds.length * (slotWidth + roundSpacing);

        const points: THREE.Vector3[] = [
          new THREE.Vector3(finalX + slotWidth, 0, 0),
          new THREE.Vector3(championX - 0.5, 0, 0),
        ];

        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({
          color: COLORS.championGold,
          linewidth: 3,
        }));
        this.group.add(line);
        this.connectionLines.push(line);
      }
    }
  }

  /**
   * Create a text sprite
   */
  private createTextSprite(text: string, scale: number, color: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    context.fillStyle = 'transparent';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.font = 'bold 24px Arial, sans-serif';
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale * 4, scale, 1);

    return sprite;
  }

  /**
   * Clear the current bracket display
   */
  clearBracket(): void {
    this.matchSlots.forEach(slot => slot.dispose());
    this.matchSlots.clear();

    this.connectionLines.forEach(line => {
      this.group.remove(line);
      line.geometry.dispose();
      (line.material as THREE.Material).dispose();
    });
    this.connectionLines = [];

    this.roundLabels.forEach(label => {
      this.group.remove(label);
      label.geometry.dispose();
      (label.material as THREE.Material).dispose();
    });
    this.roundLabels = [];

    if (this.championDisplay) {
      this.championDisplay.dispose();
      this.championDisplay = null;
    }
  }

  /**
   * Update animations
   */
  update(deltaTime: number): void {
    this.animationTime += deltaTime;

    // Update match slots
    this.matchSlots.forEach(slot => slot.update(deltaTime, this.animationTime));

    // Update champion display
    if (this.championDisplay) {
      this.championDisplay.update(deltaTime, this.animationTime);
    }
  }

  /**
   * Show/hide the bracket
   */
  setVisible(visible: boolean): void {
    this.group.visible = visible;
  }

  /**
   * Dispose of all resources
   */
  dispose(): void {
    this.clearBracket();
    this.scene.remove(this.group);
  }
}

/**
 * Individual match slot in the bracket
 */
class MatchSlot {
  private container: THREE.Group;
  private parent: THREE.Group;
  private match: TournamentMatch;
  private roundNumber: number;
  private isCurrentRound: boolean;
  private players: Map<string, TournamentPlayer>;
  private backgroundMesh: THREE.Mesh;
  private borderMesh: THREE.Mesh;
  private playerLabels: THREE.Sprite[] = [];
  private scoreLabels: THREE.Sprite[] = [];
  private glowMesh: THREE.Mesh | null = null;
  private winnerGlow: THREE.Mesh | null = null;

  constructor(
    parent: THREE.Group,
    match: TournamentMatch,
    roundNumber: number,
    isCurrentRound: boolean,
    players: Map<string, TournamentPlayer>
  ) {
    this.parent = parent;
    this.match = match;
    this.roundNumber = roundNumber;
    this.isCurrentRound = isCurrentRound;
    this.players = players;

    this.container = new THREE.Group();
    this.container.name = `match-${match.matchId}`;
    parent.add(this.container);

    // Create background box
    const width = 3;
    const height = 1.2;
    const depth = 0.1;

    let bgColor = COLORS.pendingMatch;
    if (match.state === 'playing') {
      bgColor = COLORS.playingMatch;
    } else if (match.state === 'completed') {
      bgColor = COLORS.completedMatch;
    }

    const bgGeometry = new THREE.BoxGeometry(width, height, depth);
    const bgMaterial = new THREE.MeshStandardMaterial({
      color: bgColor,
      roughness: 0.5,
      metalness: 0.1,
    });
    this.backgroundMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    this.backgroundMesh.position.z = -0.05;
    this.container.add(this.backgroundMesh);

    // Create border
    const borderGeometry = new THREE.EdgesGeometry(bgGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({
      color: isCurrentRound ? COLORS.currentRoundHighlight : COLORS.border,
      linewidth: isCurrentRound ? 3 : 1,
    });
    this.borderMesh = new THREE.Mesh(
      new THREE.BoxGeometry(width + 0.05, height + 0.05, depth + 0.02),
      new THREE.MeshBasicMaterial({
        color: isCurrentRound ? COLORS.currentRoundHighlight : COLORS.border,
        transparent: true,
        opacity: 0.3,
      })
    );
    this.borderMesh.position.z = -0.06;
    this.container.add(this.borderMesh);

    // Create glow for current round
    if (isCurrentRound && match.state !== 'completed') {
      const glowGeometry = new THREE.BoxGeometry(width + 0.2, height + 0.2, 0.02);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: COLORS.currentRoundHighlight,
        transparent: true,
        opacity: 0.2,
      });
      this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
      this.glowMesh.position.z = -0.1;
      this.container.add(this.glowMesh);
    }

    // Create player labels
    this.createPlayerLabels();
  }

  private createPlayerLabels(): void {
    const width = 3;

    // Player 1
    const player1Name = this.match.player1?.name || 'TBD';
    const player1Color = this.match.winnerId === this.match.player1?.id
      ? COLORS.winnerHighlight
      : this.match.loserId === this.match.player1?.id
        ? COLORS.loserText
        : COLORS.textDefault;

    const label1 = this.createTextSprite(
      player1Name,
      { width: width - 0.8, height: 0.35 },
      player1Color,
      16
    );
    label1.position.set(-0.6, 0.3, 0.05);
    this.container.add(label1);
    this.playerLabels.push(label1);

    // Player 2
    const player2Name = this.match.player2?.name || 'TBD';
    const player2Color = this.match.winnerId === this.match.player2?.id
      ? COLORS.winnerHighlight
      : this.match.loserId === this.match.player2?.id
        ? COLORS.loserText
        : COLORS.textDefault;

    const label2 = this.createTextSprite(
      player2Name,
      { width: width - 0.8, height: 0.35 },
      player2Color,
      16
    );
    label2.position.set(-0.6, -0.3, 0.05);
    this.container.add(label2);
    this.playerLabels.push(label2);

    // Score display for completed matches
    if (this.match.state === 'completed') {
      const score1Label = this.createTextSprite(
        this.match.score1.toString(),
        { width: 0.4, height: 0.35 },
        this.match.winnerId === this.match.player1?.id ? COLORS.winnerHighlight : COLORS.loserText,
        18
      );
      score1Label.position.set(1.1, 0.3, 0.05);
      this.container.add(score1Label);
      this.scoreLabels.push(score1Label);

      const score2Label = this.createTextSprite(
        this.match.score2.toString(),
        { width: 0.4, height: 0.35 },
        this.match.winnerId === this.match.player2?.id ? COLORS.winnerHighlight : COLORS.loserText,
        18
      );
      score2Label.position.set(1.1, -0.3, 0.05);
      this.container.add(score2Label);
      this.scoreLabels.push(score2Label);
    }

    // VS divider line
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.4, 0, 0.02),
      new THREE.Vector3(1.4, 0, 0.02),
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: COLORS.border,
      transparent: true,
      opacity: 0.5,
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.container.add(line);
  }

  private createTextSprite(
    text: string,
    size: { width: number; height: number },
    color: number,
    fontSize: number
  ): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    context.font = `bold ${fontSize}px Arial, sans-serif`;
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.textAlign = 'left';
    context.textBaseline = 'middle';
    context.fillText(text, 10, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(size.width, size.height, 1);

    return sprite;
  }

  setPosition(x: number, y: number, z: number): void {
    this.container.position.set(x, y, z);
  }

  update(deltaTime: number, animationTime: number): void {
    // Animate glow for current round
    if (this.glowMesh && this.isCurrentRound) {
      const material = this.glowMesh.material as THREE.MeshBasicMaterial;
      material.opacity = 0.15 + Math.sin(animationTime * 3) * 0.1;
    }
  }

  dispose(): void {
    // Dispose background
    this.backgroundMesh.geometry.dispose();
    (this.backgroundMesh.material as THREE.Material).dispose();

    // Dispose border
    this.borderMesh.geometry.dispose();
    (this.borderMesh.material as THREE.Material).dispose();

    // Dispose glow
    if (this.glowMesh) {
      this.glowMesh.geometry.dispose();
      (this.glowMesh.material as THREE.Material).dispose();
    }

    // Dispose labels
    this.playerLabels.forEach(label => {
      label.geometry.dispose();
      (label.material as THREE.Material).dispose();
    });

    this.scoreLabels.forEach(label => {
      label.geometry.dispose();
      (label.material as THREE.Material).dispose();
    });

    this.parent.remove(this.container);
  }
}

/**
 * Champion display for completed tournaments
 */
class ChampionDisplay {
  private container: THREE.Group;
  private parent: THREE.Group;
  private champion: TournamentPlayer;
  private crownMesh: THREE.Mesh;
  private glowMesh: THREE.Mesh;
  private nameSprite: THREE.Sprite;

  constructor(parent: THREE.Group, champion: TournamentPlayer) {
    this.parent = parent;
    this.champion = champion;
    this.container = new THREE.Group();
    this.container.name = 'champion-display';
    parent.add(this.container);

    // Create trophy/crown shape
    const crownGeometry = new THREE.ConeGeometry(0.4, 0.6, 5);
    const crownMaterial = new THREE.MeshStandardMaterial({
      color: COLORS.championGold,
      roughness: 0.2,
      metalness: 0.8,
      emissive: COLORS.championGold,
      emissiveIntensity: 0.3,
    });
    this.crownMesh = new THREE.Mesh(crownGeometry, crownMaterial);
    this.crownMesh.rotation.x = Math.PI;
    this.crownMesh.position.y = 0.8;
    this.container.add(this.crownMesh);

    // Create glow
    const glowGeometry = new THREE.SphereGeometry(0.8, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: COLORS.championGold,
      transparent: true,
      opacity: 0.15,
    });
    this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    this.container.add(this.glowMesh);

    // Create champion name label
    this.nameSprite = this.createTextSprite(`🏆 ${champion.name}`, 0.5);
    this.nameSprite.position.y = -0.3;
    this.container.add(this.nameSprite);

    // "CHAMPION" label
    const championLabel = this.createTextSprite('CHAMPION', 0.35);
    championLabel.position.y = -0.7;
    this.container.add(championLabel);
  }

  private createTextSprite(text: string, scale: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;
    canvas.width = 256;
    canvas.height = 64;

    context.font = 'bold 24px Arial, sans-serif';
    context.fillStyle = '#ffd700';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(scale * 4, scale, 1);

    return sprite;
  }

  setPosition(x: number, y: number, z: number): void {
    this.container.position.set(x, y, z);
  }

  update(deltaTime: number, animationTime: number): void {
    // Rotate crown
    this.crownMesh.rotation.y += deltaTime * 0.5;

    // Pulse glow
    const material = this.glowMesh.material as THREE.MeshBasicMaterial;
    material.opacity = 0.1 + Math.sin(animationTime * 2) * 0.1;

    // Float animation
    this.crownMesh.position.y = 0.8 + Math.sin(animationTime * 1.5) * 0.1;
  }

  dispose(): void {
    this.crownMesh.geometry.dispose();
    (this.crownMesh.material as THREE.Material).dispose();
    this.glowMesh.geometry.dispose();
    (this.glowMesh.material as THREE.Material).dispose();
    this.nameSprite.geometry.dispose();
    (this.nameSprite.material as THREE.Material).dispose();

    this.parent.remove(this.container);
  }
}
