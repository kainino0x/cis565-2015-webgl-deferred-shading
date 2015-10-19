(function() {
    'use strict';
    var pass_copy = {};
    var pass_deferred = {};
    var pass_post1 = {};
    var progCopy, progClear, progDebug, progPost1;
    var prog_Ambient, prog_BlinnPhong_Point;
    var lights = [];

    var light_min = [-6, 0, -14];
    var light_max = [6, 18, 14];
    var light_dt = -0.1;
    var NUM_LIGHTS = 20;
    var NUM_GBUFFERS = 4;

    /**
     * Set up the deferred pipeline framebuffer objects and textures.
     */
    window.deferredSetup = function() {
        loadAllShaderPrograms();

        pass_copy.setup();
        pass_deferred.setup();

        var posfn = function() {
            var r = [0, 0, 0];
            for (var i = 0; i < 3; i++) {
                var mn = light_min[i];
                var mx = light_max[i];
                r = Math.random() * (mx - mn) + mn;
            }
            return r;
        };
        for (var i = 0; i < NUM_LIGHTS; i++) {
            lights.push({
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
    pass_copy.setup = function() {
        // * Create the FBO
        pass_copy.fbo = gl.createFramebuffer();
        // * Create, bind, and store a depth target texture for the FBO
        pass_copy.depthTex = createAndBindDepthTargetTexture(pass_copy.fbo);

        // * Create, bind, and store "color" target textures for the FBO
        pass_copy.gbufs = [];
        var attachments = [];
        for (var i = 0; i < NUM_GBUFFERS; i++) {
            var attachment = gl_draw_buffers['COLOR_ATTACHMENT' + i + '_WEBGL'];
            var tex = createAndBindColorTargetTexture(pass_copy.fbo, attachment);
            pass_copy.gbufs.push(tex);
            attachments.push(attachment);
        }

        // * Check for framebuffer errors
        abortIfFramebufferIncomplete(pass_copy.fbo);
        // * Tell the WEBGL_draw_buffers extension which FBO attachments are
        //   being used. (This extension allows for multiple render targets.)
        gl_draw_buffers.drawBuffersWEBGL(attachments);
    };

    /**
     * Create/configure framebuffer between "deferred" and "post1" stages
     */
    pass_deferred.setup = function() {
        // * Create the FBO
        pass_deferred.fbo = gl.createFramebuffer();
        // * Create, bind, and store a single color target texture for the FBO
        pass_deferred.colorTex = createAndBindColorTargetTexture(
            pass_deferred.fbo, gl_draw_buffers.COLOR_ATTACHMENT0_WEBGL);

        // * Check for framebuffer errors
        abortIfFramebufferIncomplete(pass_deferred.fbo);
        // * Tell the WEBGL_draw_buffers extension which FBO attachments are
        //   being used. (This extension allows for multiple render targets.)
        gl_draw_buffers.drawBuffersWEBGL([gl_draw_buffers.COLOR_ATTACHMENT0_WEBGL]);
    };

    window.deferredRender = function(state) {
        if (!(progPost1 &&
              prog_Ambient &&
              prog_BlinnPhong_Point &&
              progDebug &&
              progClear)) {
            return;
        }

        // Move the lights
        for (var i = 0; i < lights.length; i++) {
            var mn = light_min[1];
            var mx = light_max[1];
            lights[i].pos[1] = (lights[i].pos[1] + light_dt - mn + mx) % mx + mn;
        }

        pass_copy.render(state);
        pass_deferred.render();
        if (cfg && cfg.debugView >= 0) {
            // Don't do any post-processing in debug mode
            return;
        }
        pass_post1.render();
    };

    /**
     * 'copy' pass: Render into g-buffers
     */
    pass_copy.render = function(state) {
        // * Bind the framebuffer pass_copy.fbo
        gl.bindFramebuffer(gl.FRAMEBUFFER, pass_copy.fbo);

        // * Clear screen using progClear
        gl.useProgram(progClear.prog);
        renderFullScreenQuad(progClear);
        // * Clear depth buffer using gl.clear
        gl.clearDepth(1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        // * Use the program progCopy.prog
        gl.useProgram(progCopy.prog);
        gl.uniformMatrix4fv(progCopy.u_cameraMat, false, state.cameraMat);

        // * Draw the scene
        for (var i = 0; i < state.models.length; i++) {
            var m = state.models[i];
            readyModelForDraw(progCopy, m);
            drawReadyModel(m);
        }

        // * Unbind the shader program
        gl.useProgram(null);
        // * Unbind the framebuffer object
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    var bindLightPass = function(prog) {
        gl.useProgram(prog.prog);

        // * Bind all of the g-buffers and depth buffer as texture inputs
        for (var i = 0; i < NUM_GBUFFERS; i++) {
            gl.activeTexture(gl['TEXTURE' + i]);
            gl.bindTexture(gl.TEXTURE_2D, pass_copy.gbufs[i]);
            gl.uniform1i(prog.u_gbufs[i], i);
        }
        gl.activeTexture(gl['TEXTURE' + NUM_GBUFFERS]);
        gl.bindTexture(gl.TEXTURE_2D, pass_copy.depthTex);
        gl.uniform1i(prog.u_depth, NUM_GBUFFERS);
    };

    /**
     * 'deferred' pass: Add lighting results for each individual light
     */
    pass_deferred.render = function() {
        // * Pick a shader program based on whether debug views are enabled
        var prog;
        if (cfg && cfg.debugView >= 0) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, pass_deferred.fbo);
        }

        // * Clear the framebuffer depth
        gl.clearColor(0, 0, 0, 1);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // * Render a fullscreen quad to perform shading on
        if (cfg && cfg.debugView >= 0) {
            // Tell shader which debug view to use
            bindLightPass(progDebug);
            gl.uniform1i(progDebug.u_debug, cfg.debugView);
            renderFullScreenQuad(prog);
        } else {
            // * Render it once for each light, if not debugging
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

            // * Light using ambient light
            bindLightPass(prog_Ambient);
            renderFullScreenQuad(prog_Ambient);

            // * Light using Blinn-Phong lighting
            bindLightPass(prog_BlinnPhong_Point);
            for (var i = 0; i < lights.length; i++) {
                gl.uniform3fv(prog_BlinnPhong_Point.u_lightPos, lights[i].pos);
                gl.uniform3fv(prog_BlinnPhong_Point.u_lightCol, lights[i].col);
                renderFullScreenQuad(prog_BlinnPhong_Point);
            }

            gl.disable(gl.BLEND);
        }

        // * Unbind everything
        for (var i = 0; i < NUM_GBUFFERS; i++) {
            gl.activeTexture(gl['TEXTURE' + i]);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.activeTexture(gl['TEXTURE' + NUM_GBUFFERS]);
        gl.bindTexture(gl.TEXTURE_2D, null);

        gl.useProgram(null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    /**
     * 'post1' pass: Perform (first) pass of post-processing
     */
    pass_post1.render = function() {
        // * Clear the framebuffer depth
        gl.clearDepth(1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.useProgram(progPost1.prog);

        // * Bind the deferred pass's color output as a texture input
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, pass_deferred.colorTex);
        gl.uniform1i(progPost1.u_color, 0);

        // * Render a fullscreen quad to perform shading on
        renderFullScreenQuad(progPost1);

        // * Unbind everything
        for (var i = 0; i < NUM_GBUFFERS; i++) {
            gl.activeTexture(gl['TEXTURE' + i]);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.activeTexture(gl['TEXTURE' + NUM_GBUFFERS]);
        gl.bindTexture(gl.TEXTURE_2D, null);

        gl.useProgram(null);
    };

    var loadDeferredProgram = function(name, callback) {
        loadShaderProgram(gl, 'glsl/quad.vert.glsl',
                          'glsl/deferred/' + name + '.frag.glsl').then(
            function(prog) {
                // Create an object to hold info about this shader program
                var p = { prog: prog };

                // Retrieve the uniform and attribute locations
                p.u_lightCol = gl.getUniformLocation(prog, 'u_lightCol');
                p.u_lightPos = gl.getUniformLocation(prog, 'u_lightPos');
                p.u_gbufs = [];
                for (var i = 0; i < NUM_GBUFFERS; i++) {
                    p.u_gbufs[i] = gl.getUniformLocation(prog, 'u_gbufs[' + i + ']');
                }
                p.u_depth    = gl.getUniformLocation(prog, 'u_depth');
                p.a_position = gl.getAttribLocation(prog, 'a_position');

                callback(p);
            });
    }

    /**
     * Loads all of the shader programs used in the pipeline.
     */
    var loadAllShaderPrograms = function() {
        loadShaderProgram(gl, 'glsl/copy.vert.glsl', 'glsl/copy.frag.glsl').then(
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
                progCopy = p;
            });

        loadShaderProgram(gl, 'glsl/quad.vert.glsl', 'glsl/clear.frag.glsl').then(
            function(prog) {
                // Create an object to hold info about this shader program
                progClear = { prog: prog };
            });

        loadDeferredProgram('ambient', function(p) {
            // Save the object into this variable for access later
            prog_Ambient = p;
        });

        loadDeferredProgram('blinnphong-point', function(p) {
            // Save the object into this variable for access later
            prog_BlinnPhong_Point = p;
        });

        loadShaderProgram(gl, 'glsl/quad.vert.glsl', 'glsl/debug.frag.glsl').then(
            function(prog) {
                // Create an object to hold info about this shader program
                var p = { prog: prog };

                // Retrieve the uniform and attribute locations
                p.u_debug    = gl.getUniformLocation(prog, 'u_debug');
                p.u_gbufs = [];
                for (var i = 0; i < NUM_GBUFFERS; i++) {
                    p.u_gbufs[i] = gl.getUniformLocation(prog, 'u_gbufs[' + i + ']');
                }
                p.u_depth    = gl.getUniformLocation(prog, 'u_depth');
                p.a_position = gl.getAttribLocation(prog, 'a_position');

                // Save the object into this variable for access later
                progDebug = p;
            });

        loadShaderProgram(gl, 'glsl/quad.vert.glsl', 'glsl/post1.frag.glsl').then(
            function(prog) {
                // Create an object to hold info about this shader program
                var p = { prog: prog };

                // Retrieve the uniform and attribute locations
                p.u_color    = gl.getUniformLocation(prog, 'u_color');
                p.a_position = gl.getAttribLocation(prog, 'a_position');

                // Save the object into this variable for access later
                progPost1 = p;
            });

        // TODO: If you add more passes, load and set up their shader programs.
    };
})();
