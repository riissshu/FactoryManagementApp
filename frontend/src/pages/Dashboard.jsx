import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";

const recentReports = [
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
];

export default function Dashboard() {

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="container-fluid mt-4">

      <div className="card shadow">

        <div className="card-header bg-primary text-white">
          <h4 className="mb-0">
            Factory Stock Dashboard
          </h4>
        </div>
                <div className="card-body">

          <div className="mb-4">
            <h6>
              Today's Date : 
              <span className="ms-2 fw-bold">
                {today}
              </span>
            </h6>
          </div>


          <h5 className="mb-3">
            Quick Access
          </h5>


          <div className="row mb-4">

            <div className="col-md-3 mb-3">
              <button className="btn btn-outline-primary w-100 py-3">
                Stock Item Master
              </button>
            </div>


            <div className="col-md-3 mb-3">
              <button className="btn btn-outline-success w-100 py-3">
                Daily Report
              </button>
            </div>


            <div className="col-md-3 mb-3">
              <button className="btn btn-outline-warning w-100 py-3">
                Stock Report
              </button>
            </div>


            <div className="col-md-3 mb-3">
              <button className="btn btn-outline-secondary w-100 py-3">
                Daily Report Register
              </button>
            </div>

          </div>


          <h5 className="mb-3">
            Recent Daily Reports
          </h5>


          <div className="table-responsive">

            <table className="table table-bordered table-hover">

              <thead className="table-light">

                <tr>
                  <th>Date</th>
                  <th className="text-center">
                    Purchase
                  </th>
                  <th className="text-center">
                    Gate Pass
                  </th>
                  <th className="text-center">
                    Manufacturing
                  </th>
                </tr>

              </thead>


              <tbody>

                {recentReports.map((row, index) => (

                  <tr key={index}>

                    <td>
                      {row.date}
                    </td>

                    <td className="text-center">
                      {row.purchase}
                    </td>

                    <td className="text-center">
                      {row.gatePass}
                    </td>

                    <td className="text-center">
                      {row.manufacturing}
                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
                  </div>

      </div>

    </div>
  );
}