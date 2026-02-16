// client/src/game/SceneManager.js
import * as THREE from 'three';

export class SceneManager {
  constructor() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);
    this.scene.fog = new THREE.FogExp2(0x87CEEB, 0.008);

    // Camera (1st person)
    this.camera = new THREE.PerspectiveCamera(
      75, window.innerWidth / window.innerHeight, 0.1, 1000
    );
    this.camera.position.set(0, 5, 10);

    // Renderer
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    this.renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    document.body.appendChild(this.renderer.domElement);

    this.setupLighting();
  }

  setupLighting() {
    // Sun
    const sun = new THREE.DirectionalLight(0xfff5e6, 2.0);
    sun.position.set(60, 100, 40);
    sun.castShadow = true;
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    sun.shadow.mapSize.set(isMobile ? 1024 : 2048, isMobile ? 1024 : 2048);
    sun.shadow.camera.near = 0.5;
    sun.shadow.camera.far = 300;
    sun.shadow.camera.left = -100;
    sun.shadow.camera.right = 100;
    sun.shadow.camera.top = 100;
    sun.shadow.camera.bottom = -100;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    // Ambient
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambient);

    // Hemisphere light (sky/ground color)
    const hemi = new THREE.HemisphereLight(0x87CEEB, 0x4a7c4f, 0.4);
    this.scene.add(hemi);
  }

  add(object) {
    this.scene.add(object);
  }

  remove(object) {
    this.scene.remove(object);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  get domElement() {
    return this.renderer.domElement;
  }
}
