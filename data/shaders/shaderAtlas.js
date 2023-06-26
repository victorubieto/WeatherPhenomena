//import glsl from 'glslify';//'https://cdn.jsdelivr.net/npm/babel-plugin-glslify@2.0.0/glslify-babel.min.js';

export const basic_vs = /* glsl */ `
    void main() {
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0);
    }
`;

export const flat_fs = /* glsl */ `
    void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
`;