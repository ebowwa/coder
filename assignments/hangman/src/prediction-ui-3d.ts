/**
 * 3D prediction UI using Three.js - replaces DOM overlay
 * Returns Promise<Prediction> that resolves to 'in' or 'not-in'
 */

import * as THREE from 'three';
import type { Prediction } from './types';
import { PREDICTION_UI_CONFIG } from './config';

export class PredictionUI3D {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private group: THREE.Group;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private selectedLetter: string | null = null;
  private resolvePromise: ((prediction: Prediction) => void) | null = null;
  private isVisible: boolean = false;
  private inButton: THREE.Mesh | null = null;
  private notInButton: THREE.Mesh | null = null;
  private hoveredButton: THREE.Mesh | null = null;
  private letterMesh: THREE.Mesh | null = null;
  private questionText: THREE.Mesh | null = null;
  private toastMesh: THREE.Mesh | null = null;
  private toastTimeout: number | null = null;
  private boundOnMouseMove: (e: MouseEvent) => void;
  private boundOnClick: (e: MouseEvent) => void;
  private boundOnTouchStart: (e: TouchEvent) => void;
  private boundOnTouchEnd: (e: TouchEvent) => void;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.boundOnMouseMove = this.onMouseMove.bind(this);
    this.boundOnClick = this.onClick.bind(this);
    this.boundOnTouchStart = this.onTouchStart.bind(this);
    this.boundOnTouchEnd = this.onTouchEnd.bind(this);
    
    this.createUI();
    this.setupMouseEvents();
    
