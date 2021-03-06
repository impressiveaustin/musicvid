import * as THREE from 'three';
import Scene from './Scene'

export default class Scene3DPerspective extends Scene {
    constructor(gui, resolution, remove, moveScene) {
        super(gui, resolution, remove, moveScene);

        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(45, resolution.width / resolution.height, 0.1, 10000 );
        this.camera.position.z = 200;
      
        this.MODAL_REF_NR = 7;
        this.type = "perspective";
        if(this.folder) {
            this.folder.name = "webgl 3d scene";
            this.setUpControls();
            this.cameraXController.min(-100000).max(100000).step(0.2);
            this.cameraYController.min(-100000).max(100000).step(0.2);
            this.cameraZController.min(-100000).max(100000).step(0.2);
        }       
    }
}