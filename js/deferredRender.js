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

        R.pass_copy.render(state);
        R.pass_deferred.render();
        if (cfg && cfg.debugView >= 0) {
            // Don't do any post-processing in debug mode
            return;
        }
        R.pass_post1.render();
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

        // * Unbind the shader program
        gl.useProgram(null);
        // * Unbind the framebuffer object
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
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

    /**
     * 'deferred' pass: Add lighting results for each individual light
     */
    R.pass_deferred.render = function() {
        // * Pick a shader program based on whether debug views are enabled
        var prog;
        if (cfg && cfg.debugView >= 0) {
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        } else {
            gl.bindFramebuffer(gl.FRAMEBUFFER, R.pass_deferred.fbo);
        }

        // * Clear the framebuffer depth
        gl.clearColor(0, 0, 0, 1);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // * Render a fullscreen quad to perform shading on
        if (cfg && cfg.debugView >= 0) {
            // Tell shader which debug view to use
            bindLightPass(R.prog_Debug);
            gl.uniform1i(R.prog_Debug.u_debug, cfg.debugView);
            renderFullScreenQuad(prog);
        } else {
            // * Render it once for each light, if not debugging
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);

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
        }

        // * Unbind everything
        for (var i = 0; i < R.NUM_GBUFFERS; i++) {
            gl.activeTexture(gl['TEXTURE' + i]);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.activeTexture(gl['TEXTURE' + R.NUM_GBUFFERS]);
        gl.bindTexture(gl.TEXTURE_2D, null);

        gl.useProgram(null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    /**
     * 'post1' pass: Perform (first) pass of post-processing
     */
    R.pass_post1.render = function() {
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

        // * Unbind everything
        for (var i = 0; i < R.NUM_GBUFFERS; i++) {
            gl.activeTexture(gl['TEXTURE' + i]);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.activeTexture(gl['TEXTURE' + R.NUM_GBUFFERS]);
        gl.bindTexture(gl.TEXTURE_2D, null);

        gl.useProgram(null);
    };
})();
