(function() {
    'use strict';
    var renderer, scene, camera, controls, stats;

    var init = function() {
        stats = new Stats();
        stats.setMode(1); // 0: fps, 1: ms, 2: mb
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';
        document.body.appendChild(stats.domElement);

        var canvas = document.getElementById("canvas");
        renderer = new THREE.WebGLRenderer({ canvas: canvas });

        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(
            35,             // Field of view
            800 / 600,      // Aspect ratio
            0.1,            // Near plane
            10000           // Far plane
        );
        camera.position.set(-8, 1.5, -1);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enableZoom = true;
        controls.target.set(0, 3.2, 0);
        controls.rotateSpeed = 0.3;
        controls.zoomSpeed = 1.0;
        controls.panSpeed = 0.8;

        var light = new THREE.PointLight(0xFFFFFF);
        scene.add(light);

        renderer.setClearColor(0xAABBFF, 1);

        // CHECKITOUT: Load textures and mesh
        var texAlbedo = THREE.ImageUtils.loadTexture('objs/sponza/albedo.jpg');
        var texBump   = THREE.ImageUtils.loadTexture('objs/sponza/bump.jpg');
        texAlbedo.wrapS = texAlbedo.wrapT =
            texBump.wrapS = texBump.wrapT = THREE.RepeatWrapping;
        var material = new THREE.MeshLambertMaterial({ map: texAlbedo });
        loadModel('objs/sponza/sponza.obj', function(o) {
            o.traverse(function(child) {
                if (child instanceof THREE.Mesh) {
                    child.material = material;
                }
            });
            o.material = material;
            console.log(o);
            scene.add(o);
        });

        resize();
        requestAnimationFrame(update);
    };

    var resize = function() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        render();
    };

    var update = function() {
        requestAnimationFrame(update);
        controls.update();
        stats.begin();
        render();
        stats.end();
    };

    var render = function() {
        renderer.render(scene, camera);
    };

    window.handle_load.push(init);
    window.handle_resize.push(resize);
})();
