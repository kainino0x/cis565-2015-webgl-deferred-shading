#version 100
precision highp float;
precision highp int;

#define NUM_GBUFFERS 4

uniform vec3 u_lightCol;
uniform vec3 u_lightPos;
uniform sampler2D u_gbufs[NUM_GBUFFERS];
uniform sampler2D u_depth;

varying vec2 v_uv;

vec3 applyNormalMap(vec3 geomnor, vec3 normap) {
    normap = normap * 2.0 - 1.0;
    vec3 up = normalize(vec3(0.001, 1, 0.001));
    vec3 surftan = normalize(cross(geomnor, up));
    vec3 surfbinor = cross(geomnor, surftan);
    return normap.y * surftan + normap.x * surfbinor + normap.z * geomnor;
}

void main() {
    // Load properties from the g-buffers
    // TODO: optimize g-buffers
    vec4 gb0 = texture2D(u_gbufs[0], v_uv);
    vec4 gb1 = texture2D(u_gbufs[1], v_uv);
    vec4 gb2 = texture2D(u_gbufs[2], v_uv);
    vec4 gb3 = texture2D(u_gbufs[3], v_uv);
    float depth = texture2D(u_depth, v_uv).x;
    vec3 pos = gb0.xyz;
    vec3 geomnor = normalize(gb1.xyz);
    vec3 colmap = gb2.xyz;
    vec3 normap = gb3.xyz;
    vec3 nor = applyNormalMap(geomnor, normap);
    // ----

    if (depth == 1.0) {
        gl_FragColor = vec4(0, 0, 0, 0); // set alpha to 0
        return;
    }

    gl_FragColor = vec4(0, 0, 1, 1);  // blue
    // TODO

    //diff += u_lightCol[i] * dot(nor, u_lightPos[i] - pos);
    vec3 lightdiff = u_lightPos - pos;
    float lightdist = length(lightdiff);
    vec3 lightdir = lightdiff / lightdist;
    vec3 diff = u_lightCol * max(0.0, dot(nor, lightdir)) * max(0.0, 4.0 - lightdist);
    gl_FragColor = vec4(colmap * diff, 1.0);
}
