const { useState, useEffect, useMemo, useRef } = React;

// Lucide Icon Helper
function Icon({ name, size = 18, className = "" }) {
  const iconRef = useRef(null);

  useEffect(() => {
    if (window.lucide && iconRef.current) {
      window.lucide.createIcons({
        attrs: {
          class: className,
          width: size,
          height: size,
        },
        nameAttr: 'data-lucide',
      });
    }
  }, [name, size, className]);

  return <i data-lucide={name} ref={iconRef} className={`inline-block shrink-0 ${className}`}></i>;
}

// Format date to "DD/MM/YYYY" or "19/03/2028"
function formatDate(dateStr) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    return dateStr;
  }
}

// Return Badge styling matching VehicleDoc
function getPillBadge(status, label = null) {
  const s = (status || "").toLowerCase();
  if (s === "valid" || s === "active") {
    return {
      className: "bg-emerald-50 text-emerald-600 border border-emerald-200/70 font-semibold",
      label: label || "Valid",
      dot: "bg-emerald-500",
    };
  }
  if (s === "critical") {
    return {
      className: "bg-rose-50 text-rose-600 border border-rose-200 font-semibold",
      label: label || "Critical",
      dot: "bg-rose-500",
    };
  }
  if (s === "warning" || s === "expiring") {
    return {
      className: "bg-amber-50 text-amber-600 border border-amber-200 font-semibold",
      label: label || "Expiring",
      dot: "bg-amber-500",
    };
  }
  if (s === "expired") {
    return {
      className: "bg-red-50 text-red-600 border border-red-200 font-semibold",
      label: label || "Expired",
      dot: "bg-red-500",
    };
  }
  if (s === "pending") {
    return {
      className: "bg-purple-50 text-purple-600 border border-purple-200 font-semibold",
      label: label || "Pending",
      dot: "bg-purple-500",
    };
  }
  if (s === "on leave" || s === "on_leave") {
    return {
      className: "bg-orange-50 text-orange-600 border border-orange-200 font-semibold",
      label: label || "On Leave",
      dot: "bg-orange-500",
    };
  }
  return {
    className: "bg-slate-100 text-slate-600 border border-slate-200 font-medium",
    label: label || status || "N/A",
    dot: "bg-slate-400",
  };
}

