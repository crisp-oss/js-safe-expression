/*
 * This file is part of crisp-library-client
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
import { visualizer } from "rollup-plugin-visualizer";

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
    plugins: [
      ...basePlugins,
      visualizer({
        filename: "stats-iife.html",
        title: "Crisp Client IIFE Bundle Analysis",
        gzipSize: true,
        brotliSize: true
      })
    ],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false
    }
  },

  // ESM build (for modern bundlers)
  {
    input: "src/index.js",
    output: {
      file: "dist/index.esm.js",
      format: "esm",
      sourcemap: true
    },
    plugins: [
      ...basePlugins,
      visualizer({
        filename: "stats-esm.html",
        title: "Index ESM Bundle Analysis",
        gzipSize: true,
        brotliSize: true
      })
    ],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false
    }
  },

  // CommonJS build (for Node.js)
  {
    input: "src/index.js",
    output: {
      file: "dist/index.cjs.js",
      format: "cjs",
      sourcemap: true
    },
    plugins: [
      ...basePlugins,
      visualizer({
        filename: "stats-cjs.html",
        title: "Index CJS Bundle Analysis",
        gzipSize: true,
        brotliSize: true
      })
    ],
    treeshake: {
      moduleSideEffects: false,
      propertyReadSideEffects: false
    }
  }
]; 