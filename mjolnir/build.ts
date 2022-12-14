import * as swc from "@swc/core";
import esbuild from "esbuild";
import { readFile, rm, writeFile } from "fs/promises";
import { globby } from "globby";
import mkdirp from "mkdirp";
import path from "path";

const swcConfig: swc.Options = {
  env: {
    targets: {
      node: "18",
    },
  },
  jsc: {
    parser: {
      syntax: "typescript",
      decorators: true,
    },
    transform: {
      legacyDecorator: true,
      decoratorMetadata: true,
    },
    target: "es2022",
    keepClassNames: true,
    externalHelpers: false,
  },
  module: {
    type: "commonjs",
  },
  minify: false,
  sourceMaps: "inline",
};

const esbuildConfig: esbuild.BuildOptions = {
  keepNames: true,
  platform: "node",
  minify: false,
  target: "node18",
  format: "cjs",
  bundle: false,
};

export type Options = Partial<{
  minify: boolean;
  target: swc.JscTarget;
  bundle: boolean;
  resolveDir: string;
}>;

export const swcTransform = (
  code: string,
  _codePath: string,
  options: Options = {}
) => {
  const config = { ...swcConfig };

  config.minify = options.minify ?? config.minify;

  if (config.jsc?.target) {
    config.jsc.target = options.target ?? config.jsc.target;
  }

  return swc.transform(code, config);
};
export const swcTransformSync = (
  code: string,
  _codePath: string,
  options: Options = {}
) => {
  const config = { ...swcConfig };

  config.minify = options.minify ?? config.minify;

  if (config.jsc?.target) {
    config.jsc.target = options.target ?? config.jsc.target;
  }

  return swc.transformSync(code, config);
};

export const esbuildTransform = (
  code: string,
  codePath: string,
  options: Options = {}
) => {
  const config = { ...esbuildConfig };

  config.minify = options.minify ?? config.minify;
  config.target = options.target ?? config.target;
  config.bundle = options.bundle ?? config.bundle;

  return esbuild.build({
    stdin: {
      contents: code,
      loader: "js",
      resolveDir: path.dirname(codePath),
      sourcefile: path.basename(codePath),
    },
    write: false,
    ...config,
  });
};
export const esbuildTransformSync = (
  code: string,
  codePath: string,
  options: Options = {}
) => {
  const config = { ...esbuildConfig };

  config.minify = options.minify ?? config.minify;
  config.target = options.target ?? config.target;
  config.bundle = options.bundle ?? config.bundle;

  return esbuild.buildSync({
    stdin: {
      contents: code,
      loader: "js",
      resolveDir: path.dirname(codePath),
      sourcefile: path.basename(codePath),
    },
    write: false,
    ...config,
  });
};

export const buildCommand = async (
  directory: string,
  options: Options = {}
) => {
  const rootPath = path.resolve(process.cwd());
  const directoryPath = path.join(rootPath, directory);
  const files = path.join(directoryPath, "**", "*.ts");
  const outDirectory = path.join(rootPath, "dist");

  await rm(outDirectory, { recursive: true, force: true });
  await mkdirp(outDirectory);

  const filePaths = await globby(files);

  await Promise.all(
    filePaths.map(async (filePath) => {
      const code = await readFile(filePath, "utf8");

      const swcResult = await swcTransform(code, filePath, options);
      const esbuildResult = await esbuildTransform(
        swcResult.code,
        filePath,
        options
      );

      const extension = path.extname(filePath);
      const fileName = path.basename(filePath);
      const filePrefix = filePath
        .replace(directoryPath, "")
        .replace(fileName, "");
      const outDirectoryPath = path.join(
        outDirectory,
        filePrefix,
        fileName.replace(extension, ".js")
      );

      await mkdirp(path.join(outDirectory, filePrefix));

      return writeFile(
        outDirectoryPath,
        esbuildResult.outputFiles?.[0]?.contents as any
      );
    })
  ).catch((error) => console.error(error));
};
