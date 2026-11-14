
const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const backupDir = path.resolve(
  __dirname,
  "../../../database/backups"
);


const runPgDump = (args, outputPath) => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);

    const pgDump = spawn(
      process.env.PG_DUMP_PATH || "pg_dump",
      args,
      {
        env: {
          ...process.env,
          PGPASSWORD: process.env.DB_PASSWORD,
        },
        windowsHide: true,
      }
    );

    let errorMessage = "";
    let processClosed = false;
    let outputFinished = false;
    let settled = false;
    let exitCode = null;

    const fail = (error) => {
      if (settled) return;
      settled = true;

      output.destroy();
      fs.rmSync(outputPath, { force: true });
      reject(error);
    };

    const completeIfReady = () => {
      if (settled || !processClosed || !outputFinished) return;

      if (exitCode === 0) {
        settled = true;
        resolve();
      } else {
        fail(
          new Error(errorMessage || `pg_dump exit code ${exitCode}`)
        );
      }
    };

    pgDump.stderr.on("data", (data) => {
      errorMessage += data.toString();
    });

    pgDump.stdout.pipe(output);

    output.on("finish", () => {
      outputFinished = true;
      completeIfReady();
    });

    output.on("error", fail);

    pgDump.on("error", fail);

    pgDump.on("close", (code) => {
      processClosed = true;
      exitCode = code;
      completeIfReady();
    });
  });
};

class BackupService {
  async createBackup() {
    const {
      DB_HOST = "127.0.0.1",
      DB_PORT = "5432",
      DB_USER,
      DB_PASSWORD,
      DB_NAME,
    } = process.env;

    if (!DB_USER || !DB_PASSWORD || !DB_NAME) {
      throw new Error("Konfigurasi database belum lengkap.");
    }

    fs.mkdirSync(backupDir, { recursive: true });

    const timestamp = new Date()
      .toISOString()
      .replace(/[-:]/g, "")
      .replace("T", "_")
      .replace(/\..+/, "")
      .replace("Z", "");

    const prefix = `kalawa_manual_backup_${timestamp}`;

    const sqlPath = path.join(backupDir, `${prefix}.sql`);
    const dumpPath = path.join(backupDir, `${prefix}.dump`);

    const commonArgs = [
      "-h", DB_HOST,
      "-p", String(DB_PORT),
      "-U", DB_USER,
      "-d", DB_NAME,
      "--no-owner",
      "--no-privileges",
    ];

    try {
      await runPgDump(
        [...commonArgs, "-Fp"],
        sqlPath
      );

      await runPgDump(
        [...commonArgs, "-Fc"],
        dumpPath
      );

      return {
        message: "Backup berhasil dibuat.",
        files: [
          path.basename(sqlPath),
          path.basename(dumpPath),
        ],
      };
    } catch (error) {
      fs.rmSync(sqlPath, { force: true });
      fs.rmSync(dumpPath, { force: true });
      throw error;
    }
  }
}

module.exports = new BackupService();
