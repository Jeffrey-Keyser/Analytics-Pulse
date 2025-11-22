import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import { defineConfig } from 'rollup';
import filesize from 'rollup-plugin-filesize';
import { readFileSync } from 'fs';

// Read version from package.json
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));
const version = pkg.version;
const year = new Date().getFullYear();

// Banner for all builds
const banner = `/*!
 * Analytics Pulse v${version}
 * (c) ${year} Analytics Pulse
 * Released under the MIT License
 * https://github.com/Jeffrey-Keyser/Analytics-Pulse
 */`;

export default defineConfig([
  // UMD build for browser <script> tags (unminified)
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/analytics-pulse.js',
      format: 'umd',
      name: 'AnalyticsPulse',
      sourcemap: true,
      banner,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
      filesize({
        showMinifiedSize: true,
        showGzippedSize: true,
      }),
    ],
  },
  // UMD build minified for production
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/analytics-pulse.min.js',
      format: 'umd',
      name: 'AnalyticsPulse',
      sourcemap: true,
      banner,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
      terser({
        compress: {
          drop_console: false, // Keep console for debugging
          passes: 2, // Run compression multiple times
          pure_getters: true,
          unsafe: false,
        },
        mangle: {
          properties: false, // Don't mangle property names
        },
        format: {
          comments: /^!/,  // Keep banner comments
          preamble: banner,
        },
      }),
      filesize({
        showMinifiedSize: true,
        showGzippedSize: true,
      }),
    ],
  },
  // ESM build for modern bundlers
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/analytics-pulse.esm.js',
      format: 'es',
      sourcemap: true,
      banner,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: true,
        declarationDir: 'dist',
      }),
      filesize({
        showMinifiedSize: true,
        showGzippedSize: true,
      }),
    ],
  },
  // CommonJS build for Node.js
  {
    input: 'src/index.ts',
    output: {
      file: 'dist/analytics-pulse.cjs.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'named',
      banner,
    },
    plugins: [
      typescript({
        tsconfig: './tsconfig.json',
        declaration: false,
        declarationMap: false,
      }),
      filesize({
        showMinifiedSize: true,
        showGzippedSize: true,
      }),
    ],
  },
]);
