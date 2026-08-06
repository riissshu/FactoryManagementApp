import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";

export default function Dashboard({ navigate }) {
  const [reports, setReports] = useState([]);
  const [stock, setStock] = useState([]);
  useEffect(() => {
    api
      .getDailyReports()
      .then((data) => setReports(data.slice(0, 5)))
      .catch(console.error);
    api.getStockReport().then(setStock).catch(console.error);
  }, []);
  const lowStock = stock.filter((item) => item.balance_qty < 0).length;
  return (
    <div className="container-fluid mt-4">
      <div className="card shadow">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Dashboard</h4>
        </div>
        <div className="card-body">
          <div className="row mb-4">
            <div className="col-md-4 mb-2">
              <div className="border rounded p-3">
                <div className="text-muted">Stock Items</div>
                <div className="fs-3 fw-bold">{stock.length}</div>
              </div>
            </div>
            <div className="col-md-4 mb-2">
              <div className="border rounded p-3">
                <div className="text-muted">Daily Reports</div>
                <div className="fs-3 fw-bold">{reports.length}</div>
              </div>
            </div>
            <div className="col-md-4 mb-2">
              <div className="border rounded p-3">
                <div className="text-muted">Negative Stock Items</div>
                <div className="fs-3 fw-bold text-danger">{lowStock}</div>
              </div>
            </div>
          </div>
          <div className="row mb-4">
            <div className="col-md-3 mb-2">
              <button
                className="btn btn-outline-primary w-100"
                onClick={() => navigate("stockitem")}
              >
                Stock Item Master
              </button>
            </div>
            <div className="col-md-3 mb-2">
              <button
                className="btn btn-outline-success w-100"
                onClick={() => navigate("dailyreport")}
              >
                 Daily Report
              </button>
            </div>
            <div className="col-md-3 mb-2">
              <button
                className="btn btn-outline-warning w-100"
                onClick={() => navigate("stockreport")}
              >
                Stock Summary
              </button>
            </div>
            <div className="col-md-3 mb-2">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => navigate("dailyreportregister")}
              >
                Daily Report Register
              </button>
            </div>
          </div>
          <h5>Recent Daily Reports</h5>
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th className="text-center">Purchase</th>
                  <th className="text-center">Dispatch</th>
                  <th className="text-center">Manufacturing</th>
                </tr>
              </thead>
              <tbody>
                {reports.length ? (
                  reports.map((report) => (
                    <tr key={report.id}>
                      <td>{report.report_date}</td>
                      <td className="text-center">{report.purchase_count}</td>
                      <td className="text-center">{report.gatepass_count}</td>
                      <td className="text-center">
                        {report.manufacturing_count}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="text-center text-muted">
                      No reports yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
