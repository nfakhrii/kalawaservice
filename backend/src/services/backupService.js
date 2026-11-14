
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

const runPgDumpAll = (args, outputPath) => {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(outputPath);

    const child = spawn(
      process.env.PG_DUMPALL_PATH || "pg_dumpall",
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
          new Error(
            errorMessage || `pg_dumpall exit code ${exitCode}`
          )
        );
      }
    };

    child.stderr.on("data", (data) => {
      errorMessage += data.toString();
    });

    child.on("error", fail);

    output.on("error", fail);

    child.stdout.pipe(output);

    output.on("finish", () => {
      outputFinished = true;
      completeIfReady();
    });

    child.on("close", (code) => {
      processClosed = true;
      exitCode = code;
      completeIfReady();
    });
  });
};

const runPgRestore = (args) => {
  return new Promise((resolve, reject) => {
    const pgRestore = spawn(
      process.env.PG_RESTORE_PATH || "pg_restore",
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

    pgRestore.stderr.on("data", (data) => {
      errorMessage += data.toString();
    });

    pgRestore.on("error", (error) => {
      reject(error);
    });

    pgRestore.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            errorMessage || `pg_restore exit code ${code}`
          )
        );
      }
    });
  });
};

class BackupService {
  async createBackup({ type = "manual" } = {}) {
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

      const backupPrefix = {
        manual: "kalawa_manual_backup",
        pre_recovery: "kalawa_pre_recovery_backup",
      };
      
      const selectedPrefix = backupPrefix[type];
      
      if (!selectedPrefix) {
        throw new Error("Jenis backup tidak valid.");
      }
      
      const prefix = `${selectedPrefix}_${timestamp}`;

    const sqlPath = path.join(backupDir, `${prefix}.sql`);
    const dumpPath = path.join(backupDir, `${prefix}.dump`);
    const globalsPath = path.join(
      backupDir,
      `${prefix}_globals.sql`
    );

    const commonArgs = [
      "-h", DB_HOST,
      "-p", String(DB_PORT),
      "-U", DB_USER,
      "-d", DB_NAME,
    ];

    try {
      // Backup konfigurasi global PostgreSQL (roles dan membership).
      await runPgDumpAll(
        [
          "-h", DB_HOST,
          "-p", String(DB_PORT),
          "-U", DB_USER,
          "--globals-only",
        ],
        globalsPath
      );
    
      // Backup database dalam format SQL.
      await runPgDump(
        [...commonArgs, "-Fp"],
        sqlPath
      );
    
      // Backup database dalam format Custom.
      await runPgDump(
        [...commonArgs, "-Fc"],
        dumpPath
      );

      return {
        message: "Backup berhasil dibuat.",
        files: [
          path.basename(sqlPath),
          path.basename(dumpPath),
          path.basename(globalsPath),
        ],
      };
    } catch (error) {
      fs.rmSync(sqlPath, { force: true });
      fs.rmSync(dumpPath, { force: true });
      fs.rmSync(globalsPath, { force: true });
      throw error;
    }
  }

  async restoreBackup(filename) {
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
  
    // Validasi nama file backup.
    if (
      typeof filename !== "string" ||
      !/^[a-zA-Z0-9_-]+\.dump$/.test(filename)
    ) {
      throw new Error("Nama file backup tidak valid.");
    }
  
    const dumpPath = path.resolve(backupDir, filename);
  
    // Pastikan file berada di direktori backup.
    if (path.dirname(dumpPath) !== path.resolve(backupDir)) {
      throw new Error("Lokasi file backup tidak valid.");
    }
  
    if (!fs.existsSync(dumpPath)) {
      throw new Error("File backup tidak ditemukan.");
    }
  
    if (!fs.statSync(dumpPath).isFile()) {
      throw new Error("File backup bukan file yang valid.");
    }
  
    const args = [
      "-h", DB_HOST,
      "-p", String(DB_PORT),
      "-U", DB_USER,
      "--clean",
      "--if-exists",
      "--no-owner",
      "--exit-on-error",
      "-d", DB_NAME,
      dumpPath,
    ];
  
    const safetyBackup = await this.createBackup({
      type: "pre_recovery",
    });
    
    // Jalankan recovery ke database utama.
    await runPgRestore(args);

    return {
      message: `Database utama ${DB_NAME} berhasil dipulihkan.`,
      data: {
        backupFile: filename,
        database: DB_NAME,
        safetyBackupFiles: safetyBackup.files,
      },
    };
  }
}

module.exports = new BackupService();
