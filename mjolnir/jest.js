require("@esbuild-kit/cjs-loader");

const { esbuildTransformSync, swcTransformSync } = require("./build");

const createTransformer = (userOptions = {}) => {
  return {
    canInstrument: true,

    process(code, path, options) {
      const swcResult = swcTransformSync(code, path, options);
      const esbuildResult = esbuildTransformSync(swcResult.code, path, options);

      return {
        code: esbuildResult.outputFiles[0]?.text,
      };
    },
  };
};

module.exports = { createTransformer };
