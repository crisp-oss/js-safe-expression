/*
 * This file is part of js-safe-expression
 *
 * Copyright (c) 2025 Crisp IM SAS
 * All rights belong to Crisp IM SAS
 */

/**************************************************************************
 * IMPORTS
 ***************************************************************************/

// NPM

import commonjs from "@rollup/plugin-commonjs";
import resolve from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";

// Common plugins configuration
const basePlugins = [
  // Resolve dependencies
  resolve({
    browser: true
  }),

  // Convert CommonJS modules
  commonjs(),

  // Minify and enable tree shaking
  terser({
    compress: {
      passes: 2,
      dead_code: true,
      drop_console: true
    },
    format: {
      comments: false
    }
  })
];

// Build configurations for different formats
export default [
  // IIFE build (for direct browser usage)
  {
    input: "src/index.js",
    output: {
      file: "dist/index.iife.js",
      format: "iife",
      name: '$ParseProvider',
      sourcemap: true
    },
    plugins: basePlugins
  },

  // ESM build (for modern bundlers)
  {
    input: "src/index.js",
    output: {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true
    },
    plugins: basePlugins
  },

  // CommonJS build (for Node.js)
  {
    input: "src/index.js",
    output: {
      file: "dist/index.cjs.js",
      format: "cjs",
      sourcemap: true
    },
    plugins: basePlugins
  }
]; 