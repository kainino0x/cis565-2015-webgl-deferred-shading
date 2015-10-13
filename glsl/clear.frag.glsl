#version 100
#extension GL_EXT_draw_buffers: enable
precision highp float;
precision highp int;

void main() {
    // normal
    gl_FragData[0] = vec4(0.0);
    // model-view position
    gl_FragData[1] = vec4(0.0);
    // albedo
    gl_FragData[2] = vec4(0.0);
    // bump
    gl_FragData[3] = vec4(0.0);
}
