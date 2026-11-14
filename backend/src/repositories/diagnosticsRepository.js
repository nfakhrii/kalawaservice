const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const AppError = require("../utils/AppError");

class DiagnosticsRepository {
  getRoleFlags() {
    const user = db.getCurrentUserContext();
    const role = String(user?.role || "").toLowerCase();

    const allowedRoles = ["owner", "auditor"];

    if (!allowedRoles.includes(role)) {
      throw new AppError(
        "Anda tidak memiliki izin untuk mengakses informasi PostgreSQL Diagnostics.",
        403,
        "FORBIDDEN_DIAGNOSTICS_ACCESS"
      );
    }

    return {
      role,
      isRestrictedCustomer: role === "auditor",
      isRestrictedWo: role === "auditor",
      canReadAuditLog: true,
    };
  }

  async getSystemInspection() {
    const { isRestrictedCustomer, isRestrictedWo, canReadAuditLog } =
      this.getRoleFlags();

    const customerSource = isRestrictedCustomer
      ? '"VW_PELANGGAN_AMAN"'
      : '"PELANGGAN"';

    const woSource = isRestrictedWo ? '"VW_WORK_ORDER_AMAN"' : '"WORK_ORDER"';

    const triggersSql = `
      SELECT
        tgname AS trigger_name,
        relname AS table_name,
        proname AS function_name
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_proc p ON p.oid = t.tgfoid
      WHERE NOT t.tgisinternal
      ORDER BY relname ASC, tgname ASC;
    `;

    const viewsSql = `
      SELECT viewname
      FROM pg_views
      WHERE schemaname = 'public'
      ORDER BY viewname ASC;
    `;

    const routinesSql = `
      SELECT
        p.proname AS routine_name,
        CASE WHEN p.prokind = 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END AS routine_type
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
      ORDER BY p.proname ASC;
    `;

    const countsSql = `
      SELECT
        (SELECT COUNT(*) FROM "CABANG") AS cabang,
        (SELECT COUNT(*) FROM "PEGAWAI") AS pegawai,
        (SELECT COUNT(*) FROM "MEKANIK") AS mekanik,
        (SELECT COUNT(*) FROM ${customerSource}) AS pelanggan,
        (SELECT COUNT(*) FROM "KONTRAK_KORPORAT") AS kontrak_korporat,
        (SELECT COUNT(*) FROM "MOTOR") AS motor,
        (SELECT COUNT(*) FROM "RIWAYAT_KEPEMILIKAN") AS riwayat_kepemilikan,
        (SELECT COUNT(*) FROM "JASA_SERVIS") AS jasa_servis,
        (SELECT COUNT(*) FROM "SUPPLIER") AS supplier,
        (SELECT COUNT(*) FROM "SUKU_CADANG") AS suku_cadang,
        (SELECT COUNT(*) FROM "STOK_CABANG") AS stok_cabang,
        (SELECT COUNT(*) FROM ${woSource}) AS work_order,
        (SELECT COUNT(*) FROM "WO_MEKANIK") AS wo_mekanik,
        (SELECT COUNT(*) FROM "WO_JASA") AS wo_jasa,
        (SELECT COUNT(*) FROM "WO_SUKU_CADANG") AS wo_suku_cadang,
        (SELECT COUNT(*) FROM "GARANSI") AS garansi,
        (SELECT COUNT(*) FROM "TAGIHAN_KOLEKTIF") AS tagihan_kolektif,
        ${
          canReadAuditLog ? '(SELECT COUNT(*) FROM "AUDIT_LOG")' : "0"
        } AS audit_log;
    `;

    const paidWoSelect = isRestrictedWo
        ? `
      (
        SELECT work_no
        FROM "VW_WORK_ORDER_AMAN"
        WHERE work_status IN ('Selesai', 'Dibayar')
        ORDER BY work_no ASC
        LIMIT 1
      )
    `
      : `
        (
          SELECT work_no
          FROM "WORK_ORDER"
          WHERE pembayaran_status = 'Lunas'
          ORDER BY work_no ASC
          LIMIT 1
        )
      `;

    const sampleTargetsSql = `
      SELECT
        ${paidWoSelect} AS paid_wo_id,
        ${paidWoSelect} AS paid_wo_nomor,
        (SELECT work_no FROM ${woSource} WHERE work_status IN ('Dibuat', 'Diproses', 'Antre', 'Dikerjakan') ORDER BY work_no ASC LIMIT 1) AS active_wo_id,
        (SELECT work_no FROM ${woSource} WHERE work_status IN ('Dibuat', 'Diproses', 'Antre', 'Dikerjakan') ORDER BY work_no ASC LIMIT 1) AS active_wo_nomor,
        (
          SELECT st.suku_cadang_kode
          FROM "STOK_CABANG" st
          WHERE st.cabang_kode = 'CB001' AND st.stok_qty < st.stok_minimum
          ORDER BY st.stok_qty ASC
          LIMIT 1
        ) AS low_stock_part_id,
        (
          SELECT st.suku_cadang_kode
          FROM "STOK_CABANG" st
          WHERE st.cabang_kode = 'CB001' AND st.stok_qty < st.stok_minimum
          ORDER BY st.stok_qty ASC
          LIMIT 1
        ) AS low_stock_sku,
        (
          SELECT sc.suku_cadang_nama
          FROM "STOK_CABANG" st
          JOIN "SUKU_CADANG" sc ON sc.suku_cadang_kode = st.suku_cadang_kode
          WHERE st.cabang_kode = 'CB001' AND st.stok_qty < st.stok_minimum
          ORDER BY st.stok_qty ASC
          LIMIT 1
        ) AS low_stock_nama,
        (
          SELECT st.stok_qty
          FROM "STOK_CABANG" st
          WHERE st.cabang_kode = 'CB001' AND st.stok_qty < st.stok_minimum
          ORDER BY st.stok_qty ASC
          LIMIT 1
        ) AS low_stock_qty;
    `;

    const [trigRes, viewRes, routineRes, countRes, targetRes] =
      await Promise.all([
        db.query(triggersSql),
        db.query(viewsSql),
        db.query(routinesSql),
        db.query(countsSql),
        db.query(sampleTargetsSql),
      ]);

    const backupDir = path.resolve(__dirname, "../../../database/backups");
    let backupFiles = [];
    if (fs.existsSync(backupDir)) {
      backupFiles = fs.readdirSync(backupDir)
        .map((f) => {
          const filePath = path.join(backupDir, f);
          const stat = fs.statSync(filePath);

          if (!stat.isFile()) return null;

          let backupType = "other";

          if (f.startsWith("kalawa_manual_backup_")) {
            backupType = "manual";
          } else if (f.startsWith("kalawa_pre_recovery_backup_")) {
            backupType = "pre_recovery";
          }

          return {
            name: f,
            sizeBytes: stat.size,
            modifiedAt: stat.mtime,
            backupType,
          };
        })
        .filter(Boolean)
        .sort(
          (a, b) =>
            new Date(b.modifiedAt).getTime() -
            new Date(a.modifiedAt).getTime()
        );
    }

    return {
      triggers: trigRes.rows,
      views: viewRes.rows.map((r) => r.viewname),
      routines: routineRes.rows,
      tableCounts: countRes.rows[0],
      testTargets: targetRes.rows[0],
      backupFiles,
    };
  }

