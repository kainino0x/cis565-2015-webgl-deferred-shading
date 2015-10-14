#version 100
precision highp float;
precision highp int;

uniform sampler2D u_gbuf[4];
uniform sampler2D u_depth;

varying vec2 v_uv;

void main() {
    vec4 gb0 = texture2D(u_gbuf[0], v_uv);
    vec4 gb1 = texture2D(u_gbuf[1], v_uv);
    vec4 gb2 = texture2D(u_gbuf[2], v_uv);
    vec4 gb3 = texture2D(u_gbuf[3], v_uv);
    float depth = texture2D(u_depth, v_uv).x;

    vec3 pos = gb0.xyz;
    vec3 nor = gb1.xyz;
    vec3 alb = gb2.xyz;

    gl_FragColor = vec4(abs(nor), 1.0);
}
