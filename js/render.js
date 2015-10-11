(function() {
    "use strict";
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
        camera.position.set(-15, 10, 10);
        camera.lookAt(scene.position);

        controls = new THREE.TrackballControls(camera, renderer.domElement);
        controls.target.set(0, 0, 0);
        controls.rotateSpeed = 2.0;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 0.8;
        controls.noZoom = false;
        controls.noPan = false;
        controls.staticMoving = true;
        controls.dynamicDampingFactor = 0.3;
        controls.addEventListener('change', render);

        var geometry = new THREE.BoxGeometry(5, 5, 5);
        var material = new THREE.MeshLambertMaterial({ color: 0xFF0000 });
        var mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        var light = new THREE.PointLight(0xFFFF00);
        light.position.set(10, 0, 10);
        scene.add(light);

        renderer.setClearColor(0xdddddd, 1);

        resize();
        requestAnimationFrame(update);
    };

    var resize = function() {
        var w = window.innerWidth;
        var h = window.innerHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        controls.handleResize();
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

    window.onload = init;
    window.onresize = resize;
})();