  async getAuditLogs(filters = {}) {
    this.getRoleFlags();

    const params = [];
    const conditions = [];

    const tableFilter = filters.nama_tabel || filters.tabel_nama;
    if (tableFilter) {
      params.push(String(tableFilter).trim().toUpperCase());
      conditions.push(`UPPER(al.nama_tabel) = $${params.length}`);
    }
    const opFilter = filters.nama_operasi || filters.operasi;
    if (opFilter) {
      params.push(String(opFilter).trim().toUpperCase());
      conditions.push(`UPPER(al.nama_operasi) = $${params.length}`);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limit = Math.min(Number(filters.limit || 50), 200);
    params.push(limit);

    const sql = `
      SELECT
        al.audit_id,
        al.audit_id AS log_id,
        al.nama_tabel,
        al.nama_tabel AS tabel_nama,
        al.nama_operasi,
        al.nama_operasi AS operasi,
        al.data_id,
        al.user_database,
        al.user_database AS user_nama,
        al.waktu_perubahan,
        al.waktu_perubahan AS waktu,
        al.data_lama,
        al.data_baru
      FROM "AUDIT_LOG" al
      ${whereClause}
      ORDER BY al.audit_id DESC
      LIMIT $${params.length};
    `;

    const { rows } = await db.query(sql, params);
    return rows;
  }
}

module.exports = new DiagnosticsRepository();