    // Initially hidden
    this.group.visible = false;
    this.scene.add(this.group);
  }

  private createUI(): void {
    // Create background panel
    const panelGeometry = new THREE.PlaneGeometry(
      PREDICTION_UI_CONFIG.panel.width,
      PREDICTION_UI_CONFIG.panel.height
    );
    const panelMaterial = new THREE.MeshStandardMaterial({
      color: PREDICTION_UI_CONFIG.panel.backgroundColor,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide,
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.z = PREDICTION_UI_CONFIG.panel.positionZ;
    this.group.add(panel);

    // Create question text
    this.questionText = this.createTextMesh(
      'Do you think the',
      PREDICTION_UI_CONFIG.text.questionFontSize,
      PREDICTION_UI_CONFIG.text.color
    );
    if (this.questionText) {
      this.questionText.position.set(0, PREDICTION_UI_CONFIG.layout.questionY, PREDICTION_UI_CONFIG.layout.textZ);
      this.group.add(this.questionText);
    }

    // Create letter display (will be updated with actual letter)
    this.letterMesh = this.createTextMesh(
      'A',
      PREDICTION_UI_CONFIG.text.letterFontSize,
      PREDICTION_UI_CONFIG.text.letterColor
    );
    if (this.letterMesh) {
      this.letterMesh.position.set(0, PREDICTION_UI_CONFIG.layout.letterY, PREDICTION_UI_CONFIG.layout.textZ);
      this.group.add(this.letterMesh);
    }

    // Create "is in the word?" text
    const suffixText = this.createTextMesh(
      'is in the word?',
      PREDICTION_UI_CONFIG.text.questionFontSize,
      PREDICTION_UI_CONFIG.text.color
    );
    if (suffixText) {
      suffixText.position.set(0, PREDICTION_UI_CONFIG.layout.suffixY, PREDICTION_UI_CONFIG.layout.textZ);
      this.group.add(suffixText);
    }

    // Create IN button
    this.inButton = this.createButton(
      'IN',
      PREDICTION_UI_CONFIG.button.inColor,
      PREDICTION_UI_CONFIG.layout.inButtonX
    );
    if (this.inButton) {
      this.inButton.userData.type = 'in';
      this.group.add(this.inButton);
    }

    // Create NOT IN button
    this.notInButton = this.createButton(
      'NOT IN',
      PREDICTION_UI_CONFIG.button.notInColor,
      PREDICTION_UI_CONFIG.layout.notInButtonX
    );
    if (this.notInButton) {
      this.notInButton.userData.type = 'not-in';
      this.group.add(this.notInButton);
    }
  }

  private createTextMesh(text: string, fontSize: number, color: number): THREE.Mesh | null {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = PREDICTION_UI_CONFIG.canvas.width;
    canvas.height = PREDICTION_UI_CONFIG.canvas.height;

    ctx.fillStyle = PREDICTION_UI_CONFIG.canvas.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      side: THREE.DoubleSide,
    });
    const geometry = new THREE.PlaneGeometry(
      PREDICTION_UI_CONFIG.text.textWidth,
      PREDICTION_UI_CONFIG.text.textHeight
    );
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;

    return mesh;
  }

  private createButton(text: string, color: number, x: number): THREE.Mesh | null {
    // Create button background
    const geometry = new THREE.BoxGeometry(
      PREDICTION_UI_CONFIG.button.width,
      PREDICTION_UI_CONFIG.button.height,
      PREDICTION_UI_CONFIG.button.depth
    );
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.1,
    });
    const button = new THREE.Mesh(geometry, material);
    button.position.set(x, PREDICTION_UI_CONFIG.layout.buttonY, PREDICTION_UI_CONFIG.layout.buttonZ);
    button.castShadow = true;

    // Add text to button
    const textMesh = this.createTextMesh(
      text,
      PREDICTION_UI_CONFIG.text.buttonFontSize,
      PREDICTION_UI_CONFIG.text.buttonTextColor
    );
    if (textMesh) {
      textMesh.position.z = PREDICTION_UI_CONFIG.button.depth / 2 + 0.01;
      button.add(textMesh);
    }

    return button;
  }

  private setupMouseEvents(): void {
    window.addEventListener('mousemove', this.boundOnMouseMove);
    window.addEventListener('click', this.boundOnClick);
    
    // Mobile touch support
    window.addEventListener('touchstart', this.boundOnTouchStart, { passive: false });
    window.addEventListener('touchend', this.boundOnTouchEnd, { passive: false });
  }

  private onMouseMove(event: MouseEvent): void {
    if (!this.isVisible) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.checkHover();
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const buttons = [this.inButton, this.notInButton].filter((b): b is THREE.Mesh => b !== null);
    const intersects = this.raycaster.intersectObjects(buttons, true);

    // Reset previous hover
    if (this.hoveredButton) {
      const mat = this.hoveredButton.material as THREE.MeshStandardMaterial;
      mat.emissive.setHex(0x000000);
      this.hoveredButton.scale.set(1, 1, 1);
    }

    if (intersects.length > 0) {
      let button = intersects[0].object as THREE.Mesh;
      
      // Check if we hovered on a child mesh (text)
      if (!button.userData.type && button.parent) {
        button = button.parent as THREE.Mesh;
      }

      if (button.userData.type) {
        this.hoveredButton = button;
        const mat = button.material as THREE.MeshStandardMaterial;
        mat.emissive.setHex(PREDICTION_UI_CONFIG.button.hoverEmissive);
        button.scale.set(
          PREDICTION_UI_CONFIG.button.hoverScale,
          PREDICTION_UI_CONFIG.button.hoverScale,
          PREDICTION_UI_CONFIG.button.hoverScale
        );
      }
    } else {
      this.hoveredButton = null;
    }
  }

  private onClick(event: MouseEvent): void {
    if (!this.isVisible) return;

    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const buttons = [this.inButton, this.notInButton].filter((b): b is THREE.Mesh => b !== null);
    const intersects = this.raycaster.intersectObjects(buttons, true);

    if (intersects.length > 0) {
      let button = intersects[0].object as THREE.Mesh;
      
      // Check if we clicked on a child mesh (text)
      if (!button.userData.type && button.parent) {
        button = button.parent as THREE.Mesh;
      }

      const type = button.userData.type;
      if (type === 'in' || type === 'not-in') {
        this.handleSelection(type);
      }
    }
  }

  private onTouchStart(event: TouchEvent): void {
    if (!this.isVisible) return;
    event.preventDefault();

    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

      this.checkHover();
    }
  }

  private onTouchEnd(event: TouchEvent): void {
    if (!this.isVisible) return;
    event.preventDefault();

    if (event.changedTouches.length === 1) {
      const touch = event.changedTouches[0];
      this.mouse.x = (touch.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(touch.clientY / window.innerHeight) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);

      const buttons = [this.inButton, this.notInButton].filter((b): b is THREE.Mesh => b !== null);
      const intersects = this.raycaster.intersectObjects(buttons, true);

      if (intersects.length > 0) {
        let button = intersects[0].object as THREE.Mesh;
        
        if (!button.userData.type && button.parent) {
          button = button.parent as THREE.Mesh;
        }

        const type = button.userData.type;
        if (type === 'in' || type === 'not-in') {
          this.handleSelection(type);
        }
      }
    }
  }

  /**
   * Show prediction UI and return a promise that resolves when user makes a choice
   */
  async getPrediction(letter: string): Promise<Prediction> {
    this.selectedLetter = letter;
    
    // Update letter display
    if (this.letterMesh) {
      const newLetterMesh = this.createTextMesh(
        letter,
        PREDICTION_UI_CONFIG.text.letterFontSize,
        PREDICTION_UI_CONFIG.text.letterColor
      );
      if (newLetterMesh && this.letterMesh.parent) {
        const parent = this.letterMesh.parent;
        parent.remove(this.letterMesh);
        this.letterMesh = newLetterMesh;
        this.letterMesh.position.set(0, PREDICTION_UI_CONFIG.layout.letterY, PREDICTION_UI_CONFIG.layout.textZ);
        parent.add(this.letterMesh);
      }
    }

    // Show UI with animation
    this.show();

    return new Promise<Prediction>((resolve) => {
      this.resolvePromise = resolve;
    });
  }

  private handleSelection(prediction: Prediction): void {
    if (this.resolvePromise) {
      this.resolvePromise(prediction);
      this.resolvePromise = null;
    }
    this.hide();
  }

  private show(): void {
    this.isVisible = true;
    this.group.visible = true;
    
    // Animate scale
    this.group.scale.set(0, 0, 0);
    const startTime = performance.now();
    const duration = PREDICTION_UI_CONFIG.animation.showDuration;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out animation
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const scale = easeOut * PREDICTION_UI_CONFIG.animation.showScale;
      
      this.group.scale.set(scale, scale, scale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }

  hide(): void {
    // Animate scale down
    const startTime = performance.now();
    const duration = PREDICTION_UI_CONFIG.animation.hideDuration;
    const startScale = this.group.scale.x;

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease in animation
      const easeIn = Math.pow(progress, 2);
      const scale = startScale * (1 - easeIn);
      
      this.group.scale.set(scale, scale, scale);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isVisible = false;
        this.group.visible = false;
      }
    };

    requestAnimationFrame(animate);
  }

  /**
   * Show a temporary 3D toast message
   */
  showMessage(message: string, color: string = '#4ecdc4'): void {
    // Remove existing toast
    if (this.toastMesh) {
      this.group.remove(this.toastMesh);
      this.toastMesh = null;
    }

    // Clear existing timeout
    if (this.toastTimeout !== null) {
      clearTimeout(this.toastTimeout);
      this.toastTimeout = null;
    }

    // Parse color
    const colorNumber = parseInt(color.replace('#', ''), 16);

    // Create toast mesh
    this.toastMesh = this.createTextMesh(
      message,
      PREDICTION_UI_CONFIG.text.toastFontSize,
      colorNumber
    );

    if (this.toastMesh) {
      this.toastMesh.position.set(0, PREDICTION_UI_CONFIG.layout.toastY, PREDICTION_UI_CONFIG.layout.toastZ);
      this.group.add(this.toastMesh);

      // Animate in
      this.toastMesh.scale.set(0, 0, 0);
      const startTime = performance.now();
      const duration = 300;

      const animateIn = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const scale = easeOut;
        
        if (this.toastMesh) {
          this.toastMesh.scale.set(scale, scale, scale);
        }

        if (progress < 1) {
          requestAnimationFrame(animateIn);
        }
      };

      requestAnimationFrame(animateIn);

      // Auto-hide after delay
      this.toastTimeout = window.setTimeout(() => {
        if (this.toastMesh) {
          const hideStartTime = performance.now();
          const hideDuration = 300;
          const startScale = this.toastMesh.scale.x;

          const animateOut = (currentTime: number) => {
            const elapsed = currentTime - hideStartTime;
            const progress = Math.min(elapsed / hideDuration, 1);
            const easeIn = Math.pow(progress, 2);
            const scale = startScale * (1 - easeIn);
            
            if (this.toastMesh) {
              this.toastMesh.scale.set(scale, scale, scale);
            }

            if (progress < 1) {
              requestAnimationFrame(animateOut);
            } else {
              if (this.toastMesh) {
                this.group.remove(this.toastMesh);
                this.toastMesh = null;
              }
            }
          };

          requestAnimationFrame(animateOut);
        }
      }, PREDICTION_UI_CONFIG.toast.duration);
    }
  }

  setPosition(x: number, y: number, z: number): void {
    this.group.position.set(x, y, z);
  }

  dispose(): void {
    window.removeEventListener('mousemove', this.boundOnMouseMove);
    window.removeEventListener('click', this.boundOnClick);
    window.removeEventListener('touchstart', this.boundOnTouchStart);
    window.removeEventListener('touchend', this.boundOnTouchEnd);
    
    if (this.toastTimeout !== null) {
      clearTimeout(this.toastTimeout);
    }
    
    this.scene.remove(this.group);
  }
}
