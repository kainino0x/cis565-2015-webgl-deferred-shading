#version 100
precision highp float;
precision highp int;

uniform sampler2D u_color;
uniform sampler2D u_depth;

varying vec2 v_uv;

void main() {
    vec4 color = texture2D(u_color, v_uv);
    float depth = texture2D(u_depth, v_uv).x;
    gl_FragColor = color;
}
