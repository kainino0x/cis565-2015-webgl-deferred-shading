window.abort = (function() {
    'use strict';
    var first = false;

    var f = function(s) {
        var m = 'fatal error: ' + s;
        console.error(m);
        if (!first) {
            first = true;
            alert('Fatal error! (see console)');
        }
        throw m;
    };

    return f;
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

    var f = function(gl, urlVS, urlFS) {
        return Promise.all([$.get(urlVS), $.get(urlFS)])
            .then(function(results) {
                var vs = results[0], fs = results[1];
                vs = compileShader(gl, vs, gl.VERTEX_SHADER);
                fs = compileShader(gl, fs, gl.FRAGMENT_SHADER);
                return linkShader(gl, vs, fs);
            });
    };

    return f;
})();

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

    var f = function(prog) {
        if (!vbo) {
            init();
        }
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.enableVertexAttribArray(prog.a_position);
        gl.vertexAttribPointer(prog.a_position, 3, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    };

    return f;
})();

/*
var threeTextureToWebGL = function(texture) {
    var t = gl.createTexture();
    texture.__webglInit = false;
    texture.__webglTexture = t;

    gl.bindTexture(gl.TEXTURE_2D, texture.__webglTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texture.magFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texture.minFilter);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, texture.wrapS);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, texture.wrapT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.FLOAT, null);
    gl.bindTexture(gl.TEXTURE_2D, null);

    return t;
};
*/
