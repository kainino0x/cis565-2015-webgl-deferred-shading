(function() {
    'use strict';
    window.R = {};
    R.pass_copy = {};
    R.pass_deferred = {};
    R.pass_post1 = {};
    R.lights = [];

    R.light_min = [-6, 0, -14];
    R.light_max = [6, 18, 14];
    R.light_dt = -0.1;
    R.NUM_LIGHTS = 20;
    R.NUM_GBUFFERS = 4;

    /**
     * Set up the deferred pipeline framebuffer objects and textures.
     */
    R.deferredSetup = function() {
        setupLights();
        loadAllShaderPrograms();
        R.pass_copy.setup();
        R.pass_deferred.setup();
    };

    var setupLights = function() {
        var posfn = function() {
            var r = [0, 0, 0];
            for (var i = 0; i < 3; i++) {
                var mn = R.light_min[i];
                var mx = R.light_max[i];
                r = Math.random() * (mx - mn) + mn;
            }
            return r;
        };
        for (var i = 0; i < R.NUM_LIGHTS; i++) {
            R.lights.push({
                pos: [posfn(), posfn(), posfn()],
                col: [
                    1 + Math.random(),
                    1 + Math.random(),
                    1 + Math.random()]
            });
        }
    };

    /**
     * Create/configure framebuffer between "copy" and "deferred" stages
     */
    R.pass_copy.setup = function() {
        // * Create the FBO
        R.pass_copy.fbo = gl.createFramebuffer();
        // * Create, bind, and store a depth target texture for the FBO
        R.pass_copy.depthTex = createAndBindDepthTargetTexture(R.pass_copy.fbo);

        // * Create, bind, and store "color" target textures for the FBO
        R.pass_copy.gbufs = [];
        var attachments = [];
        for (var i = 0; i < R.NUM_GBUFFERS; i++) {
            var attachment = gl_draw_buffers['COLOR_ATTACHMENT' + i + '_WEBGL'];
            var tex = createAndBindColorTargetTexture(R.pass_copy.fbo, attachment);
            R.pass_copy.gbufs.push(tex);
            attachments.push(attachment);
        }

        // * Check for framebuffer errors
        abortIfFramebufferIncomplete(R.pass_copy.fbo);
        // * Tell the WEBGL_draw_buffers extension which FBO attachments are
        //   being used. (This extension allows for multiple render targets.)
        gl_draw_buffers.drawBuffersWEBGL(attachments);
    };

    /**
     * Create/configure framebuffer between "deferred" and "post1" stages
     */
    R.pass_deferred.setup = function() {
        // * Create the FBO
        R.pass_deferred.fbo = gl.createFramebuffer();
        // * Create, bind, and store a single color target texture for the FBO
        R.pass_deferred.colorTex = createAndBindColorTargetTexture(
            R.pass_deferred.fbo, gl_draw_buffers.COLOR_ATTACHMENT0_WEBGL);

        // * Check for framebuffer errors
        abortIfFramebufferIncomplete(R.pass_deferred.fbo);
        // * Tell the WEBGL_draw_buffers extension which FBO attachments are
        //   being used. (This extension allows for multiple render targets.)
        gl_draw_buffers.drawBuffersWEBGL([gl_draw_buffers.COLOR_ATTACHMENT0_WEBGL]);
    };

    /**
     * Loads all of the shader programs used in the pipeline.
     */
    var loadAllShaderPrograms = function() {
        loadShaderProgram(gl, 'glsl/copy.vert.glsl', 'glsl/copy.frag.glsl',
            function(prog) {
                // Create an object to hold info about this shader program
                var p = { prog: prog };

                // Retrieve the uniform and attribute locations
                p.u_cameraMat = gl.getUniformLocation(prog, 'u_cameraMat');
                p.u_colmap    = gl.getUniformLocation(prog, 'u_colmap');
                p.u_normap    = gl.getUniformLocation(prog, 'u_normap');
                p.a_position  = gl.getAttribLocation(prog, 'a_position');
                p.a_normal    = gl.getAttribLocation(prog, 'a_normal');
                p.a_uv        = gl.getAttribLocation(prog, 'a_uv');

                // Save the object into this variable for access later
                R.progCopy = p;
            });

        loadShaderProgram(gl, 'glsl/quad.vert.glsl', 'glsl/clear.frag.glsl',
            function(prog) {
                // Create an object to hold info about this shader program
                R.progClear = { prog: prog };
            });

        loadDeferredProgram('ambient', function(p) {
            // Save the object into this variable for access later
            R.prog_Ambient = p;
        });

        loadDeferredProgram('blinnphong-pointlight', function(p) {
            // Save the object into this variable for access later
            R.prog_BlinnPhong_PointLight = p;
        });

        loadDeferredProgram('debug', function(p) {
            p.u_debug = gl.getUniformLocation(p.prog, 'u_debug');
            // Save the object into this variable for access later
            R.prog_Debug = p;
        });

        loadPostProgram('one', function(p) {
            p.u_color    = gl.getUniformLocation(p.prog, 'u_color');
            // Save the object into this variable for access later
            R.progPost1 = p;
        });

        // TODO: If you add more passes, load and set up their shader programs.
    };

    var loadDeferredProgram = function(name, callback) {
        loadShaderProgram(gl, 'glsl/quad.vert.glsl',
                          'glsl/deferred/' + name + '.frag.glsl',
            function(prog) {
                // Create an object to hold info about this shader program
                var p = { prog: prog };

                // Retrieve the uniform and attribute locations
                p.u_lightCol = gl.getUniformLocation(prog, 'u_lightCol');
                p.u_lightPos = gl.getUniformLocation(prog, 'u_lightPos');
                p.u_gbufs = [];
                for (var i = 0; i < R.NUM_GBUFFERS; i++) {
                    p.u_gbufs[i] = gl.getUniformLocation(prog, 'u_gbufs[' + i + ']');
                }
                p.u_depth    = gl.getUniformLocation(prog, 'u_depth');
                p.a_position = gl.getAttribLocation(prog, 'a_position');

                callback(p);
            });
    };

    var loadPostProgram = function(name, callback) {
        loadShaderProgram(gl, 'glsl/quad.vert.glsl',
                          'glsl/post/' + name + '.frag.glsl',
            function(prog) {
                // Create an object to hold info about this shader program
                var p = { prog: prog };

                // Retrieve the uniform and attribute locations
                p.a_position = gl.getAttribLocation(prog, 'a_position');

                callback(p);
            });
    };
})();
