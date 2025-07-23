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
export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/js-safe-expression.cjs.js',
      format: 'cjs',
      exports: 'named'
    },
    {
      file: 'dist/js-safe-expression.esm.js',
      format: 'es'
    },
    {
      file: 'dist/js-safe-expression.iife.js',
      format: 'iife',
      name: 'jsSafeExpression',
      exports: 'named'
    }
  ]
}; 