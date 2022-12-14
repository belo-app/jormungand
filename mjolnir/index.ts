import cac from "cac";

import { buildCommand } from "./build";

export const start = () => {
  const cli = cac("mjolnir");

  cli
    .command("build <dir>", "")
    .option("-m, --minify", "")
    .option("-t, --target", "")
    .option("-b, --bundle", "")
    .action(buildCommand);

  cli.help();

  cli.parse();
};
