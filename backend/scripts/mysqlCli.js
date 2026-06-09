import fs from "fs";
import path from "path";

const executableNames = (name) => process.platform === "win32" ? [`${name}.exe`, name] : [name];

const candidateDirectories = () => {
  const directories = [
    process.env.MYSQL_BIN_DIR,
    process.env.MYSQL_HOME ? path.join(process.env.MYSQL_HOME, "bin") : null,
  ];

  if (process.platform === "win32") {
    const programFiles = [
      process.env.ProgramFiles,
      process.env["ProgramFiles(x86)"],
    ].filter(Boolean);

    for (const baseDir of programFiles) {
      const mysqlDir = path.join(baseDir, "MySQL");
      if (!fs.existsSync(mysqlDir)) continue;

      for (const entry of fs.readdirSync(mysqlDir, { withFileTypes: true })) {
        if (entry.isDirectory() && entry.name.toLowerCase().startsWith("mysql server")) {
          directories.push(path.join(mysqlDir, entry.name, "bin"));
        }
      }
    }
  }

  return directories.filter(Boolean);
};

const findInPath = (name) => {
  const pathValue = process.env.PATH || "";
  for (const directory of pathValue.split(path.delimiter)) {
    for (const executableName of executableNames(name)) {
      const fullPath = path.join(directory, executableName);
      if (fs.existsSync(fullPath)) return fullPath;
    }
  }
  return null;
};

export const findMysqlExecutable = (name, explicitPath) => {
  if (explicitPath && fs.existsSync(explicitPath)) return explicitPath;

  const pathMatch = findInPath(name);
  if (pathMatch) return pathMatch;

  for (const directory of candidateDirectories()) {
    for (const executableName of executableNames(name)) {
      const fullPath = path.join(directory, executableName);
      if (fs.existsSync(fullPath)) return fullPath;
    }
  }

  return name;
};
