window.abort = (function() {
    'use strict';
    var first = false;

    return function(s) {
        var m = 'Fatal error: ' + s;
        if (!first) {
            $('#alertcontainer').css('display', 'block');
            first = true;
            $('#alerttext').text(m);
        }
        throw m;
    };
})();

window.loadTexture = (function() {
    'use strict';

    var handleTextureLoaded = function(img, tex) {
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };

    return function(url) {
        return new Promise(function(resolve){
            var prom = Promise.resolve();

            var tex = gl.createTexture();
            var img = new Image();
            img.onload = function() {
                handleTextureLoaded(img, tex);
                resolve(tex);
            };
            img.src = url;
        });
    };
})();

window.loadShaderProgram = (function() {
    'use strict';

    var compileShader = function(gl, shaderSource, shaderType) {
        var shader = gl.createShader(shaderType);
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error(shaderSource);
            abort('shader compiler error:\n' + gl.getShaderInfoLog(shader));
        }

        return shader;
    };

    var linkShader = function(gl, vs, fs) {
        var prog = gl.createProgram();
        gl.attachShader(prog, vs);
        gl.attachShader(prog, fs);
        gl.linkProgram(prog);
        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            abort('shader linker error:\n' + gl.getProgramInfoLog(prog));
        }
        return prog;
    };

    return function(gl, urlVS, urlFS) {
        return Promise.all([$.get(urlVS), $.get(urlFS)])
            .then(function(results) {
                var vs = results[0], fs = results[1];
                vs = compileShader(gl, vs, gl.VERTEX_SHADER);
                fs = compileShader(gl, fs, gl.FRAGMENT_SHADER);
                return linkShader(gl, vs, fs);
            });
    };
})();

window.createAndBindDepthTargetTexture = function(fbo) {
    'use strict';
    var depthTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, depthTex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(
        gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0,
        gl.DEPTH_COMPONENT, gl.UNSIGNED_SHORT, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(
        gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTex, 0);

    return depthTex;
};

window.createAndBindColorTargetTexture = function(fbo, attachment) {
    'use strict';
    var tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, attachment, gl.TEXTURE_2D, tex, 0);

    return tex;
};

window.renderFullScreenQuad = (function() {
    'use strict';
    var positions = new Float32Array([
        -1.0, -1.0, 0.0,
        1.0, -1.0, 0.0,
        -1.0, 1.0, 0.0,
        1.0, 1.0, 0.0
    ]);

    var vbo = null;

    var init = function() {
        vbo = gl.createBuffer();

        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    };

    return function(prog) {
        if (!vbo) {
            init();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.enableVertexAttribArray(prog.a_position);
        gl.vertexAttribPointer(prog.a_position, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    };
})();

window.loadModel = function(obj, callback) {
    'use strict';

    var onProgress = function(xhr) {
        if (xhr.lengthComputable) {
            var percentComplete = xhr.loaded / xhr.total * 100;
            console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
    };

    var onError = function(xhr) {
        console.log("Failed to load model");
    };

    var loader = new THREE.OBJLoader();
    loader.load(obj, callback, onProgress, onError);
};

window.readyModelForDraw = function(prog, m) {
    gl.useProgram(prog.prog);

    if (m.colmap) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, m.colmap);
        gl.uniform1i(prog.u_colmap, 0);
    }
    if (m.normap) {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, m.normap);
        gl.uniform1i(prog.u_normap, 1);
    }

    gl.enableVertexAttribArray(prog.a_position);
    gl.bindBuffer(gl.ARRAY_BUFFER, m.position);
    gl.vertexAttribPointer(prog.a_position, 3, gl.FLOAT, false, 0, 0);

    if (prog.a_normal !== -1 && m.normal) {
        gl.enableVertexAttribArray(prog.a_normal);
        gl.bindBuffer(gl.ARRAY_BUFFER, m.normal);
        gl.vertexAttribPointer(prog.a_normal, 3, gl.FLOAT, false, 0, 0);
    }
    if (prog.a_uv !== -1 && m.uv) {
        gl.enableVertexAttribArray(prog.a_uv);
        gl.bindBuffer(gl.ARRAY_BUFFER, m.uv);
        gl.vertexAttribPointer(prog.a_uv, 2, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idx);
};

window.drawReadyModel = function(m) {
    gl.drawElements(gl.TRIANGLES, m.elemCount, gl.UNSIGNED_INT, 0);
};

window.abortIfFramebufferIncomplete = function(fbo) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    var fbstatus = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
    if (fbstatus !== gl.FRAMEBUFFER_COMPLETE) {
        abort('framebuffer incomplete: ' + WebGLDebugUtils.glEnumToString(fbstatus));
    }
};

window.downloadCanvas = (function() {
    var downloadURI = function(uri, name) {
        var link = document.createElement('a');
        link.download = name;
        link.href = uri;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return function() {
        var canvas = document.getElementById('canvas');
        var time = Date.now();
        var img = canvas.toDataURL('image/png');
        downloadURI(img, 'deferred-' + time + '.png');
    };
})();
