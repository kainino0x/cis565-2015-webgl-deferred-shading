#version 100
precision highp float;
precision highp int;

uniform int u_debug;
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
    vec3 colmap = gb2.xyz;
    vec3 normap = gb3.xyz;

    if (u_debug != 0) {
        if (u_debug == 1) {
            gl_FragColor = vec4(vec3(depth), 1.0);
        } else if (u_debug == 2) {
            gl_FragColor = vec4(abs(pos) * 0.1, 1.0);
        } else if (u_debug == 3) {
            gl_FragColor = vec4(abs(nor), 1.0);
        } else if (u_debug == 4) {
            gl_FragColor = vec4(colmap, 1.0);
        } else if (u_debug == 5) {
            gl_FragColor = vec4(normap, 1.0);
        }
        return;
    }

    gl_FragColor = vec4(1, 0, 1, 1);  // magenta
}
