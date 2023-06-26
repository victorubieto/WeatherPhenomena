varying vec2 vUv;
varying vec3 worldNormal;

uniform sampler2D u_textures[6];
uniform vec2 u_resolution;
uniform float u_ior;

void main() {
    // get screen coordinates
	vec2 uv = gl_FragCoord.xy / u_resolution;
    // vec2 uv = gl_FragCoord.xy * u_iRes;
    // vec4 screen_pos = vec4((uv.x*2.0-1.0), uv.y*2.0-1.0, 0.0, 1.0);
    // vec4 proj_worldpos = u_inverse_viewprojection * screen_pos;
    // vec3 worldpos = proj_worldpos.xyz / proj_worldpos.w;

    vec3 normal = worldNormal;
	// calculate refraction and add to the screen coordinates
	vec3 refracted = refract(vec3(0.0,0.0,-1.0), normal, 1.0/u_ior);
	//uv += refracted.xy;

    //gl_FragColor = vec4(refracted, 1.0);
    //gl_FragColor = vec4(uv, 0.0, 0.5);
    gl_FragColor = vec4(texture2D( u_textures[1], uv ).rgb, 1.0);
}