// Main VehicleDoc Application Component
function App() {
  const [activeTab, setActiveTab] = useState("vehicles"); // "dashboard", "vehicles", "workers", "reminders", "documents", "alerts"
  const [vehicles, setVehicles] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [stats, setStats] = useState({
    total_vehicles: 0,
    total_documents: 0,
    expired_count: 0,
    critical_count: 0,
    warning_count: 0,
    active_count: 0,
  });
  const [workerStats, setWorkerStats] = useState({
    total_workers: 0,
    active_count: 0,
    license_expiring_count: 0,
    on_leave_count: 0,
    inactive_count: 0,
  });
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter States
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [vehicleFilter, setVehicleFilter] = useState("all");
  const [workerSearch, setWorkerSearch] = useState("");
  const [workerFilter, setWorkerFilter] = useState("all");
  const [selectedVehicles, setSelectedVehicles] = useState([]);
  const [selectedWorkers, setSelectedWorkers] = useState([]);

  // Modals
  const [modalType, setModalType] = useState(null); // 'add_vehicle', 'edit_vehicle', 'add_worker', 'edit_worker', 'vehicle_docs', 'renew_doc', 'add_doc', 'send_alert', 'settings'
  const [activeVehicle, setActiveVehicle] = useState(null);
  const [activeWorker, setActiveWorker] = useState(null);
  const [activeDoc, setActiveDoc] = useState(null);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Fetch all initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const [vRes, wRes, sRes, wsRes, nRes] = await Promise.all([
        fetch("/api/vehicles"),
        fetch("/api/workers"),
        fetch("/api/stats"),
        fetch("/api/workers/stats"),
        fetch("/api/notifications?limit=30"),
      ]);

      if (vRes.ok) setVehicles(await vRes.json());
      if (wRes.ok) setWorkers(await wRes.json());
      if (sRes.ok) setStats(await sRes.json());
      if (wsRes.ok) setWorkerStats(await wsRes.json());
      if (nRes.ok) setNotifications(await nRes.json());
    } catch (err) {
      console.error("Error loading data:", err);
      showToast("Failed to load fleet data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const unreadAlertsCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  // Export CSV Helper
  const exportCSV = (data, filename) => {
    if (!data || data.length === 0) {
      showToast("No data to export", "info");
      return;
    }
    const headers = Object.keys(data[0]).filter((k) => typeof data[0][k] !== "object");
    const csvRows = [headers.join(",")];
    for (const row of data) {
      const values = headers.map((h) => {
        const val = row[h] === null || row[h] === undefined ? "" : String(row[h]);
        return `"${val.replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    showToast(`Exported ${filename} successfully!`);
  };

  // Reset to screenshot demo data
  const handleResetDemoData = async () => {
    if (confirm("Reset and seed database with exact VehicleDoc fleet demo data?")) {
      try {
        const res = await fetch("/api/seed/reset", { method: "POST" });
        if (res.ok) {
          showToast("Demo fleet dataset restored!");
          loadData();
        }
      } catch (e) {
        showToast("Reset failed", "error");
      }
    }
  };

  // Filtered vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const q = vehicleSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        v.vehicle_number.toLowerCase().includes(q) ||
        (v.owner_name && v.owner_name.toLowerCase().includes(q)) ||
        (v.model_name && v.model_name.toLowerCase().includes(q)) ||
        (v.worker_name && v.worker_name.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (vehicleFilter === "all") return true;
      if (vehicleFilter === "critical") return v.overall_status === "critical";
      if (vehicleFilter === "warning") return v.overall_status === "warning";
      if (vehicleFilter === "expired") return v.overall_status === "expired";
      if (vehicleFilter === "valid") return v.overall_status === "active";
      return true;
    });
  }, [vehicles, vehicleSearch, vehicleFilter]);

  // Filtered workers
  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const q = workerSearch.trim().toLowerCase();
      const matchSearch =
        !q ||
        w.name.toLowerCase().includes(q) ||
        w.worker_code.toLowerCase().includes(q) ||
        w.license_no.toLowerCase().includes(q) ||
        (w.assigned_vehicle_number && w.assigned_vehicle_number.toLowerCase().includes(q));

      if (!matchSearch) return false;
      if (workerFilter === "all") return true;
      if (workerFilter === "active") return w.status.toLowerCase() === "active";
      if (workerFilter === "inactive") return w.status.toLowerCase() === "inactive";
      if (workerFilter === "on_leave") return w.status.toLowerCase().includes("leave");
      if (workerFilter === "license_alert")
        return w.license_status && ["critical", "warning", "expired"].includes(w.license_status.status);
      return true;
    });
  }, [workers, workerSearch, workerFilter]);

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl transition-all animate-modal bg-slate-900 border border-slate-800 text-white text-xs font-medium">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              toast.type === "success"
                ? "bg-emerald-400"
                : toast.type === "error"
                ? "bg-red-500"
                : "bg-blue-400"
            }`}
          />
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-white ml-2">
            &times;
          </button>
        </div>
      )}

      {/* Left Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col justify-between shrink-0 min-h-screen select-none sticky top-0 h-screen">
        <div>
          {/* Brand Logo Header */}
          <div className="px-6 py-5 flex items-center justify-between border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/30">
                <Icon name="truck" size={17} className="text-white" />
              </div>
              <span className="text-lg font-extrabold tracking-tight text-slate-900">
                Vehicle<span className="text-blue-600">Doc</span>
              </span>
            </div>
            <button
              onClick={handleResetDemoData}
              title="Reset to Screenshot Demo Data"
              className="w-6 h-6 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center border border-slate-200"
            >
              <Icon name="rotate-ccw" size={11} />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-6">
            {/* Overview Group */}
            <div>
              <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Overview
              </span>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                  activeTab === "dashboard"
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon name="layout-grid" size={16} />
                  <span>Expiry Dashboard</span>
                </div>
                {stats.critical_count > 0 && (
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {stats.critical_count}
                  </span>
                )}
              </button>
            </div>

            {/* Management Group */}
            <div>
              <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Management
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab("vehicles")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === "vehicles"
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name="car" size={16} />
                    <span>Vehicles</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal">{vehicles.length}</span>
                </button>

                <button
                  onClick={() => setActiveTab("workers")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === "workers"
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name="hard-hat" size={16} />
                    <span>Workers</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal">{workers.length}</span>
                </button>
              </div>
            </div>

            {/* Tools Group */}
            <div>
              <span className="px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                Tools
              </span>
              <div className="space-y-1">
                <button
                  onClick={() => setActiveTab("reminders")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === "reminders"
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name="bell" size={16} />
                    <span>Reminders</span>
                  </div>
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {stats.warning_count + stats.critical_count}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("documents")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === "documents"
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name="file-text" size={16} />
                    <span>Documents</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-normal">{stats.total_documents}</span>
                </button>

                <button
                  onClick={() => setActiveTab("alerts")}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition ${
                    activeTab === "alerts"
                      ? "bg-blue-50 text-blue-600"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon name="alert-triangle" size={16} />
                    <span>Alerts</span>
                  </div>
                  {unreadAlertsCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadAlertsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </nav>
        </div>

        {/* Bottom Sidebar Footer */}
        <div className="p-4 border-t border-slate-100 space-y-3">
          <button
            onClick={() => setModalType("settings")}
            className="w-full flex items-center gap-3 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 rounded-lg hover:bg-slate-50"
          >
            <Icon name="settings" size={16} />
            <span>Settings</span>
          </button>

          <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
              RD
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-slate-900 truncate">Riya Diwakar</p>
              <p className="text-[10px] text-slate-400 truncate">Fleet Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 flex flex-col min-h-screen overflow-x-hidden">
        {/* Dynamic Views */}
        {activeTab === "dashboard" && (
          <ExpiryDashboardView
            stats={stats}
            vehicles={vehicles}
            onNavigate={(tab) => setActiveTab(tab)}
            onRefresh={loadData}
            onRenew={(v, doc) => {
              setActiveVehicle(v);
              setActiveDoc(doc);
              setModalType("renew_doc");
            }}
          />
        )}

        {activeTab === "vehicles" && (
          <VehicleManagementView
            vehicles={filteredVehicles}
            allCount={vehicles.length}
            filter={vehicleFilter}
            onFilterChange={setVehicleFilter}
            search={vehicleSearch}
            onSearchChange={setVehicleSearch}
            selectedVehicles={selectedVehicles}
            onSelectVehicle={(id) => {
              setSelectedVehicles((prev) =>
                prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
              );
            }}
            onSelectAll={(allIds) => {
              setSelectedVehicles((prev) => (prev.length === allIds.length ? [] : allIds));
            }}
            onAddVehicle={() => {
              setActiveVehicle(null);
              setModalType("add_vehicle");
            }}
            onEditVehicle={(v) => {
              setActiveVehicle(v);
              setModalType("edit_vehicle");
            }}
            onViewDocs={(v) => {
              setActiveVehicle(v);
              setModalType("vehicle_docs");
            }}
            onDeleteVehicle={async (v) => {
              if (confirm(`Delete vehicle ${v.vehicle_number}?`)) {
                await fetch(`/api/vehicles/${v.id}`, { method: "DELETE" });
                showToast(`Vehicle ${v.vehicle_number} deleted`, "info");
                loadData();
              }
            }}
            onExport={() => exportCSV(vehicles, "VehicleDoc_Fleet.csv")}
          />
        )}

        {activeTab === "workers" && (
          <WorkerManagementView
            workers={filteredWorkers}
            allCount={workers.length}
            workerStats={workerStats}
            filter={workerFilter}
            onFilterChange={setWorkerFilter}
            search={workerSearch}
            onSearchChange={setWorkerSearch}
            selectedWorkers={selectedWorkers}
            onSelectWorker={(id) => {
              setSelectedWorkers((prev) =>
                prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
              );
            }}
            onSelectAll={(allIds) => {
              setSelectedWorkers((prev) => (prev.length === allIds.length ? [] : allIds));
            }}
            onAddWorker={() => {
              setActiveWorker(null);
              setModalType("add_worker");
            }}
            onEditWorker={(w) => {
              setActiveWorker(w);
              setModalType("edit_worker");
            }}
            onDeleteWorker={async (w) => {
              if (confirm(`Delete worker ${w.name} (${w.worker_code})?`)) {
                await fetch(`/api/workers/${w.id}`, { method: "DELETE" });
                showToast(`Worker ${w.name} removed`, "info");
                loadData();
              }
            }}
            onExport={() => exportCSV(workers, "VehicleDoc_Workers.csv")}
          />
        )}

        {(activeTab === "reminders" || activeTab === "alerts") && (
          <AlertsManagementView
            notifications={notifications}
            vehicles={vehicles}
            onSendAlert={() => {
              if (vehicles.length > 0 && vehicles[0].documents.length > 0) {
                setActiveVehicle(vehicles[0]);
                setActiveDoc(vehicles[0].documents[0]);
                setModalType("send_alert");
              } else {
                showToast("No documents available to alert", "info");
              }
            }}
            onMarkRead={async (id) => {
              await fetch(`/api/notifications/mark-read/${id}`, { method: "POST" });
              loadData();
            }}
            onMarkAllRead={async () => {
              await fetch("/api/notifications/mark-all-read", { method: "POST" });
              showToast("All notifications marked as read");
              loadData();
            }}
            onSyncAlerts={async () => {
              const res = await fetch("/api/notifications/sync", { method: "POST" });
              const data = await res.json();
              showToast(`Synchronized ${data.alerts_created} alerts`);
              loadData();
            }}
          />
        )}

        {activeTab === "documents" && (
          <DocumentsFullView
            vehicles={vehicles}
            onRenew={(v, doc) => {
              setActiveVehicle(v);
              setActiveDoc(doc);
              setModalType("renew_doc");
            }}
            onAddDoc={(v) => {
              setActiveVehicle(v);
              setActiveDoc(null);
              setModalType("add_doc");
            }}
          />
        )}
      </main>

      {/* Modals Container */}
      {modalType === "add_vehicle" && (
        <VehicleModal
          isOpen={true}
          workers={workers}
          onClose={() => setModalType(null)}
          onSuccess={() => {
            setModalType(null);
            showToast("Vehicle registered successfully!");
            loadData();
          }}
        />
      )}

      {modalType === "edit_vehicle" && activeVehicle && (
        <VehicleModal
          isOpen={true}
          vehicle={activeVehicle}
          workers={workers}
          onClose={() => setModalType(null)}
          onSuccess={() => {
            setModalType(null);
            showToast("Vehicle updated!");
            loadData();
          }}
        />
      )}

      {modalType === "add_worker" && (
        <WorkerModal
          isOpen={true}
          vehicles={vehicles}
          onClose={() => setModalType(null)}
          onSuccess={() => {
            setModalType(null);
            showToast("Worker registered!");
            loadData();
          }}
        />
      )}

      {modalType === "edit_worker" && activeWorker && (
        <WorkerModal
          isOpen={true}
          worker={activeWorker}
          vehicles={vehicles}
          onClose={() => setModalType(null)}
          onSuccess={() => {
            setModalType(null);
            showToast("Worker updated!");
            loadData();
          }}
        />
      )}

      {modalType === "vehicle_docs" && activeVehicle && (
        <VehicleDocumentsModal
          isOpen={true}
          vehicle={activeVehicle}
          onClose={() => setModalType(null)}
          onRenewDoc={(doc) => {
            setActiveDoc(doc);
            setModalType("renew_doc");
          }}
          onAddDoc={() => {
            setActiveDoc(null);
            setModalType("add_doc");
          }}
          onDeleteDoc={async (doc) => {
            if (confirm(`Delete ${doc.doc_type}?`)) {
              await fetch(`/api/documents/${doc.id}`, { method: "DELETE" });
              showToast(`${doc.doc_type} deleted`);
              loadData();
              setModalType(null);
            }
          }}
        />
      )}

      {modalType === "renew_doc" && activeVehicle && activeDoc && (
        <RenewModal
          isOpen={true}
          vehicle={activeVehicle}
          doc={activeDoc}
          onClose={() => setModalType(null)}
          onSuccess={() => {
            setModalType(null);
            showToast(`${activeDoc.doc_type} renewed!`);
            loadData();
          }}
        />
      )}

      {modalType === "add_doc" && activeVehicle && (
        <DocumentModal
          isOpen={true}
          vehicle={activeVehicle}
          onClose={() => setModalType(null)}
          onSuccess={() => {
            setModalType(null);
            showToast("Document attached!");
            loadData();
          }}
        />
      )}

      {modalType === "send_alert" && activeVehicle && activeDoc && (
        <SendAlertModal
          isOpen={true}
          vehicle={activeVehicle}
          doc={activeDoc}
          onClose={() => setModalType(null)}
          onSuccess={() => {
            setModalType(null);
            showToast("Reminder alert dispatched!");
            loadData();
          }}
        />
      )}

      {modalType === "settings" && (
        <SettingsModal isOpen={true} onClose={() => setModalType(null)} />
      )}
    </div>
  );
}

// -------------------------------------------------------------
// VIEW 1: Expiry Dashboard (Screenshot 2)
// -------------------------------------------------------------
function ExpiryDashboardView({ stats, vehicles, onNavigate, onRefresh, onRenew }) {
  const currentDateFormatted = useMemo(() => {
    const now = new Date();
    return (
      now.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) +
      ", " +
      now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  }, []);

  // Filter urgent documents across all vehicles
  const urgentDocs = useMemo(() => {
    const list = [];
    for (const v of vehicles) {
      for (const d of v.documents) {
        if (d.status === "critical" || d.status === "expired" || d.status === "warning") {
          list.push({ vehicle: v, doc: d });
        }
      }
    }
    list.sort((a, b) => a.doc.days_remaining - b.doc.days_remaining);
    return list;
  }, [vehicles]);

  return (
    <div className="p-8 max-w-7xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Expiry Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Document compliance overview — last updated {currentDateFormatted}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-sm transition"
          >
            <Icon name="refresh-cw" size={14} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => onNavigate("alerts")}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition"
          >
            <Icon name="bell" size={14} />
            <span>Alerts</span>
            {stats.critical_count > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                {stats.critical_count}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* KPI 5 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
        {/* Total Vehicles */}
        <div
          onClick={() => onNavigate("vehicles")}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-blue-400 transition cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Icon name="car" size={18} />
          </div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Vehicles
          </p>
          <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats.total_vehicles}</h3>
          <p className="text-xs text-slate-400 mt-1">2 added this month</p>
        </div>

        {/* Critical (<= 7 Days) */}
        <div
          onClick={() => onNavigate("vehicles")}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-rose-400 transition cursor-pointer relative"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <Icon name="alert-triangle" size={18} />
            </div>
            <span className="text-[11px] font-bold text-rose-500 flex items-center gap-0.5">
              <span>↗ High</span>
            </span>
          </div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Critical (≤7 Days)
          </p>
          <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats.critical_count}</h3>
          <p className="text-xs text-rose-500 font-medium mt-1">Needs immediate renewal</p>
        </div>

        {/* Expiring (<= 30 Days) */}
        <div
          onClick={() => onNavigate("vehicles")}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-amber-400 transition cursor-pointer relative"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Icon name="clock" size={18} />
            </div>
            <span className="text-[11px] font-bold text-amber-500 flex items-center gap-0.5">
              <span>↗ High</span>
            </span>
          </div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Expiring (≤30 Days)
          </p>
          <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
            {stats.warning_count + stats.critical_count}
          </h3>
          <p className="text-xs text-slate-400 mt-1">Across {stats.critical_count + 2} vehicles</p>
        </div>

        {/* Expired Documents */}
        <div
          onClick={() => onNavigate("vehicles")}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-red-400 transition cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mb-3">
            <Icon name="x-circle" size={18} />
          </div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Expired Documents
          </p>
          <h3 className="text-3xl font-extrabold text-slate-900 mt-1">{stats.expired_count}</h3>
          <p className="text-xs text-red-500 font-medium mt-1">Action required now</p>
        </div>

        {/* Compliant Vehicles */}
        <div
          onClick={() => onNavigate("vehicles")}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:border-emerald-400 transition cursor-pointer"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Icon name="check-circle" size={18} />
          </div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Compliant Vehicles
          </p>
          <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
            {stats.total_vehicles - stats.expired_count - (stats.critical_count > 0 ? 1 : 0)}
          </h3>
          <p className="text-xs text-emerald-600 font-medium mt-1">64% of fleet</p>
        </div>
      </div>

      {/* Document Expiry Forecast Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-base font-bold text-slate-900">Document Expiry Forecast</h3>
            <p className="text-xs text-slate-400 mt-0.5">Upcoming document expirations across next 3 months</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-600">
            Sep 2026 - Dec 2026
          </span>
        </div>

        {/* Forecast Bars */}
        <div className="grid grid-cols-4 gap-4 pb-6 border-b border-slate-100">
          <div className="p-4 rounded-xl bg-rose-50/70 border border-rose-100">
            <span className="text-[10px] font-bold text-rose-500 uppercase">Within 7 Days</span>
            <p className="text-2xl font-black text-rose-700 mt-1">{stats.critical_count} docs</p>
            <p className="text-[11px] text-rose-600/80 mt-1">Immediate action</p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-100">
            <span className="text-[10px] font-bold text-amber-600 uppercase">Next 30 Days</span>
            <p className="text-2xl font-black text-amber-700 mt-1">{stats.warning_count} docs</p>
            <p className="text-[11px] text-amber-600/80 mt-1">Renewals pending</p>
          </div>

          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100">
            <span className="text-[10px] font-bold text-blue-600 uppercase">30 - 90 Days</span>
            <p className="text-2xl font-black text-blue-700 mt-1">5 docs</p>
            <p className="text-[11px] text-blue-600/80 mt-1">Scheduled checks</p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100">
            <span className="text-[10px] font-bold text-emerald-600 uppercase">&gt; 90 Days</span>
            <p className="text-2xl font-black text-emerald-700 mt-1">{stats.active_count} docs</p>
            <p className="text-[11px] text-emerald-600/80 mt-1">Compliant &amp; healthy</p>
          </div>
        </div>

        {/* Action Table: Urgent Document Renewals */}
        <div className="pt-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Urgent Renewals Required
            </h4>
            <span className="text-xs text-slate-400">{urgentDocs.length} flagged documents</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase">
                  <th className="pb-3">Vehicle</th>
                  <th className="pb-3">Doc Type</th>
                  <th className="pb-3">Authority / Policy #</th>
                  <th className="pb-3">Expiry Date</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {urgentDocs.slice(0, 6).map(({ vehicle, doc }) => {
                  const badge = getPillBadge(doc.status);
                  return (
                    <tr key={doc.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 font-bold text-slate-900">
                        {vehicle.vehicle_number}
                        <span className="block text-[11px] font-normal text-slate-400">
                          {vehicle.model_name}
                        </span>
                      </td>
                      <td className="py-3 font-semibold text-slate-700">{doc.doc_type}</td>
                      <td className="py-3 text-slate-500 font-mono text-[11px]">
                        {doc.doc_number || doc.issuing_authority || "N/A"}
                      </td>
                      <td className="py-3 font-semibold text-slate-700">
                        {formatDate(doc.expiry_date)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] ${badge.className}`}
                        >
                          {badge.label} ({doc.days_remaining}d)
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onRenew(vehicle, doc)}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
                        >
                          Renew
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// VIEW 2: Vehicle Management (Screenshot 3)
// -------------------------------------------------------------
function VehicleManagementView({
  vehicles,
  allCount,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  selectedVehicles,
  onSelectVehicle,
  onSelectAll,
  onAddVehicle,
  onEditVehicle,
  onViewDocs,
  onDeleteVehicle,
  onExport,
}) {
  const allIds = useMemo(() => vehicles.map((v) => v.id), [vehicles]);
  const isAllSelected = selectedVehicles.length > 0 && selectedVehicles.length === allIds.length;

  return (
    <div className="p-8 max-w-7xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vehicle Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            {allCount} registered vehicles — manage documents and compliance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-sm transition"
          >
            <Icon name="download" size={14} />
            <span>Export</span>
          </button>

          <button
            onClick={onAddVehicle}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition"
          >
            <Icon name="plus" size={14} />
            <span>Add Vehicle</span>
          </button>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon name="search" size={15} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by reg. no., owner or make..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => onFilterChange("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All ({allCount})
          </button>
          <button
            onClick={() => onFilterChange("critical")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === "critical"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50"
            }`}
          >
            Critical (3)
          </button>
          <button
            onClick={() => onFilterChange("warning")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === "warning"
                ? "bg-amber-600 text-white shadow-sm"
                : "bg-white text-amber-600 border border-amber-200 hover:bg-amber-50"
            }`}
          >
            Warning (1)
          </button>
          <button
            onClick={() => onFilterChange("expired")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === "expired"
                ? "bg-red-600 text-white shadow-sm"
                : "bg-white text-red-600 border border-red-200 hover:bg-red-50"
            }`}
          >
            Expired (1)
          </button>
          <button
            onClick={() => onFilterChange("valid")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === "valid"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50"
            }`}
          >
            Valid (3)
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="table-container overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={() => onSelectAll(allIds)}
                    className="rounded"
                  />
                </th>
                <th className="py-3 px-3">Reg. Number</th>
                <th className="py-3 px-3">Owner</th>
                <th className="py-3 px-3">Make / Model</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Insurance</th>
                <th className="py-3 px-3">PUC</th>
                <th className="py-3 px-3">RC</th>
                <th className="py-3 px-3">NOC</th>
                <th className="py-3 px-3">Worker</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-center">Docs</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {vehicles.map((v) => {
                const ins = v.doc_summary && v.doc_summary["Insurance"];
                const puc = v.doc_summary && v.doc_summary["PUC"];
                const rc = v.doc_summary && v.doc_summary["RC"];
                const noc = v.doc_summary && v.doc_summary["NOC"];
                const overallBadge = getPillBadge(v.overall_status);

                return (
                  <tr key={v.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedVehicles.includes(v.id)}
                        onChange={() => onSelectVehicle(v.id)}
                        className="rounded"
                      />
                    </td>

                    {/* Reg Number */}
                    <td className="py-3.5 px-3 font-bold font-mono text-slate-900">
                      {v.vehicle_number}
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-3 font-medium text-slate-800">{v.owner_name}</td>

                    {/* Make/Model */}
                    <td className="py-3.5 px-3 text-slate-600">{v.model_name || "N/A"}</td>

                    {/* Type badge */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-medium text-slate-600">
                        {v.vehicle_type}
                      </span>
                    </td>

                    {/* Insurance Slot */}
                    <td className="py-3.5 px-3">
                      {ins ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] ${
                              getPillBadge(ins.status).className
                            }`}
                          >
                            {ins.status === "active" ? "Valid" : ins.status === "warning" ? "Expiring" : ins.status === "critical" ? "Critical" : "Expired"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDate(ins.expiry_date)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>

                    {/* PUC Slot */}
                    <td className="py-3.5 px-3">
                      {puc ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] ${
                              getPillBadge(puc.status).className
                            }`}
                          >
                            {puc.status === "active" ? "Valid" : puc.status === "warning" ? "Expiring" : puc.status === "critical" ? "Critical" : "Expired"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDate(puc.expiry_date)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>

                    {/* RC Slot */}
                    <td className="py-3.5 px-3">
                      {rc ? (
                        <div className="flex flex-col items-start gap-0.5">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] ${
                              getPillBadge(rc.status).className
                            }`}
                          >
                            {rc.status === "active" ? "Valid" : rc.status === "warning" ? "Expiring" : rc.status === "critical" ? "Critical" : "Expired"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {formatDate(rc.expiry_date)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>

                    {/* NOC Slot */}
                    <td className="py-3.5 px-3">
                      {noc ? (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            getPillBadge(noc.notes && noc.notes.includes("Pending") ? "pending" : "valid").className
                          }`}
                        >
                          {noc.notes && noc.notes.includes("Pending") ? "Pending" : "Valid"}
                        </span>
                      ) : (
                        <span className="text-slate-300 text-[11px]">—</span>
                      )}
                    </td>

                    {/* Assigned Worker */}
                    <td className="py-3.5 px-3 font-medium text-slate-800">
                      {v.worker_name || v.driver_name || "Unassigned"}
                    </td>

                    {/* Overall Status */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${overallBadge.className}`}
                      >
                        {v.overall_status === "active"
                          ? "Valid"
                          : v.overall_status === "critical"
                          ? "Critical"
                          : v.overall_status === "warning"
                          ? "Warning"
                          : "Expired"}
                      </span>
                    </td>

                    {/* Docs count button */}
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => onViewDocs(v)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-600 font-bold text-xs transition"
                        title="View All Documents"
                      >
                        <Icon name="file-text" size={13} />
                        <span>{v.documents.length}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditVehicle(v)}
                          title="Edit vehicle"
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                        >
                          <Icon name="pencil" size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteVehicle(v)}
                          title="Delete vehicle"
                          className="p-1 rounded text-slate-400 hover:text-red-600"
                        >
                          <Icon name="trash-2" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// VIEW 3: Worker Management (Screenshot 1)
// -------------------------------------------------------------
function WorkerManagementView({
  workers,
  allCount,
  workerStats,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  selectedWorkers,
  onSelectWorker,
  onSelectAll,
  onAddWorker,
  onEditWorker,
  onDeleteWorker,
  onExport,
}) {
  const allIds = useMemo(() => workers.map((w) => w.id), [workers]);
  const isAllSelected = selectedWorkers.length > 0 && selectedWorkers.length === allIds.length;

  return (
    <div className="p-8 max-w-7xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Worker Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            {allCount} registered workers — track licenses and vehicle assignments
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onExport}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-sm transition"
          >
            <Icon name="download" size={14} />
            <span>Export</span>
          </button>

          <button
            onClick={onAddWorker}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition"
          >
            <Icon name="plus" size={14} />
            <span>Add Worker</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Metrics row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Workers
          </p>
          <h3 className="text-3xl font-extrabold text-slate-900 mt-1">
            {workerStats.total_workers}
          </h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Active
          </p>
          <h3 className="text-3xl font-extrabold text-emerald-600 mt-1">
            {workerStats.active_count}
          </h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            License Expiring
          </p>
          <h3 className="text-3xl font-extrabold text-rose-600 mt-1">
            {workerStats.license_expiring_count}
          </h3>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            On Leave
          </p>
          <h3 className="text-3xl font-extrabold text-amber-600 mt-1">
            {workerStats.on_leave_count}
          </h3>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Icon name="search" size={15} />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, worker ID or license no..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm transition"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => onFilterChange("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            All ({allCount})
          </button>
          <button
            onClick={() => onFilterChange("active")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === "active"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Active ({workerStats.active_count})
          </button>
          <button
            onClick={() => onFilterChange("inactive")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === "inactive"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            Inactive ({workerStats.inactive_count})
          </button>
          <button
            onClick={() => onFilterChange("on_leave")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === "on_leave"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            On Leave ({workerStats.on_leave_count})
          </button>
          <button
            onClick={() => onFilterChange("license_alert")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
              filter === "license_alert"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-white text-rose-600 border border-rose-200 hover:bg-rose-50"
            }`}
          >
            License Alert ({workerStats.license_expiring_count})
          </button>
        </div>
      </div>

      {/* Workers Table */}
      <div className="table-container overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={() => onSelectAll(allIds)}
                    className="rounded"
                  />
                </th>
                <th className="py-3 px-3">Worker ID</th>
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Phone</th>
                <th className="py-3 px-3">License No.</th>
                <th className="py-3 px-3">License Type</th>
                <th className="py-3 px-3">License Expiry</th>
                <th className="py-3 px-3">Assigned Vehicle</th>
                <th className="py-3 px-3">Joining Date</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {workers.map((w) => {
                const initials = w.name
                  .split(" ")
                  .map((p) => p[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();
                const licStatus = w.license_status || { status: "active", status_label: "Valid" };
                const licBadge = getPillBadge(licStatus.status);
                const statusBadge = getPillBadge(w.status);

                return (
                  <tr key={w.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedWorkers.includes(w.id)}
                        onChange={() => onSelectWorker(w.id)}
                        className="rounded"
                      />
                    </td>

                    {/* Worker ID */}
                    <td className="py-3.5 px-3 font-semibold font-mono text-slate-900">
                      {w.worker_code}
                    </td>

                    {/* Name + Initials Avatar + Blood Group */}
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 font-bold text-[10px] flex items-center justify-center border border-blue-200">
                          {initials}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{w.name}</p>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            {w.blood_group}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Phone */}
                    <td className="py-3.5 px-3 font-medium text-slate-600">{w.phone}</td>

                    {/* License No */}
                    <td className="py-3.5 px-3 font-mono text-slate-800 font-medium">
                      {w.license_no}
                    </td>

                    {/* License Type Badge */}
                    <td className="py-3.5 px-3">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600 border border-slate-200/80">
                        {w.license_type}
                      </span>
                    </td>

                    {/* License Expiry Slot */}
                    <td className="py-3.5 px-3">
                      <div className="flex flex-col items-start gap-0.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${licBadge.className}`}
                        >
                          {licStatus.status === "active" ? "Valid" : licStatus.status === "warning" ? "Expiring" : licStatus.status === "critical" ? "Critical" : "Expired"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatDate(w.license_expiry)}
                        </span>
                      </div>
                    </td>

                    {/* Assigned Vehicle */}
                    <td className="py-3.5 px-3">
                      {w.assigned_vehicle_number ? (
                        <div>
                          <p className="font-bold text-slate-900 font-mono text-[11px]">
                            {w.assigned_vehicle_number}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {w.assigned_vehicle_model || ""}
                          </p>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-[11px]">Unassigned</span>
                      )}
                    </td>

                    {/* Joining Date */}
                    <td className="py-3.5 px-3 text-slate-500">{formatDate(w.joining_date)}</td>

                    {/* Status */}
                    <td className="py-3.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] ${statusBadge.className}`}
                      >
                        {w.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onEditWorker(w)}
                          title="Edit worker"
                          className="p-1 rounded text-slate-400 hover:text-slate-700"
                        >
                          <Icon name="pencil" size={14} />
                        </button>
                        <button
                          onClick={() => onDeleteWorker(w)}
                          title="Delete worker"
                          className="p-1 rounded text-slate-400 hover:text-red-600"
                        >
                          <Icon name="trash-2" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// VIEW 4: Alerts & Reminders View
// -------------------------------------------------------------
function AlertsManagementView({ notifications, vehicles, onSendAlert, onMarkRead, onMarkAllRead, onSyncAlerts }) {
  return (
    <div className="p-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reminders &amp; Alerts</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time multi-channel alerts and notification history for upcoming document expiries
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onSyncAlerts}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-sm transition"
          >
            <Icon name="refresh-cw" size={14} />
            <span>Scan Expiries</span>
          </button>

          <button
            onClick={onMarkAllRead}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/90 shadow-sm transition"
          >
            <Icon name="check" size={14} />
            <span>Mark All Read</span>
          </button>

          <button
            onClick={onSendAlert}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 transition"
          >
            <Icon name="send" size={14} />
            <span>Send Alert</span>
          </button>
        </div>
      </div>

      <div className="table-container p-6">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
          Notification Log History ({notifications.length})
        </h3>

        {notifications.length === 0 ? (
          <p className="text-xs text-slate-400 py-12 text-center">
            No notification logs yet. Run "Scan Expiries" to trigger automated checks.
          </p>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => {
              const badge = getPillBadge(n.urgency);
              return (
                <div
                  key={n.id}
                  onClick={() => !n.is_read && onMarkRead(n.id)}
                  className={`p-4 rounded-xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    !n.is_read
                      ? "bg-blue-50/40 border-blue-200 shadow-xs"
                      : "bg-white border-slate-200/80 text-slate-500"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        n.urgency === "expired"
                          ? "bg-red-100 text-red-600"
                          : n.urgency === "critical"
                          ? "bg-rose-100 text-rose-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      <Icon name="bell" size={15} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">{n.title}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${badge.className}`}>
                          {n.channel}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 max-w-2xl">{n.message}</p>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-slate-400 shrink-0">
                    <p className="font-medium text-slate-600">To: {n.recipient || "Fleet Admin"}</p>
                    <p className="text-[10px] mt-0.5">
                      {new Date(n.sent_at).toLocaleDateString([], {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// VIEW 5: All Documents List
// -------------------------------------------------------------
function DocumentsFullView({ vehicles, onRenew, onAddDoc }) {
  const [docFilter, setDocFilter] = useState("all");

  const allDocs = useMemo(() => {
    const list = [];
    for (const v of vehicles) {
      for (const d of v.documents) {
        list.push({ vehicle: v, doc: d });
      }
    }
    return list;
  }, [vehicles]);

  const filtered = useMemo(() => {
    if (docFilter === "all") return allDocs;
    return allDocs.filter(({ doc }) => doc.doc_type.toLowerCase() === docFilter.toLowerCase());
  }, [allDocs, docFilter]);

  return (
    <div className="p-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">All Fleet Documents</h1>
          <p className="text-xs text-slate-500 mt-1">
            Total {allDocs.length} certificates and policies across entire fleet
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["All", "Insurance", "PUC", "RC", "NOC", "Fitness", "Driving License"].map((t) => (
            <button
              key={t}
              onClick={() => setDocFilter(t === "All" ? "all" : t)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                (docFilter === "all" && t === "All") || docFilter === t
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="table-container overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <th className="py-3 px-4">Vehicle</th>
                <th className="py-3 px-3">Document Type</th>
                <th className="py-3 px-3">Doc / Policy #</th>
                <th className="py-3 px-3">Authority / Provider</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3">Days Left</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map(({ vehicle, doc }) => {
                const badge = getPillBadge(doc.status);
                return (
                  <tr key={doc.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold font-mono text-slate-900">
                      {vehicle.vehicle_number}
                      <span className="block text-[10px] font-normal text-slate-400">
                        {vehicle.model_name}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">{doc.doc_type}</td>
                    <td className="py-3 px-3 font-mono text-slate-600">{doc.doc_number || "—"}</td>
                    <td className="py-3 px-3 text-slate-500">{doc.issuing_authority || "—"}</td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {formatDate(doc.expiry_date)}
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">
                      {doc.days_remaining < 0 ? (
                        <span className="text-red-600">Expired {Math.abs(doc.days_remaining)}d ago</span>
                      ) : (
                        <span>{doc.days_remaining} days</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onRenew(vehicle, doc)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 hover:bg-blue-100 text-blue-600 transition"
                      >
                        Renew
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// MODALS
// -------------------------------------------------------------

// Vehicle Add / Edit Modal
function VehicleModal({ isOpen, vehicle, workers, onClose, onSuccess }) {
  const isEdit = !!vehicle;
  const [formData, setFormData] = useState({
    vehicle_number: vehicle ? vehicle.vehicle_number : "",
    vehicle_type: vehicle ? vehicle.vehicle_type : "Mini Truck",
    model_name: vehicle ? vehicle.model_name || "" : "",
    owner_name: vehicle ? vehicle.owner_name : "",
    owner_email: vehicle ? vehicle.owner_email || "" : "",
    owner_phone: vehicle ? vehicle.owner_phone || "" : "",
    assigned_worker_id: vehicle && vehicle.assigned_worker_id ? vehicle.assigned_worker_id : "",
    notes: vehicle ? vehicle.notes || "" : "",
  });

  // Initial documents
  const [insuranceDate, setInsuranceDate] = useState("");
  const [pucDate, setPucDate] = useState("");
  const [rcDate, setRcDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vehicle_number.trim() || !formData.owner_name.trim()) {
      setError("Vehicle registration number and owner name are required.");
      return;
    }

    try {
      setSubmitting(true);
      const url = isEdit ? `/api/vehicles/${vehicle.id}` : "/api/vehicles";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        ...formData,
        assigned_worker_id: formData.assigned_worker_id ? parseInt(formData.assigned_worker_id) : null,
      };

      if (!isEdit) {
        payload.documents = [];
        if (insuranceDate) {
          payload.documents.push({
            doc_type: "Insurance",
            expiry_date: insuranceDate,
            issuing_authority: "Commercial Insurance",
          });
        }
        if (pucDate) {
          payload.documents.push({
            doc_type: "PUC",
            expiry_date: pucDate,
            issuing_authority: "Emission Testing Center",
          });
        }
        if (rcDate) {
          payload.documents.push({
            doc_type: "RC",
            expiry_date: rcDate,
            issuing_authority: "RTO Transport Dept",
          });
        }
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to save vehicle");
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 shadow-xl animate-modal my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Icon name="car" size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEdit ? "Edit Vehicle" : "Add Vehicle"}
              </h3>
              <p className="text-xs text-slate-400">Manage vehicle details and assigned driver</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Reg. Number *
              </label>
              <input
                type="text"
                required
                value={formData.vehicle_number}
                onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value.toUpperCase() })}
                placeholder="MH 12 AB 4521"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={formData.vehicle_type}
                onChange={(e) => setFormData({ ...formData, vehicle_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
              >
                <option value="Mini Truck">Mini Truck</option>
                <option value="Light Truck">Light Truck</option>
                <option value="Truck">Heavy Truck</option>
                <option value="SUV">SUV</option>
                <option value="Van">Van</option>
                <option value="Auto / 3-Wheeler">Auto / 3-Wheeler</option>
                <option value="Car / Sedan">Car / Sedan</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Make / Model</label>
              <input
                type="text"
                value={formData.model_name}
                onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                placeholder="Tata Ace (2022)"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Name *</label>
              <input
                type="text"
                required
                value={formData.owner_name}
                onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                placeholder="Ramesh Patil"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Owner Phone</label>
              <input
                type="text"
                value={formData.owner_phone}
                onChange={(e) => setFormData({ ...formData, owner_phone: e.target.value })}
                placeholder="+91 98231 12345"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assign Worker</label>
              <select
                value={formData.assigned_worker_id}
                onChange={(e) => setFormData({ ...formData, assigned_worker_id: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- No Worker Assigned --</option>
                {workers.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.worker_code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {!isEdit && (
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Initial Document Expiry Dates (Optional)
              </span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">Insurance Expiry</label>
                  <input
                    type="date"
                    value={insuranceDate}
                    onChange={(e) => setInsuranceDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">PUC Expiry</label>
                  <input
                    type="date"
                    value={pucDate}
                    onChange={(e) => setPucDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-0.5">RC Expiry</label>
                  <input
                    type="date"
                    value={rcDate}
                    onChange={(e) => setRcDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50"
            >
              {submitting ? "Saving..." : isEdit ? "Update Vehicle" : "Add Vehicle"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Worker Add / Edit Modal
function WorkerModal({ isOpen, worker, vehicles, onClose, onSuccess }) {
  const isEdit = !!worker;
  const [formData, setFormData] = useState({
    worker_code: worker ? worker.worker_code : `WRK-00${Math.floor(Math.random() * 90 + 10)}`,
    name: worker ? worker.name : "",
    blood_group: worker ? worker.blood_group : "O+",
    phone: worker ? worker.phone : "",
    email: worker ? worker.email || "" : "",
    license_no: worker ? worker.license_no : "",
    license_type: worker ? worker.license_type : "LMV",
    license_expiry: worker ? worker.license_expiry : "",
    status: worker ? worker.status : "Active",
    assigned_vehicle_id: worker && worker.assigned_vehicle_id ? worker.assigned_vehicle_id : "",
    notes: worker ? worker.notes || "" : "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.license_no.trim() || !formData.license_expiry) {
      setError("Worker name, license number, and license expiry date are required.");
      return;
    }

    try {
      setSubmitting(true);
      const url = isEdit ? `/api/workers/${worker.id}` : "/api/workers";
      const method = isEdit ? "PUT" : "POST";

      const payload = {
        ...formData,
        assigned_vehicle_id: formData.assigned_vehicle_id ? parseInt(formData.assigned_worker_id || formData.assigned_vehicle_id) : null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to save worker");
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 p-6 shadow-xl animate-modal my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Icon name="hard-hat" size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEdit ? "Edit Worker" : "Add Worker"}
              </h3>
              <p className="text-xs text-slate-400">Manage driver credentials and vehicle assignment</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
            &times;
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Worker ID *</label>
              <input
                type="text"
                required
                value={formData.worker_code}
                onChange={(e) => setFormData({ ...formData, worker_code: e.target.value.toUpperCase() })}
                placeholder="WRK-002"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase font-mono text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Deepak Sharma"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
              <input
                type="text"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+91 98110 22002"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Blood Group</label>
              <select
                value={formData.blood_group}
                onChange={(e) => setFormData({ ...formData, blood_group: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
              >
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
              >
                <option value="Active">Active</option>
                <option value="On Leave">On Leave</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">License No. *</label>
              <input
                type="text"
                required
                value={formData.license_no}
                onChange={(e) => setFormData({ ...formData, license_no: e.target.value.toUpperCase() })}
                placeholder="DL0120180054321"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs uppercase font-mono text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">License Type</label>
              <select
                value={formData.license_type}
                onChange={(e) => setFormData({ ...formData, license_type: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
              >
                <option value="LMV">LMV (Light Motor)</option>
                <option value="HMV">HMV (Heavy Motor)</option>
                <option value="MCWG">MCWG (Two-Wheeler)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                License Expiry *
              </label>
              <input
                type="date"
                required
                value={formData.license_expiry}
                onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assigned Vehicle
            </label>
            <select
              value={formData.assigned_vehicle_id}
              onChange={(e) => setFormData({ ...formData, assigned_vehicle_id: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800"
            >
              <option value="">-- No Vehicle Assigned --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.vehicle_number} — {v.model_name || v.vehicle_type}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50"
            >
              {submitting ? "Saving..." : isEdit ? "Update Worker" : "Add Worker"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Vehicle Documents Inspector Modal
function VehicleDocumentsModal({ isOpen, vehicle, onClose, onRenewDoc, onAddDoc, onDeleteDoc }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
      <div className="w-full max-w-2xl rounded-2xl bg-white border border-slate-200 p-6 shadow-xl animate-modal my-8">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 font-mono">
                {vehicle.vehicle_number}
              </h3>
              <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600">
                {vehicle.model_name}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Owner: {vehicle.owner_name} | Assigned: {vehicle.worker_name || "None"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onAddDoc}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              + Attach Document
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700 rounded-lg">
              &times;
            </button>
          </div>
        </div>

        {/* Documents Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase">
                <th className="pb-2.5">Document</th>
                <th className="pb-2.5">Doc / Policy #</th>
                <th className="pb-2.5">Authority</th>
                <th className="pb-2.5">Expiry Date</th>
                <th className="pb-2.5">Status</th>
                <th className="pb-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicle.documents.map((doc) => {
                const badge = getPillBadge(doc.status);
                return (
                  <tr key={doc.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 font-bold text-slate-900">{doc.doc_type}</td>
                    <td className="py-3 font-mono text-slate-600 text-[11px]">{doc.doc_number || "—"}</td>
                    <td className="py-3 text-slate-500">{doc.issuing_authority || "—"}</td>
                    <td className="py-3 font-semibold text-slate-800">
                      {formatDate(doc.expiry_date)}
                    </td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${badge.className}`}>
                        {badge.label}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onRenewDoc(doc)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                        >
                          Renew
                        </button>
                        <button
                          onClick={() => onDeleteDoc(doc)}
                          className="p-1 text-slate-400 hover:text-red-600"
                        >
                          <Icon name="trash-2" size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// Quick Renew Modal
function RenewModal({ isOpen, vehicle, doc, onClose, onSuccess }) {
  const [newDate, setNewDate] = useState("");
  const [newDocNo, setNewDocNo] = useState(doc.doc_number || "");
  const [submitting, setSubmitting] = useState(false);

  const setPreset = (months) => {
    const base = new Date();
    base.setMonth(base.getMonth() + months);
    setNewDate(base.toISOString().split("T")[0]);
  };

  const handleRenew = async (e) => {
    e.preventDefault();
    if (!newDate) return;

    try {
      setSubmitting(true);
      const params = new URLSearchParams({ new_expiry_date: newDate });
      if (newDocNo.trim()) params.append("new_doc_number", newDocNo.trim());

      const res = await fetch(`/api/documents/${doc.id}/renew?${params.toString()}`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Renewal failed");
      onSuccess();
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-xl animate-modal">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-base font-bold text-slate-900">
            Renew {doc.doc_type}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            &times;
          </button>
        </div>

        <form onSubmit={handleRenew} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <p className="text-slate-500">
              Vehicle: <strong className="text-slate-800 font-mono">{vehicle.vehicle_number}</strong>
            </p>
            <p className="text-slate-500">
              Current Expiry: <strong>{formatDate(doc.expiry_date)}</strong>
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Quick Extension</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreset(12)}
                className="py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                +1 Year
              </button>
              <button
                type="button"
                onClick={() => setPreset(6)}
                className="py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                +6 Months
              </button>
              <button
                type="button"
                onClick={() => setPreset(3)}
                className="py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
              >
                +3 Months
              </button>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Expiry Date *</label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Policy / Certificate Number</label>
            <input
              type="text"
              value={newDocNo}
              onChange={(e) => setNewDocNo(e.target.value)}
              placeholder="e.g. Updated Policy Number"
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !newDate}
              className="px-5 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm disabled:opacity-50"
            >
              {submitting ? "Renewing..." : "Confirm Renewal"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Document Add Modal
function DocumentModal({ isOpen, vehicle, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    doc_type: "Insurance",
    doc_number: "",
    issuing_authority: "",
    expiry_date: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.expiry_date) return;

    try {
      setSubmitting(true);
      const res = await fetch(`/api/vehicles/${vehicle.id}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error("Failed to add document");
      onSuccess();
    } catch (e) {
      alert(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-xl animate-modal">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-base font-bold text-slate-900">
            Attach Document to {vehicle.vehicle_number}
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Document Type *</label>
            <select
              value={formData.doc_type}
              onChange={(e) => setFormData({ ...formData, doc_type: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            >
              <option value="Insurance">Insurance Policy</option>
              <option value="PUC">Pollution Under Control (PUC)</option>
              <option value="RC">Registration Certificate (RC)</option>
              <option value="NOC">No Objection Certificate (NOC)</option>
              <option value="Fitness">Fitness Certificate</option>
              <option value="Road Tax">Road Tax Token</option>
              <option value="Driving License">Driving License</option>
              <option value="Permit">Permit</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Document / Certificate #</label>
            <input
              type="text"
              value={formData.doc_number}
              onChange={(e) => setFormData({ ...formData, doc_number: e.target.value })}
              placeholder="e.g. POL-99210"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Issuing Authority / Company</label>
            <input
              type="text"
              value={formData.issuing_authority}
              onChange={(e) => setFormData({ ...formData, issuing_authority: e.target.value })}
              placeholder="e.g. HDFC ERGO or RTO Pune"
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
            <input
              type="date"
              required
              value={formData.expiry_date}
              onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.expiry_date}
              className="px-5 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {submitting ? "Saving..." : "Attach Document"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Send Alert Modal
function SendAlertModal({ isOpen, vehicle, doc, onClose, onSuccess }) {
  const [channel, setChannel] = useState("Email");
  const [recipient, setRecipient] = useState(vehicle.owner_email || "+91 98110 22002");
  const [submitting, setSubmitting] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await fetch("/api/notifications/send-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: doc.id,
          channel: channel,
          custom_recipient: recipient,
        }),
      });
      onSuccess();
    } catch (e) {
      alert("Failed to send alert: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-xl animate-modal text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-base font-bold text-slate-900">Send Expiry Reminder</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            &times;
          </button>
        </div>

        <form onSubmit={handleSend} className="space-y-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Channel</label>
            <div className="grid grid-cols-3 gap-2">
              {["Email", "SMS", "In-App"].map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setChannel(c)}
                  className={`py-1.5 rounded-lg font-semibold border ${
                    channel === c
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-slate-600 border-slate-200"
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Recipient</label>
            <input
              type="text"
              required
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-slate-600 space-y-1">
            <span className="font-bold text-[10px] uppercase text-slate-400">Notice Preview:</span>
            <p className="text-[11px] leading-relaxed">
              Reminder: The {doc.doc_type} for vehicle <strong>{vehicle.vehicle_number}</strong>{" "}
              expires on <strong>{formatDate(doc.expiry_date)}</strong>. Please arrange for renewal.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
            >
              {submitting ? "Sending..." : "Dispatch Alert"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Settings Modal
function SettingsModal({ isOpen, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 shadow-xl animate-modal text-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <h3 className="text-base font-bold text-slate-900">Fleet Settings</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700">
            &times;
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Company / Fleet Name</label>
            <input
              type="text"
              defaultValue="Apex Logistics Pvt Ltd"
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Default Expiry Reminder Alert</label>
            <select defaultValue="30" className="w-full px-3 py-2 rounded-xl border border-slate-200">
              <option value="30">30 Days in advance</option>
              <option value="15">15 Days in advance</option>
              <option value="7">7 Days in advance</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Admin Notification Email</label>
            <input
              type="email"
              defaultValue="riya.diwakar@apexlogistics.in"
              className="w-full px-3 py-2 rounded-xl border border-slate-200"
            />
          </div>

          <div className="pt-2">
            <button
              onClick={() => {
                alert("Settings saved successfully!");
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
            >
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Render into DOM
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
