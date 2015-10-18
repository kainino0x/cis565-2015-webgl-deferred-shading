var gl, gl_draw_buffers;
var width, height;

(function() {
    'use strict';

    var canvas, renderer, scene, camera, controls, stats;
    var models = [];

    var cameraMat = new THREE.Matrix4();

    var render = function() {
        //return renderer.render(scene, camera);
        camera.updateMatrixWorld();
        camera.matrixWorldInverse.getInverse(camera.matrixWorld);
        cameraMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
        window.Render.render({
            cameraMat: cameraMat.elements,
            models: models
        });
    }

    var update = function() {
        controls.update();
        stats.begin();
        render();
        gl.finish();
        stats.end();
        requestAnimationFrame(update);
    };

    var resize = function() {
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        render();
    };

    var initExtensions = function() {
        if (!gl.getExtension('OES_texture_float')) {
            abort('unable to load extension: OES_texture_float');
        }
        if (!gl.getExtension('OES_texture_float_linear')) {
            abort('unable to load extension: OES_texture_float');
        }
        if (!gl.getExtension('WEBGL_depth_texture')) {
            abort('unable to load extension: WEBGL_depth_texture');
        }

        gl_draw_buffers = gl.getExtension('WEBGL_draw_buffers');
        if (!gl_draw_buffers) {
            abort('unable to load extension: WEBGL_draw_buffers');
        } else {
            var maxdb = gl.getParameter(gl_draw_buffers.MAX_DRAW_BUFFERS_WEBGL);
            console.log('MAX_DRAW_BUFFERS_WEBGL: ' + maxdb);
        }
    };

    var init = function() {
        canvas = document.getElementById('canvas');
        renderer = new THREE.WebGLRenderer({ canvas: canvas });
        gl = renderer.context;

        // TODO: For performance measurements, disable debug mode!
        var debugMode = true;
        if (debugMode) {
            var throwOnGLError = function(err, funcName, args) {
                abort(WebGLDebugUtils.glEnumToString(err) +
                    " was caused by call to: " + funcName);
            };
            gl = WebGLDebugUtils.makeDebugContext(gl, throwOnGLError);
        }

        initExtensions();

        stats = new Stats();
        stats.setMode(1); // 0: fps, 1: ms, 2: mb
        stats.domElement.style.position = 'absolute';
        stats.domElement.style.left = '0px';
        stats.domElement.style.top = '0px';
        document.body.appendChild(stats.domElement);

        scene = new THREE.Scene();

        width = canvas.width;
        height = canvas.height;
        camera = new THREE.PerspectiveCamera(
            45,             // Field of view
            width / height, // Aspect ratio
            1.0,            // Near plane
            100             // Far plane
        );
        camera.position.set(-15.5, 1, -1);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.enableZoom = true;
        controls.target.set(0, 4, 0);
        controls.rotateSpeed = 0.3;
        controls.zoomSpeed = 1.0;
        controls.panSpeed = 0.8;

        var light = new THREE.PointLight(0xFFFFFF);
        scene.add(light);

        renderer.setClearColor(0xAABBFF, 1);

        // CHECKITOUT: Load textures and mesh
        loadModel('objs/sponza/sponza.obj', function(o) {
            scene.add(o);
            for (var i = 0; i < o.children.length; i++) {
                var c = o.children[i];
                var g = c.geometry.attributes;
                var idx = c.geometry.index;

                var gposition = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, gposition);
                gl.bufferData(gl.ARRAY_BUFFER, g.position.array, gl.STATIC_DRAW);

                var gnormal = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, gnormal);
                gl.bufferData(gl.ARRAY_BUFFER, g.normal.array, gl.STATIC_DRAW);

                var guv = gl.createBuffer();
                gl.bindBuffer(gl.ARRAY_BUFFER, guv);
                gl.bufferData(gl.ARRAY_BUFFER, g.uv.array, gl.STATIC_DRAW);

                if (!idx) {
                    idx = new Uint32Array(g.position.array.length / 3);
                    for (var j = 0; j < idx.length; j++) {
                        idx[j] = j;
                    }
                }

                var gidx = gl.createBuffer();
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gidx);
                gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.STATIC_DRAW);

                var m = {
                    idx: gidx,
                    elemCount: idx.length,
                    position: gposition,
                    normal: gnormal,
                    uv: guv,
                    albedo: null,
                    bump: null
                };

                loadTexture('objs/sponza/albedo.jpg').then(function(tex) {
                    m.albedo = tex;
                });
                loadTexture('objs/sponza/bump.jpg').then(function(tex) {
                    m.bump = tex;
                });

                models.push(m);
            }
        });

        renderer.clear();
        renderer.render(scene, camera);
        resize();
        window.Render.setup();

        requestAnimationFrame(update);
    };

    window.handle_load.push(init);
})();
