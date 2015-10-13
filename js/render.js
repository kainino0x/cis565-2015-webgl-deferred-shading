(function() {
    'use strict';
    var fbo, depthTex, gbufs;
    var progPass, progDeferred, progClear;

    var NUM_GBUFFERS = 4;

    var setup = function() {
        console.log('setup: ' + width + ' x ' + height);

        loadShaderProgram(gl, 'glsl/pass.vert.glsl', 'glsl/pass.frag.glsl').then(
            function(prog) {
                var p = { prog: prog };

                p.u_cameraMat = gl.getUniformLocation(prog, 'u_cameraMat');
                p.u_albedo    = gl.getUniformLocation(prog, 'u_albedo');
                p.u_bump      = gl.getUniformLocation(prog, 'u_bump');
                p.a_position  = gl.getAttribLocation(prog, 'a_position');
                p.a_normal    = gl.getAttribLocation(prog, 'a_normal');
                p.a_uv        = gl.getAttribLocation(prog, 'a_uv');

                progPass = p;
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

        loadShaderProgram(gl, 'glsl/quad.vert.glsl', 'glsl/clear.frag.glsl').then(
            function(prog) {
                progClear = { prog: prog };
            });

        fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

        depthTex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, depthTex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0,
                      gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);

        gbufs = [];
        for (var i = 0; i < NUM_GBUFFERS; i++) {
            var tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
                          gl.RGBA, gl.FLOAT, null);

            gl.framebufferTexture2D(
                gl.FRAMEBUFFER, gl_draw_buffers['COLOR_ATTACHMENT' + i + '_WEBGL'],
                gl.TEXTURE_2D, tex, 0);
            gbufs.push(tex);
        }

        gl.bindTexture(gl.TEXTURE_2D, null);

        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            abort('framebuffer incomplete');
            // See http://www.khronos.org/opengles/sdk/docs/man/xhtml/glCheckFramebufferStatus.xml
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    };

    var render = function(state) {
        if (!progPass || !progDeferred || !progClear) {
            return;
        }

        // ---------------------
        // Render into g-buffers
        // ---------------------

        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

        // Clear the framebuffer
        gl.useProgram(progClear.prog);
        renderFullScreenQuad(progClear);
        gl.clearDepth(1.0);
        gl.clear(gl.DEPTH_BUFFER_BIT);

        gl.useProgram(progPass.prog);
        gl.uniformMatrix4fv(progPass.u_cameraMat, false, state.cameraMat);

        for (var i = 0; i < state.models.length; i++) {
            var m = state.models[i];

            if (m.albedo !== -1) {
                gl.uniform1i(progPass.u_albedo, m.albedo);
            }
            if (m.bump !== -1) {
                gl.uniform1i(progPass.u_bump, m.bump);
            }

            gl.enableVertexAttribArray(progPass.a_position);
            gl.bindBuffer(gl.ARRAY_BUFFER, m.position);
            gl.vertexAttribPointer(progPass.a_position, 3, gl.FLOAT, false, 0, 0);

            if (progPass.a_normal !== -1) {
                gl.enableVertexAttribArray(progPass.a_normal);
                gl.bindBuffer(gl.ARRAY_BUFFER, m.normal);
                gl.vertexAttribPointer(progPass.a_normal, 3, gl.FLOAT, false, 0, 0);
            }
            if (progPass.a_uv !== -1) {
                gl.enableVertexAttribArray(progPass.a_uv);
                gl.bindBuffer(gl.ARRAY_BUFFER, m.uv);
                gl.vertexAttribPointer(progPass.a_uv, 2, gl.FLOAT, false, 0, 0);
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
            gl.bindTexture(gl.TEXTURE_2D, gbufs[i]);
            gl.uniform1i(progDeferred.u_gbuf[i], i);
        }
        // Bind the depth texture as an input
        gl.activeTexture(gl['TEXTURE' + NUM_GBUFFERS]);
        gl.bindTexture(gl.TEXTURE_2D, depthTex);

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
