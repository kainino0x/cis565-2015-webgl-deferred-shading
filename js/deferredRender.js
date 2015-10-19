(function() {
    'use strict';
    // deferredSetup.js must be loaded first

    R.deferredRender = function(state) {
        if (!aborted && !(R.progClear &&
              R.prog_Ambient &&
              R.prog_BlinnPhong_PointLight &&
              R.prog_Debug &&
              R.progPost1)) {
            console.log('waiting for programs to load...');
            return;
        }

        // Move the R.lights
        for (var i = 0; i < R.lights.length; i++) {
            var mn = R.light_min[1];
            var mx = R.light_max[1];
            R.lights[i].pos[1] = (R.lights[i].pos[1] + R.light_dt - mn + mx) % mx + mn;
        }

        // Execute deferred shading pipeline
        R.pass_copy.render(state);
        if (cfg && cfg.debugView >= 0) {
            // Do a debug render instead of a regular render
            // Don't do any post-processing in debug mode
            R.pass_debug.render();
        } else {
            // Deferred pass and postprocessing pass(es)
            R.pass_deferred.render();
            R.pass_post1.render();
            // TODO: call more postprocessing passes, if any
        }
    };

    /**
     * 'copy' pass: Render into g-buffers
     */
    R.pass_copy.render = function(state) {
        // * Bind the framebuffer R.pass_copy.fbo
        gl.bindFramebuffer(gl.FRAMEBUFFER, R.pass_copy.fbo);

        // * Clear screen using R.progClear
        gl.useProgram(R.progClear.prog);
        renderFullScreenQuad(R.progClear);
        // * Clear depth buffer using gl.clear
        gl.clearDepth(1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        // * Use the program R.progCopy.prog
        gl.useProgram(R.progCopy.prog);
        gl.uniformMatrix4fv(R.progCopy.u_cameraMat, false, state.cameraMat);

        // * Draw the scene
        for (var i = 0; i < state.models.length; i++) {
            var m = state.models[i];
            readyModelForDraw(R.progCopy, m);
            drawReadyModel(m);
        }
    };

    var bindLightPass = function(prog) {
        gl.useProgram(prog.prog);

        // * Bind all of the g-buffers and depth buffer as texture inputs
        for (var i = 0; i < R.NUM_GBUFFERS; i++) {
            gl.activeTexture(gl['TEXTURE' + i]);
            gl.bindTexture(gl.TEXTURE_2D, R.pass_copy.gbufs[i]);
            gl.uniform1i(prog.u_gbufs[i], i);
        }
        gl.activeTexture(gl['TEXTURE' + R.NUM_GBUFFERS]);
        gl.bindTexture(gl.TEXTURE_2D, R.pass_copy.depthTex);
        gl.uniform1i(prog.u_depth, R.NUM_GBUFFERS);
    };

    R.pass_debug.render = function() {
        // * Unbind any framebuffer to write to the screen
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // * Tell shader which debug view to use
        bindLightPass(R.prog_Debug);
        gl.uniform1i(R.prog_Debug.u_debug, cfg.debugView);

        // * Render a fullscreen quad to perform shading on
        renderFullScreenQuad(R.prog_Debug);
    };

    /**
     * 'deferred' pass: Add lighting results for each individual light
     */
    R.pass_deferred.render = function() {
        // * Bind the framebuffer to write into for later postprocessing
        gl.bindFramebuffer(gl.FRAMEBUFFER, R.pass_deferred.fbo);

        // * Clear the framebuffer depth
        gl.clearColor(0, 0, 0, 1);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // * Render it once for each light, if not debugging
        gl.enable(gl.BLEND);
        // * _ADD_ together the result of each lighting pass
        gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ZERO);

        // * Light using ambient light
        bindLightPass(R.prog_Ambient);
        renderFullScreenQuad(R.prog_Ambient);

        // * Light using Blinn-Phong lighting
        bindLightPass(R.prog_BlinnPhong_PointLight);
        for (var i = 0; i < R.lights.length; i++) {
            gl.uniform3fv(R.prog_BlinnPhong_PointLight.u_lightPos, R.lights[i].pos);
            gl.uniform3fv(R.prog_BlinnPhong_PointLight.u_lightCol, R.lights[i].col);
            renderFullScreenQuad(R.prog_BlinnPhong_PointLight);
        }

        gl.disable(gl.BLEND);
    };

    /**
     * 'post1' pass: Perform (first) pass of post-processing
     */
    R.pass_post1.render = function() {
        // * Unbind any existing framebuffer
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // * Clear the framebuffer depth
        gl.clearDepth(1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.useProgram(R.progPost1.prog);

        // * Bind the deferred pass's color output as a texture input
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, R.pass_deferred.colorTex);
        gl.uniform1i(R.progPost1.u_color, 0);

        // * Render a fullscreen quad to perform shading on
        renderFullScreenQuad(R.progPost1);
    };
})();
