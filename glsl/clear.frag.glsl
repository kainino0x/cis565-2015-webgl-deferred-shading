#version 100
#extension GL_EXT_draw_buffers: enable
precision highp float;
precision highp int;

void main() {
    gl_FragData[0] = vec4(0.0);
    gl_FragData[1] = vec4(0.0);
    gl_FragData[2] = vec4(0.0);
    gl_FragData[3] = vec4(0.0);
}
