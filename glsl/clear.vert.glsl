#version 100
precision highp float;
precision highp int;

attribute vec3 a_position;

void main() {
    gl_Position = vec4(a_position, 1.0);
}
