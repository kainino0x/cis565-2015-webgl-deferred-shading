#version 100
#extension GL_EXT_draw_buffers: enable
precision highp float;
precision highp int;

uniform sampler2D u_albedo;
uniform sampler2D u_bump;

varying vec3 v_position;
varying vec3 v_normal;
varying vec2 v_uv;

void main() {
    // model-view position
    gl_FragData[0] = vec4(v_position, 1.0);
    // normal
    gl_FragData[1] = vec4(v_normal, 0.0);
    // albedo
    gl_FragData[2] = texture2D(u_albedo, v_uv);
    // bump
    gl_FragData[3] = texture2D(u_bump, v_uv);
}
