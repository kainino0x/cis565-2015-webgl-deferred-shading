(function() {
    'use strict';
    var pass_copy = {};
    var pass_post1 = {};
    var progCopy, progClear, progDeferred, progPost1;

    var NUM_GBUFFERS = 4;

    var setup = function() {
        console.log('setup: ' + width + ' x ' + height);

        // ----------------------
        // Create shader programs
        // ----------------------

        loadShaderProgram(gl, 'glsl/copy.vert.glsl', 'glsl/copy.frag.glsl').then(
            function(prog) {
                var p = { prog: prog };

                p.u_cameraMat = gl.getUniformLocation(prog, 'u_cameraMat');
                p.u_albedo    = gl.getUniformLocation(prog, 'u_albedo');
                p.u_bump      = gl.getUniformLocation(prog, 'u_bump');
                p.a_position  = gl.getAttribLocation(prog, 'a_position');
                p.a_normal    = gl.getAttribLocation(prog, 'a_normal');
                p.a_uv        = gl.getAttribLocation(prog, 'a_uv');

                progCopy = p;
            });

        loadShaderProgram(gl, 'glsl/quad.vert.glsl', 'glsl/clear.frag.glsl').then(
            function(prog) {
                progClear = { prog: prog };
            });

        loadShaderProgram(gl, 'glsl/quad.vert.glsl', 'glsl/deferred.frag.glsl').then(
            function(prog) {
                var p = { prog: prog };

                p.u_gbuf = [];
                for (var i = 0; i < NUM_GBUFFERS; i++) {
                    p.u_gbuf[i] = gl.getUniformLocation(prog, 'u_gbuf[' + i + ']');
                }
                p.u_depth    = gl.getUniformLocation(prog, 'u_depth');
                p.a_position = gl.getAttribLocation(prog, 'a_position');

                progDeferred = p;
            });

        loadShaderProgram(gl, 'glsl/quad.vert.glsl', 'glsl/post1.frag.glsl').then(
            function(prog) {
                var p = { prog: prog };

                p.u_color    = gl.getUniformLocation(prog, 'u_color');
                p.u_depth    = gl.getUniformLocation(prog, 'u_depth');
                p.a_position = gl.getAttribLocation(prog, 'a_position');

                progPost1 = p;
            });

        // -----------------------------------------------------------------
        // Create/configure framebuffer between "copy" and "deferred" stages
        // -----------------------------------------------------------------

        pass_copy.fbo = gl.createFramebuffer();
        pass_copy.depthTex = createAndBindDepthTargetTexture(pass_copy.fbo);

        pass_copy.gbufs = [];
        var attachments = [];
        for (var i = 0; i < NUM_GBUFFERS; i++) {
            var attachment = gl_draw_buffers['COLOR_ATTACHMENT' + i + '_WEBGL'];
            var tex = createAndBindColorTargetTexture(pass_copy.fbo, attachment);
            pass_copy.gbufs.push(tex);
            attachments.push(attachment);
        }

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            abort('framebuffer incomplete');
        }
        gl_draw_buffers.drawBuffersWEBGL(attachments);

        // ------------------------------------------------------------------
        // Create/configure framebuffer between "deferred" and "post1" stages
        // ------------------------------------------------------------------

        pass_post1.fbo = gl.createFramebuffer();
        pass_post1.depthTex = createAndBindDepthTargetTexture(pass_post1.fbo);

        pass_post1.colorTex = createAndBindColorTargetTexture(
            pass_post1.fbo, gl_draw_buffers.COLOR_ATTACHMENT0_WEBGL);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            abort('framebuffer incomplete');
        }
        gl_draw_buffers.drawBuffersWEBGL([gl_draw_buffers.COLOR_ATTACHMENT0_WEBGL]);
    };

    var render = function(state) {
        if (!progPost1 || !progDeferred || !progClear) {
            return;
        }

        // ---------------------
        // Render into g-buffers
        // ---------------------

        gl.bindFramebuffer(gl.FRAMEBUFFER, pass_copy.fbo);

        // Clear the framebuffer
        gl.useProgram(progClear.prog);
        renderFullScreenQuad(progClear);
        gl.clearDepth(1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        gl.useProgram(progCopy.prog);
        gl.uniformMatrix4fv(progCopy.u_cameraMat, false, state.cameraMat);

        for (var i = 0; i < state.models.length; i++) {
            var m = state.models[i];

            if (m.albedo !== -1) {
                gl.uniform1i(progCopy.u_albedo, m.albedo);
            }
            if (m.bump !== -1) {
                gl.uniform1i(progCopy.u_bump, m.bump);
            }

            gl.enableVertexAttribArray(progCopy.a_position);
            gl.bindBuffer(gl.ARRAY_BUFFER, m.position);
            gl.vertexAttribPointer(progCopy.a_position, 3, gl.FLOAT, false, 0, 0);

            if (progCopy.a_normal !== -1) {
                gl.enableVertexAttribArray(progCopy.a_normal);
                gl.bindBuffer(gl.ARRAY_BUFFER, m.normal);
                gl.vertexAttribPointer(progCopy.a_normal, 3, gl.FLOAT, false, 0, 0);
            }
            if (progCopy.a_uv !== -1) {
                gl.enableVertexAttribArray(progCopy.a_uv);
                gl.bindBuffer(gl.ARRAY_BUFFER, m.uv);
                gl.vertexAttribPointer(progCopy.a_uv, 2, gl.FLOAT, false, 0, 0);
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idx);
            gl.drawElements(gl.TRIANGLES, m.elemCount, gl.UNSIGNED_INT, 0);

            gl.bindBuffer(gl.ARRAY_BUFFER, null);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // ------------------------
        // Perform deferred shading
        // ------------------------

        gl.clearColor(0.66, 0.73, 1.0, 1.0);
        gl.clearDepth(1.0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(progDeferred.prog);

        // Bind all of the g-buffers as texture inputs
        for (var i = 0; i < NUM_GBUFFERS; i++) {
            gl.activeTexture(gl['TEXTURE' + i]);
            gl.bindTexture(gl.TEXTURE_2D, pass_copy.gbufs[i]);
            gl.uniform1i(progDeferred.u_gbuf[i], i);
        }
        // Bind the depth texture as an input
        gl.activeTexture(gl['TEXTURE' + NUM_GBUFFERS]);
        gl.bindTexture(gl.TEXTURE_2D, pass_copy.depthTex);

        gl.uniform1i(progDeferred.u_depth, NUM_GBUFFERS);
        renderFullScreenQuad(progDeferred);

        for (var i = 0; i < NUM_GBUFFERS; i++) {
            gl.activeTexture(gl['TEXTURE' + i]);
            gl.bindTexture(gl.TEXTURE_2D, null);
        }
        gl.activeTexture(gl['TEXTURE' + NUM_GBUFFERS]);
        gl.bindTexture(gl.TEXTURE_2D, null);

        gl.useProgram(null);
    };

    window.Render = {};
    window.Render.setup = setup;
    window.Render.render = render;
})();
