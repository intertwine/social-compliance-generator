import fs from "fs";

const getCWD = () => {
  return process.cwd();
};

const listCWDFiles = () => {
  return fs.readdirSync(getCWD());
};

const logFSInfo = () => {
  console.debug("Current working directory:", getCWD());
  console.debug("Files in current working directory:", listCWDFiles());
};

export { getCWD, listCWDFiles, logFSInfo };