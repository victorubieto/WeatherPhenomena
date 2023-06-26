import * as THREE from 'https://cdn.skypack.dev/three@0.136';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/controls/OrbitControls.js';
import { Sky } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/objects/Sky.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.136/examples/jsm/loaders/GLTFLoader.js';
import { GUI } from 'https://cdn.skypack.dev/lil-gui';

import { basic_vs, flat_fs } from './data/shaders/shaderAtlas.js';
import { ShaderManager } from './shaderManager.js'

class App {

    constructor() {
        
        this.clock = new THREE.Clock();
        this.loaderGLB = new GLTFLoader();

        // main render attributes
        this.scene = null;
        this.renderer = null;
        this.camera = null;
        this.controls = null;
        
        this.options = {};
    }

    async init() {

        // Init scene, renderer and add to body element
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0x2c2c2c );
        
        this.renderer = new THREE.WebGLRenderer( { antialias: true } );
        this.renderer.setPixelRatio( window.devicePixelRatio );
        this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 0.5;
        //this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        const canvas = this.renderer.domElement;
        document.body.appendChild( canvas );

        // Init camera
        this.camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.01, 100 );
        this.controls = new OrbitControls( this.camera, canvas );
        this.controls.minDistance = 0.75;
        this.controls.maxDistance = 10;
        this.controls.minPolarAngle = 0;
        this.controls.maxPolarAngle = Math.PI/1.75;
        this.controls.enablePan = false;

        this.ortoCamera = new THREE.OrthographicCamera( -1, 1, 1, -1, 0, 1 );
        this.ortoCamera.layers.set(1);
        
        // Set listeners and events
        window.addEventListener( 'resize', this.onWindowResize.bind( this ) );

        // ---------- Load shaders ----------
        this.shaderManager = new ShaderManager("./data/shaders/");
        let SM = this.shaderManager;
        let promise = SM.loadFromFile("basic.vs");
        promise = await promise;
        promise = SM.loadFromFile("flat.fs");
        promise = await promise;
        
        // create fbo to use in the viewport quad
        this.fbo = new THREE.WebGLRenderTarget( window.innerWidth, window.innerHeight );

        this.initGUI();
        this.initScene();
    }

    initScene() {

        // Set up camera
        this.camera.position.set( 0, 2, 4 );
        this.controls.target = new THREE.Vector3( 0, 1, 0 );
        this.controls.update();

        this.camera2 = this.camera.clone();
        this.camera2.layers.set(1);

        // Set up lights
        let hemiLight = new THREE.HemisphereLight( 0xffffff, 0x555555, 0.5 );
        hemiLight.position.set( 0, 20, 0 );
        this.scene.add( hemiLight );

        let dirLight = this.dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
        dirLight.position.set( 10, 5, 10 ); // this will be overriden by the sky options
        dirLight.castShadow = false;
        this.scene.add( dirLight );

        // Set up entities
        let custom_mat = new THREE.ShaderMaterial( {
            uniforms: {
                u_ior: { value: 1.0 },
                u_resolution: new THREE.Uniform( new THREE.Vector2(window.innerWidth * window.devicePixelRatio, window.innerHeight * window.devicePixelRatio) ),
                u_textures: {
                    value: [ this.fbo.texture ]
                },
            },
            vertexShader: this.shaderManager.get('basic.vs'),
            fragmentShader: this.shaderManager.get('flat.fs'),
        } );
        this.gui.add(this.options, 'ior', { Air: 1.0, Ice: 1.309, Water: 1.325, Glass: 1.5 }).name('Index Of Refraction').onChange( () => {
            custom_mat.uniforms['u_ior'].value = this.options.ior 
        });
        // let mat_aux = new THREE.MeshStandardMaterial({
        //     map: this.fbo.texture,
        // })
        let viewport_quad = new THREE.Mesh( new THREE.PlaneGeometry( 2, 2 ), custom_mat );
        viewport_quad.position.set( 0, 1, 1 ); // change to camera position
        //viewport_quad.layers.set(1);
        this.scene.add( viewport_quad );

        let tex = new THREE.TextureLoader().load("./data/leafy_grass_diff_1k.jpg");
        let tex_nor = new THREE.TextureLoader().load("./data/leafy_grass_nor_gl_1k.jpg");
        let tex_arm = new THREE.TextureLoader().load("./data/leafy_grass_arm_1k.jpg");
        let floor_mat = new THREE.MeshPhysicalMaterial( { side: THREE.DoubleSide, map: tex, normalMap: tex_nor, roughnessMap: tex_arm, metalnessMap: tex_arm, aoMap: tex_arm } );
        let floor = new THREE.Mesh( new THREE.CircleGeometry( 5, 32 ), floor_mat );
        //floor.renderOrder = 1;
        floor.rotateX( -Math.PI/2 );
        this.scene.add( floor );

        let sphere = new THREE.Mesh( new THREE.SphereGeometry( 0.5, 32, 16 ), new THREE.MeshStandardMaterial() );
        sphere.position.set( 0, 1, 0 );
        this.scene.add( sphere );

        this.initSky();

        $('#loading').fadeOut();

        // Start loop
        this.animate();
    }

    initSky() {

        // Add Sky
        let sky = new Sky();
        sky.scale.setScalar( 1000 );
        this.scene.add( sky );

        this.sun = this.dirLight.position;

        // GUI
        const effectController = {
            turbidity: 10,
            rayleigh: 3,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.7,
            elevation: 30,
            azimuth: 30,
            exposure: this.renderer.toneMappingExposure
        };

        let guiChanged = () => {

            const uniforms = sky.material.uniforms;
            uniforms['turbidity'].value = effectController.turbidity;
            uniforms['rayleigh'].value = effectController.rayleigh;
            uniforms['mieCoefficient'].value = effectController.mieCoefficient;
            uniforms['mieDirectionalG'].value = effectController.mieDirectionalG;

            const phi = THREE.MathUtils.degToRad( 90 - effectController.elevation );
            const theta = THREE.MathUtils.degToRad( effectController.azimuth );

            this.sun.setFromSphericalCoords( 1, phi, theta );

            uniforms['sunPosition'].value.copy( this.sun );

            this.renderer.toneMappingExposure = effectController.exposure;
            this.renderer.render( this.scene, this.camera );

        }

        let day = this.gui.addFolder('Daylight').close();

        day.add(effectController, 'turbidity', 0.0, 20.0, 0.1).onChange( guiChanged );
        day.add(effectController, 'rayleigh', 0.0, 4, 0.001).onChange( guiChanged );
        day.add(effectController, 'mieCoefficient', 0.0, 0.1, 0.001).onChange( guiChanged );
        day.add(effectController, 'mieDirectionalG', 0.0, 1, 0.001).onChange( guiChanged );
        day.add(effectController, 'elevation', 0, 90, 0.1).onChange( guiChanged );
        day.add(effectController, 'azimuth', -180, 180, 0.1).onChange( guiChanged );
        day.add(effectController, 'exposure', 0, 1, 0.0001).onChange( guiChanged );

        guiChanged();
    }

    initGUI() {

        let gui = this.gui = new GUI().title('Weather Phenomena Controls');

        let options = this.options = {
            rain_intensity: 0.0,
            ior: 1.0,
        };

        gui.add(options, 'rain_intensity', 0, 1).name('Rain');
    }

    animate() {

        requestAnimationFrame( this.animate.bind(this) );

        const delta = this.clock.getDelta();
        // render background to fbo
        this.renderer.setRenderTarget(this.fbo);
        this.renderer.render( this.scene, this.camera );

        // render background to screen
        this.renderer.setRenderTarget(null);
        //this.renderer.render( this.scene, this.camera );
        //this.renderer.clearDepth();

        // render geometry to screen
        //this.renderer.render( this.scene, this.camera );
        this.renderer.render( this.scene, this.camera );
    }
    
    onWindowResize() {

        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );
    }
}

let app = new App();
app.init();    

export { app };