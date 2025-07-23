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

  // Minify and enable tree shaking
  terser({
    compress: {
      passes: 3,
      dead_code: true,
      drop_console: true,
      pure_getters: true,
      unsafe: true,
      unsafe_comps: true,
      unsafe_math: true,
      unsafe_methods: true
    },
    mangle: {
      properties: {
        reserved: [
          // Public API methods
          'parse', 'execute',

          // Expression result properties
          'type', 'value', 'computed', 'optional',
          // Operator methods
          'unary+', 'unary-', 'unary!',
          'binary+', 'binary-', 'binary*', 'binary/', 'binary%',
          'binary===', 'binary!==', 'binary==', 'binary!=',
          'binary<', 'binary>', 'binary<=', 'binary>=',
          'binary&&', 'binary||',
          'ternary?:'
        ]
      }
    },
    format: {
      comments: false
    },
    sourceMap: true
  })
];

// Build configurations for different formats
export default {
  input: 'src/index.js',
  output: [
    {
      file: 'dist/js-safe-expression.cjs.js',
      format: 'cjs',
      exports: 'named',
      plugins: basePlugins,
      sourcemap: true
    },
    {
      file: 'dist/js-safe-expression.esm.js',
      format: 'es',
      plugins: basePlugins,
      sourcemap: true
    },
    {
      file: 'dist/js-safe-expression.iife.js',
      format: 'iife',
      name: 'jsSafeExpression',
      exports: 'named',
      plugins: basePlugins,
      sourcemap: true
    }
  ]
}; 