// vite.config.js
export default {
  build: {
    assetsDir: '.',
  },
  experimental: {
    // Super simple setup: everything in the same dir with relative paths in src.
    renderBuiltUrl(filename) {
      return filename;
    },
  },
};
