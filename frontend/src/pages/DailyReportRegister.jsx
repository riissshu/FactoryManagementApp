import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import "bootstrap/dist/css/bootstrap.min.css";

export default function DailyReportRegister({ openDailyReport }) {
  const today = new Date().toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [search, setSearch] = useState("");
  const [reports, setReports] = useState([]);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const data = await api.getDailyReports();

      setReports(data);
    } catch (error) {
      console.error(error);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchSearch = report.report_date.includes(search);

      const matchDate =
        report.report_date >= fromDate && report.report_date <= toDate;

      return matchSearch && matchDate;
    });
  }, [reports, fromDate, toDate, search]);

  const openReport = (id) => {
    openDailyReport(id);
  };

  return (
    <div className="container-fluid">

      
          <h4 className="mb-0">Daily Report Register</h4>
      

        <div className="card-body">
          <div className="row mb-4">
            <div className="col-md-3">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-control"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>

            <div className="col-md-3">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-control"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>

            <div className="col-md-4">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search date..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive">
            <table className="table table-bordered table-hover">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th className="text-center">Purchase</th>
                  <th className="text-center">Gate Pass</th>
                  <th className="text-center">Manufacturing</th>
                </tr>
              </thead>

              <tbody>
                {filteredReports.length > 0 ? (
                  filteredReports.map((row, index) => (
                    <tr
                      key={row.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => openReport(row.id)}
                    >
                      <td>{row.report_date}</td>

                      <td className="text-center">{row.purchase_count}</td>

                      <td className="text-center">{row.gatepass_count}</td>

                      <td className="text-center">{row.manufacturing_count}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-muted">
                      No reports found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      
    </div>
  );
}
