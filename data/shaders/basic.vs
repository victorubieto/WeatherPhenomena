varying vec2 vUv;
varying vec3 worldNormal;

void main() {
    vUv = uv;
    worldNormal = normalize(modelViewMatrix * vec4(normal, 0.0)).xyz;

    gl_Position = vec4(position, 1.0);
}