#version 100
precision highp float;
precision highp int;

uniform sampler2D u_gbuf[4];
uniform sampler2D u_depth;

varying vec2 v_uv;

void main() {
    gl_FragColor = vec4(abs(texture2D(u_gbuf[0], v_uv).xyz), 1.0);
}
