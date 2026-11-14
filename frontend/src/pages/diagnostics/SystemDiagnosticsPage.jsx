import React, { useEffect, useState } from 'react';
import {
  Bug,
  Database,
  HardDriveDownload,
  ShieldCheck,
  RefreshCw,
  RotateCcw,
  LoaderCircle,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatDateTime } from '../../utils/formatters';
import { AlertBanner } from '../../components/ui/GitHubComponents';

export default function SystemDiagnosticsPage() {
  const [sysInfo, setSysInfo] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [resetting, setResetting] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  const loadSystemStatus = async () => {
    try {
      const [statusRes, auditRes] = await Promise.all([
        api.getDiagnosticsStatus(),
        api.getAuditLogs(30),
      ]);
      setSysInfo(statusRes.data);
      setAuditLogs(auditRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateBackup = async () => {
    if (backupLoading) return;

    setBackupLoading(true);
    setAlert(null);

    try {
      const res = await api.createDiagnosticsBackup();

      // Refresh daftar backup setelah proses berhasil.
      await loadSystemStatus();

      setAlert({
        type: 'success',
        title: 'Backup Database Berhasil',
        message: res.files?.length
          ? `File backup berhasil dibuat: ${res.files.join(', ')}`
          : res.message || 'Backup database berhasil dibuat.',
      });
    } catch (err) {
      console.error('[Create Backup Error]:', err);

      setAlert({
        type: 'error',
        title: 'Gagal Membuat Backup',
        message:
          err.payload?.message ||
          err.message ||
          'Terjadi kesalahan saat membuat backup database.',
      });
    } finally {
      setBackupLoading(false);
    }
  };

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const handleResetDatabase = async () => {
    setResetting(true);
    setAlert(null);
    try {
      const res = await api.resetDatabase();
      setSysInfo(res.data?.inspection);
      const auditRes = await api.getAuditLogs(30);
      setAuditLogs(auditRes.data || []);
      setAlert({
        type: 'success',
        title: 'Database Kelompok 1 Berhasil Di-Reset ke Kondisi Seed Awal',
        message:
          'Kelompok1_schema.sql, Kelompok1_insert.sql, Kelompok1_admin_security.sql, Kelompok1_programming.sql, dan Kelompok1_migration_tugas4.sql telah dieksekusi ulang.',
      });
    } catch (err) {
      setAlert({ type: 'error', title: 'Gagal Reset Database', message: err.message });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="bg-white border border-[#d0d7de] rounded-md p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bug className="w-5 h-5 text-[#0969da]" />
            <h1 className="text-base font-bold text-[#1f2328]">
              PostgreSQL Audit
            </h1>
          </div>
          <p className="text-xs text-[#656d76] mt-0.5">
            Panel monitoring untuk memantau aktivitas perubahan data melalui tabel <code className="font-mono">"AUDIT_LOG"</code>, objek database PostgreSQL, serta verifikasi backup dan recovery Kelompok 1.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={resetting}
            onClick={handleResetDatabase}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#f6f8fa] hover:bg-slate-200/70 border border-[#d0d7de] text-[#1f2328] cursor-pointer"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${resetting ? 'animate-spin' : ''}`} />
            <span>{resetting ? 'Mereset DB...' : 'Reset Database Seed'}</span>
          </button>
        </div>
      </div>

      {alert && (
        <AlertBanner
          type={alert.type}
          title={alert.title}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      {/* Live AUDIT_LOG JSONB Viewer (Kelompok 1 trg_audit_log) */}
      <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
        <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#0969da]" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1f2328]">
              PostgreSQL Audit Trail Viewer — Tabel &quot;AUDIT_LOG&quot; (`trg_audit_log` JSONB)
            </h3>
          </div>
          <button
            type="button"
            onClick={loadSystemStatus}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#d0d7de] bg-white hover:bg-[#f6f8fa] text-xs font-medium text-[#1f2328] cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh Audit Log ({auditLogs.length})</span>
          </button>
        </div>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#d0d7de] bg-[#f6f8fa] text-[11px] font-semibold text-[#656d76] uppercase">
                <th className="py-2 px-3">Log ID</th>
                <th className="py-2 px-3">Tabel</th>
                <th className="py-2 px-3">Operasi</th>
                <th className="py-2 px-3">Data ID</th>
                <th className="py-2 px-3">User DB &amp; Waktu</th>
                <th className="py-2 px-3">JSONB Snapshot (`data_lama` &rarr; `data_baru`)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#d0d7de] text-xs">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-[#656d76]">
                    Belum ada rekaman audit log atau lakukan perubahan data pada WORK_ORDER / STOK_CABANG / SUKU_CADANG.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => (
                  <tr key={log.audit_id || log.log_id} className="hover:bg-[#f6f8fa]/70 align-top">
                    <td className="py-2 px-3 font-mono font-semibold text-[#656d76]">
                      #{log.audit_id || log.log_id}
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-[#0969da]">
                      &quot;{log.nama_tabel}&quot;
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                          log.nama_operasi === 'INSERT'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                            : log.nama_operasi === 'UPDATE'
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : 'bg-red-50 text-red-700 border-red-300'
                        }`}
                      >
                        {log.nama_operasi}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-[#1f2328]">
                      {log.data_id}
                    </td>
                    <td className="py-2 px-3 font-mono text-[11px] text-[#656d76] whitespace-nowrap">
                      <div className="font-semibold text-[#1f2328]">{log.user_database}</div>
                      <div>{formatDateTime(log.waktu_perubahan)}</div>
                    </td>
                    <td className="py-2 px-3 font-mono text-[10px] max-w-xl">
                      {log.data_lama && (
                        <div className="text-red-700 truncate" title={JSON.stringify(log.data_lama)}>
                          OLD: {JSON.stringify(log.data_lama)}
                        </div>
                      )}
                      {log.data_baru && (
                        <div className="text-emerald-800 truncate" title={JSON.stringify(log.data_baru)}>
                          NEW: {JSON.stringify(log.data_baru)}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Live PostgreSQL Database Objects & Backup Verification Panel */}
      {sysInfo && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
            <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center gap-2">
              <Database className="w-4 h-4 text-[#0969da]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1f2328]">
                Active PostgreSQL Triggers, Procedures &amp; Views (Kelompok 1)
              </h3>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div>
                <div className="font-semibold text-[#656d76] mb-1.5">
                  PL/pgSQL Triggers ({sysInfo.triggers?.length || 0}):
                </div>
                <div className="space-y-1">
                  {(sysInfo.triggers || []).map((t, i) => (
                    <div
                      key={`${t.trigger_name}-${i}`}
                      className="flex items-center justify-between font-mono text-[11px] bg-[#f6f8fa] px-2.5 py-1 rounded border border-[#d0d7de]"
                    >
                      <span className="text-[#0969da] font-semibold">{t.trigger_name}</span>
                      <span className="text-[#656d76]">
                        ON &quot;{t.table_name}&quot; &rarr; {t.function_name}()
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {sysInfo.routines && sysInfo.routines.length > 0 && (
                <div>
                  <div className="font-semibold text-[#656d76] mb-1.5">
                    Stored Procedures &amp; Functions ({sysInfo.routines.length}):
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {sysInfo.routines.map((r) => (
                      <span
                        key={r.routine_name}
                        className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-50 border border-blue-200 text-blue-800"
                      >
                        {r.routine_name}() [{r.routine_type}]
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <div className="font-semibold text-[#656d76] mb-1.5">
                  Database Views ({sysInfo.views?.length || 0}):
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(sysInfo.views || []).map((v) => (
                    <span
                      key={v}
                      className="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 border border-[#d0d7de] text-[#1f2328]"
                    >
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#d0d7de] rounded-md overflow-hidden">
            <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <HardDriveDownload className="w-4 h-4 text-[#1f883d]" />

                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1f2328]">
                  Backup &amp; Recovery Verification (04_backup_recovery.sh)
                </h3>
              </div>

              <button
                type="button"
                onClick={handleCreateBackup}
                disabled={backupLoading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {backupLoading ? (
                  <LoaderCircle className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <HardDriveDownload className="w-3.5 h-3.5" />
                )}

                <span>
                  {backupLoading ? 'Membuat Backup...' : 'Buat Backup Sekarang'}
                </span>
              </button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div>
                <div className="font-semibold text-[#656d76] mb-1">
                  Arsip Backup Terverifikasi di <code className="font-mono">/database/backups/</code>:
                </div>
                <div className="space-y-1">
                  {(sysInfo.backupFiles || []).map((bf) => (
                    <div
                      key={bf.name}
                      className="flex items-center justify-between font-mono text-[11px] bg-emerald-50/60 border border-emerald-300 px-2.5 py-1.5 rounded"
                    >
                      <span className="font-semibold text-emerald-900">{bf.name}</span>
                      <span className="text-emerald-700">
                        {(bf.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="font-semibold text-[#656d76] mb-1">
                  Jumlah Baris Tabel Kelompok 1 Saat Ini (<code className="font-mono">SELECT COUNT(*)</code>):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 font-mono text-[11px]">
                  {Object.entries(sysInfo.tableCounts || {}).map(([tbl, cnt]) => (
                    <div
                      key={tbl}
                      className="px-2 py-1 rounded bg-[#f6f8fa] border border-[#d0d7de] flex items-center justify-between"
                    >
                      <span className="truncate text-[#656d76]">&quot;{tbl}&quot;</span>
                      <strong className="text-[#1f2328]">{cnt}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
