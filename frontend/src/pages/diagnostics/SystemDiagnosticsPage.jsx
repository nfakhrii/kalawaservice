import React, { useEffect, useState } from 'react';
import {
  Bug,
  Play,
  RotateCcw,
  CheckCircle2,
  Database,
  HardDriveDownload,
  Terminal,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { api } from '../../services/api';
import { formatDateTime } from '../../utils/formatters';
import { AlertBanner } from '../../components/ui/GitHubComponents';

export default function SystemDiagnosticsPage() {
  const [sysInfo, setSysInfo] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [results, setResults] = useState({});
  const [runningScenario, setRunningScenario] = useState(null);
  const [resetting, setResetting] = useState(false);
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

  useEffect(() => {
    loadSystemStatus();
  }, []);

  const scenarios = [
    {
      id: 1,
      title: 'Skenario #1: Input Work Order Tanpa Motor',
      expectedStatus: 400,
      expectedBadge: '400 Bad Request',
      endpoint: 'POST /api/operations/work-orders',
      mechanism:
        'Validasi NOT NULL & Foreign Key (motor_nopol REFERENCES "MOTOR"(motor_nopol)) di PostgreSQL + validasi input di Express Service.',
      description:
        'Mengirim request pembuatan Work Order baru pada tabel "WORK_ORDER" dengan atribut motor_id / motor_nopol = null. Sistem wajib menolak dengan HTTP 400 Bad Request tanpa crash.',
    },
    {
      id: 2,
      title: 'Skenario #2: Pembayaran Dobel (Double Payment)',
      expectedStatus: 409,
      expectedBadge: '409 Conflict',
      endpoint: 'POST /api/operations/payments',
      mechanism:
        'Pengecekan pembayaran_status = \'Lunas\' & work_status = \'Sudah Dibayar\' pada tabel "WORK_ORDER" di dalam transaksi ACID (BEGIN ... FOR UPDATE ... ROLLBACK).',
      description:
        'Mengirim pembayaran kedua untuk Work Order #WO001 yang sudah berstatus Lunas / Sudah Dibayar. Sistem wajib menolak pembayaran ganda dengan HTTP 409 Conflict.',
    },
    {
      id: 3,
      title: 'Skenario #3: Stok Suku Cadang Tidak Cukup',
      expectedStatus: 422,
      expectedBadge: '422 Unprocessable Entity',
      endpoint: 'POST /api/operations/work-orders/:woId/spareparts',
      mechanism:
        'PostgreSQL Trigger asli Kelompok 1 (AFTER INSERT ON "WO_SUKU_CADANG" -> trg_kurangi_stok) + CHECK constraint chk_stok_qty (stok_jumlah >= 0) pada tabel "STOK_CABANG".',
      description:
        'Mencoba menambahkan 50 PCS suku cadang stok kritis (misal SC008 — Busi Iridium NGK dengan sisa stok 2 PCS di CB001) ke Work Order aktif #WO003. Transaksi di-rollback otomatis, stok tidak minus.',
    },
    {
      id: 4,
      title: 'Skenario #4: User Tanpa Privilege (RBAC Violation)',
      expectedStatus: 403,
      expectedBadge: '403 Forbidden',
      endpoint: 'POST /api/operations/payments (Token Role: mekanik / user_mekanik)',
      mechanism:
        'JWT Role Middleware (authorizeRoles("owner", "admin_cabang", "kasir")) yang selaras dengan GRANT/REVOKE di Kelompok1_admin_security.sql.',
      description:
        'Menggunakan JWT token milik role "mekanik" (user_mekanik) untuk mengakses fitur pencatatan pembayaran kasir. Middleware wajib menolak dengan HTTP 403 Forbidden.',
    },
    {
      id: 5,
      title: 'Skenario #5: Query Laporan Rentang Tanggal Kosong',
      expectedStatus: 200,
      expectedBadge: '200 OK (Empty State)',
      endpoint: 'GET /api/analytics/branch-revenue?startDate=2025-01-01&endDate=2025-01-31',
      mechanism:
        'Penggunaan COALESCE(SUM(jumlah_bayar), 0) pada query JOIN PostgreSQL ("CABANG" + "WORK_ORDER" + fn_hitung_total_tagihan) dan validasi parameter tanggal.',
      description:
        'Meminta laporan pendapatan cabang pada periode Januari 2025 yang tidak memiliki transaksi. Sistem mengembalikan 200 OK dengan data: [] dan total_pendapatan: 0 (bukan NULL).',
    },
  ];

  const executeScenario = async (scenarioId) => {
    setRunningScenario(scenarioId);
    const startedAt = performance.now();
    try {
      const targets = sysInfo?.testTargets || {};

      if (scenarioId === 1) {
        try {
          await api.createWorkOrder({
            cabang_id: 'CB001',
            motor_id: null,
            keluhan: 'Pengujian Skenario #1: Work Order tanpa unit motor',
          });
        } catch (err) {
          const elapsed = Math.round(performance.now() - startedAt);
          setResults((prev) => ({
            ...prev,
            1: {
              passed: err.status === 400,
              actualStatus: err.status,
              elapsedMs: elapsed,
              requestPayload: {
                cabang_id: 'CB001',
                motor_id: null,
                keluhan: 'Pengujian Skenario #1: Work Order tanpa unit motor',
              },
              responsePayload: err.payload,
            },
          }));
        }
      } else if (scenarioId === 2) {
        const paidWoId = targets.paid_wo_id || 'WO001';
        try {
          await api.createPayment({
            work_order_id: paidWoId,
            metode_pembayaran: 'TUNAI',
            jumlah_bayar: 175000,
            catatan: 'Pengujian Skenario #2: Pembayaran Dobel',
          });
        } catch (err) {
          const elapsed = Math.round(performance.now() - startedAt);
          setResults((prev) => ({
            ...prev,
            2: {
              passed: err.status === 409,
              actualStatus: err.status,
              elapsedMs: elapsed,
              requestPayload: {
                work_order_id: paidWoId,
                nomor_wo: targets.paid_wo_nomor || 'WO001',
                metode_pembayaran: 'TUNAI',
                jumlah_bayar: 175000,
              },
              responsePayload: err.payload,
            },
          }));
        }
      } else if (scenarioId === 3) {
        const activeWoId = targets.active_wo_id || 'WO003';
        const lowPartId = targets.low_stock_part_id || 'SC008';
        try {
          await api.addSparepartToWo(activeWoId, {
            suku_cadang_id: lowPartId,
            jumlah: 50,
          });
        } catch (err) {
          const elapsed = Math.round(performance.now() - startedAt);
          setResults((prev) => ({
            ...prev,
            3: {
              passed: err.status === 422,
              actualStatus: err.status,
              elapsedMs: elapsed,
              requestPayload: {
                work_order_id: activeWoId,
                suku_cadang_id: lowPartId,
                kode_sku: targets.low_stock_sku || 'SC008',
                stok_tersedia: targets.low_stock_qty ?? 2,
                jumlah_diminta: 50,
              },
              responsePayload: err.payload,
            },
          }));
        }
      } else if (scenarioId === 4) {
        const roleRes = await api.getRoleTestToken('mekanik');
        const mekanikToken = roleRes.data.token;
        try {
          await api.createPayment(
            {
              work_order_id: targets.active_wo_id || 'WO003',
              metode_pembayaran: 'TUNAI',
              jumlah_bayar: 150000,
            },
            mekanikToken
          );
        } catch (err) {
          const elapsed = Math.round(performance.now() - startedAt);
          setResults((prev) => ({
            ...prev,
            4: {
              passed: err.status === 403,
              actualStatus: err.status,
              elapsedMs: elapsed,
              requestPayload: {
                authenticatedRole: 'mekanik (@user_mekanik)',
                targetEndpoint: 'POST /api/operations/payments',
                requiredRoles: ['owner', 'admin_cabang', 'kasir'],
              },
              responsePayload: err.payload,
            },
          }));
        }
      } else if (scenarioId === 5) {
        const res = await api.getBranchRevenueReport({
          startDate: '2025-01-01',
          endDate: '2025-01-31',
        });
        const elapsed = Math.round(performance.now() - startedAt);
        const passed =
          res.status === 200 &&
          Array.isArray(res.data) &&
          res.data.length === 0 &&
          res.total_pendapatan === 0;

        setResults((prev) => ({
          ...prev,
          5: {
            passed,
            actualStatus: res.status,
            elapsedMs: elapsed,
            requestPayload: {
              endpoint: 'GET /api/analytics/branch-revenue',
              startDate: '2025-01-01',
              endDate: '2025-01-31',
            },
            responsePayload: {
              success: res.success,
              status: res.status,
              total_pendapatan: res.total_pendapatan,
              data: res.data,
              summary: res.summary,
            },
          },
        }));
      }
    } finally {
      setRunningScenario(null);
    }
  };

  const runAllScenarios = async () => {
    for (const sc of scenarios) {
      await executeScenario(sc.id);
    }
  };

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
              System Diagnostics, 5 Debugging Scenarios &amp; Audit Log Viewer
            </h1>
          </div>
          <p className="text-xs text-[#656d76] mt-0.5">
            Panel interaktif <em>1-Click Test</em> untuk memverifikasi ke-5 skenario debugging PostgreSQL Kelompok 1 &amp; Express.js beserta pemantauan tabel <code className="font-mono">"AUDIT_LOG"</code> JSONB.
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

          <button
            type="button"
            disabled={runningScenario !== null}
            onClick={runAllScenarios}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-semibold bg-[#1f883d] hover:bg-[#1a7f37] text-white cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" />
            <span>Run All 5 Scenarios (1-Click)</span>
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

      {/* 5 Debugging Scenarios Cards */}
      <div className="space-y-4">
        {scenarios.map((sc) => {
          const res = results[sc.id];
          const isRunning = runningScenario === sc.id;

          return (
            <div
              key={sc.id}
              className="bg-white border border-[#d0d7de] rounded-md overflow-hidden"
            >
              <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center flex-wrap gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-200 text-[#1f2328]">
                    TEST #{sc.id}
                  </span>
                  <h2 className="text-sm font-semibold text-[#1f2328]">{sc.title}</h2>
                  <span className="font-mono text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-300">
                    Expected: {sc.expectedBadge}
                  </span>
                  {res && (
                    <span
                      className={`inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                        res.passed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-red-50 text-red-700 border-red-300'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>
                        {res.passed ? 'PASSED' : 'FAILED'} (HTTP {res.actualStatus} &middot;{' '}
                        {res.elapsedMs}ms)
                      </span>
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => executeScenario(sc.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-[#0969da] hover:bg-[#0860ca] text-white cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isRunning ? 'Running...' : `1-Click Test #${sc.id}`}</span>
                </button>
              </div>

              <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 text-xs">
                <div className="lg:col-span-5 space-y-2">
                  <div>
                    <span className="font-semibold text-[#656d76]">Target Endpoint:</span>
                    <div className="font-mono text-xs text-[#0969da] bg-[#f6f8fa] px-2 py-1 rounded border border-[#d0d7de] mt-0.5">
                      {sc.endpoint}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold text-[#656d76]">
                      Mekanisme Validasi (Express / PostgreSQL Kelompok 1):
                    </span>
                    <p className="text-[#1f2328] mt-0.5 leading-relaxed">{sc.mechanism}</p>
                  </div>
                  <div>
                    <span className="font-semibold text-[#656d76]">Deskripsi Skenario:</span>
                    <p className="text-[#656d76] mt-0.5 leading-relaxed">{sc.description}</p>
                  </div>
                </div>

                <div className="lg:col-span-7">
                  {!res ? (
                    <div className="h-full min-h-[130px] rounded-md bg-[#f6f8fa] border border-dashed border-[#d0d7de] flex flex-col items-center justify-center p-4 text-center text-[#656d76]">
                      <Terminal className="w-5 h-5 mb-1.5 text-[#8c959f]" />
                      <span>
                        Klik tombol <strong>1-Click Test #{sc.id}</strong> untuk mengeksekusi request langsung ke Backend &amp; PostgreSQL dan menampilkan respons JSON di sini.
                      </span>
                    </div>
                  ) : (
                    <div className="rounded-md bg-[#1f2328] text-slate-100 p-3 font-mono text-[11px] overflow-x-auto space-y-2">
                      <div className="flex items-center justify-between text-slate-400 border-b border-slate-700 pb-1.5">
                        <span>LIVE RESPONSE PAYLOAD (HTTP {res.actualStatus})</span>
                        <span className="text-emerald-400">
                          Status Match: {res.actualStatus} === {sc.expectedStatus}
                        </span>
                      </div>
                      <pre className="leading-relaxed whitespace-pre-wrap">
                        {JSON.stringify(res.responsePayload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

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
            <div className="px-4 py-3 bg-[#f6f8fa] border-b border-[#d0d7de] flex items-center gap-2">
              <HardDriveDownload className="w-4 h-4 text-[#1f883d]" />
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#1f2328]">
                Backup &amp; Recovery Verification (04_backup_recovery.sh)
              </h3>
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
