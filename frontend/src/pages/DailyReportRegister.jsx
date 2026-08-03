import React, { useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const sampleReports = [
  {
    date: "2026-08-03",
    purchase: 2,
    gatePass: 3,
    manufacturing: 2,
  },
  {
    date: "2026-08-02",
    purchase: 1,
    gatePass: 2,
    manufacturing: 1,
  },
  {
    date: "2026-08-01",
    purchase: 3,
    gatePass: 1,
    manufacturing: 2,
  },
  {
    date: "2026-07-31",
    purchase: 2,
    gatePass: 2,
    manufacturing: 3,
  },
];

export default function DailyReportRegister() {
  const today = new Date().toISOString().split("T")[0];

  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [search, setSearch] = useState("");

  const filteredReports = useMemo(() => {
    return sampleReports.filter((report) => {
      const matchSearch = report.date.includes(search);

      const matchDate = report.date >= fromDate && report.date <= toDate;

      return matchSearch && matchDate;
    });
  }, [fromDate, toDate, search]);

  return (
    <div className="container-fluid mt-4">
      <div className="card shadow">
        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">Daily Report Register</h4>
        </div>

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
                  <th width="12%" className="text-center">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredReports.length > 0 ? (
                  filteredReports.map((row, index) => (
                    <tr key={index}>
                      <td>{row.date}</td>

                      <td className="text-center">{row.purchase}</td>

                      <td className="text-center">{row.gatePass}</td>

                      <td className="text-center">{row.manufacturing}</td>

                      <td className="text-center">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() =>
                            alert(`Open Daily Report : ${row.date}`)
                          }
                        >
                          Open
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5" className="text-center text-muted">
                      No reports found.
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
