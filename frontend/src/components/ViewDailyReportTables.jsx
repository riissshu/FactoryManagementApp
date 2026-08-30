import React from "react";

const getItemName = (stockItems, itemId) => {
  const item = stockItems.find(
    (stockItem) => String(stockItem.id) === String(itemId),
  );

  return item?.item_name || itemId || "-";
};

const getItemUnit = (stockItems, itemId) => {
  const item = stockItems.find(
    (stockItem) => String(stockItem.id) === String(itemId),
  );

  return item?.unit || "-";
};

const totalQty = (items = []) =>
  items.reduce((total, row) => total + (Number(row.qty) || 0), 0);

const headerStyle = {
  backgroundColor: "#f8f9fa",
  borderColor: "#dee2e6",
};

const totalStyle = {
  backgroundColor: "#f8f9fa",
  borderColor: "#dee2e6",
};

export default function PreviewDailyReportTables({
  purchases = [],
  gatePasses = [],
  manufactured = [],
  stockItems = [],
}) {
  return (
    <>
      {/* =====================================================
          PURCHASES
      ===================================================== */}

      <section className="mb-5">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h5 className="fw-semibold mb-1">Purchase Entries</h5>

            <small className="text-muted">Material received</small>
          </div>

          <span className="text-muted small">{purchases.length} Entries</span>
        </div>

        <div className="table-responsive">
          <table className="table table-bordered align-middle mb-0">
            <thead>
              <tr>
                <th
                  style={{
                    ...headerStyle,
                    width: 55,
                  }}
                  className="text-center"
                >
                  #
                </th>

                <th
                  style={{
                    ...headerStyle,
                    width: 150,
                  }}
                >
                  Purchase No.
                </th>

                <th
  style={{
    ...headerStyle,
    width: 180,
  }}
>
  Supplier Name
</th>

                <th style={headerStyle}>Stock Item</th>

                <th
                  style={{
                    ...headerStyle,
                    width: 90,
                  }}
                >
                  Unit
                </th>

                <th
                  style={{
                    ...headerStyle,
                    width: 120,
                  }}
                  className="text-end"
                >
                  Quantity
                </th>
              </tr>
            </thead>

            <tbody>
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No purchase entries.
                  </td>
                </tr>
              ) : (
                purchases.map((entry, index) => (
                  <React.Fragment key={index}>
                    {entry.items.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {rowIndex === 0 && (
                          <>
                            <td
                              rowSpan={entry.items.length}
                              className="text-center fw-semibold"
                            >
                              {index + 1}
                            </td>

                            <td
                              rowSpan={entry.items.length}
                              className="fw-semibold"
                            >
                              {entry.purchaseNo}
                            </td>

                            <td
  rowSpan={entry.items.length}
>
  {entry.supplierName || "-"}
</td>
                          </>
                        )}

                        <td>{getItemName(stockItems, row.item)}</td>

                        <td>{getItemUnit(stockItems, row.item)}</td>

                        <td className="text-end">{row.qty}</td>
                      </tr>
                    ))}

                    <tr style={totalStyle} className="fw-semibold">
                      <td colSpan="6" className="text-end py-2">
                        <span className="text-muted me-2">Total Qty:</span>

                        {totalQty(entry.items)}
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================
          DISPATCH
      ===================================================== */}

      <section className="mb-5">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h5 className="fw-semibold mb-1">Dispatch Entries</h5>

            <small className="text-muted">Material dispatched</small>
          </div>

          <span className="text-muted small">{gatePasses.length} Entries</span>
        </div>

        <div className="table-responsive">
          <table className="table table-bordered align-middle mb-0">
            <thead>
              <tr>
                <th
                  style={{
                    ...headerStyle,
                    width: 55,
                  }}
                  className="text-center"
                >
                  #
                </th>

                <th
                  style={{
                    ...headerStyle,
                    width: 150,
                  }}
                >
                  Gate Pass No.
                </th>

                <th style={headerStyle}>Stock Item</th>

                <th
                  style={{
                    ...headerStyle,
                    width: 90,
                  }}
                >
                  Unit
                </th>

                <th
                  style={{
                    ...headerStyle,
                    width: 120,
                  }}
                  className="text-end"
                >
                  Quantity
                </th>
              </tr>
            </thead>

            <tbody>
              {gatePasses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="text-center text-muted py-4">
                    No dispatch entries.
                  </td>
                </tr>
              ) : (
                gatePasses.map((entry, index) => (
                  <React.Fragment key={index}>
                    {entry.items.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {rowIndex === 0 && (
                          <>
                            <td
                              rowSpan={entry.items.length}
                              className="text-center fw-semibold"
                            >
                              {index + 1}
                            </td>

                            <td
                              rowSpan={entry.items.length}
                              className="fw-semibold"
                            >
                              {entry.gatePassNo}
                            </td>
                          </>
                        )}

                        <td>{getItemName(stockItems, row.item)}</td>

                        <td>{getItemUnit(stockItems, row.item)}</td>

                        <td className="text-end">{row.qty}</td>
                      </tr>
                    ))}

                    <tr style={totalStyle} className="fw-semibold">
                      <td colSpan="5" className="text-end py-2">
                        <span className="text-muted me-2">Total Qty:</span>

                        {totalQty(entry.items)}
                      </td>
                    </tr>
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =====================================================
          MANUFACTURING
      ===================================================== */}

      <section className="mb-4">
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div>
            <h5 className="fw-semibold mb-1">Manufacturing Entries</h5>

            <small className="text-muted">Consumption and production</small>
          </div>

          <span className="text-muted small">
            {manufactured.length} Batches
          </span>
        </div>

        {manufactured.length === 0 ? (
          <div className="table-responsive">
            <table className="table table-bordered align-middle mb-0">
              <tbody>
                <tr>
                  <td className="text-center text-muted py-4">
                    No manufacturing entries.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : (
          manufactured.map((entry, index) => {
            const maxRows = Math.max(
              entry.consumption.length,
              entry.production.length,
            );

            return (
              <div key={index} className="mb-4">
                <div className="table-responsive">
                  <table className="table table-bordered align-middle mb-0">
                    <thead>
                      {/* BATCH */}

                      <tr>
                        <th
                          colSpan="7"
                          style={headerStyle}
                          className="fw-semibold"
                        >
                          Batch {index + 1}
                        </th>
                      </tr>

                      {/* MAIN HEADER */}

                      <tr>
                        <th
                          colSpan="3"
                          style={headerStyle}
                          className="text-center"
                        >
                          Consumption
                        </th>

                        <th
                          colSpan="3"
                          style={headerStyle}
                          className="text-center"
                        >
                          Production / Loss
                        </th>

                        <th
                          rowSpan="2"
                          style={{
                            ...headerStyle,
                            width: 120,
                          }}
                          className="text-center"
                        >
                          Status
                        </th>
                      </tr>

                      {/* COLUMN HEADER */}

                      <tr>
                        <th style={headerStyle}>Stock Item</th>

                        <th
                          style={{
                            ...headerStyle,
                            width: 90,
                          }}
                        >
                          Unit
                        </th>

                        <th
                          style={{
                            ...headerStyle,
                            width: 110,
                          }}
                          className="text-end"
                        >
                          Quantity
                        </th>

                        <th style={headerStyle}>Stock Item</th>

                        <th
                          style={{
                            ...headerStyle,
                            width: 90,
                          }}
                        >
                          Unit
                        </th>

                        <th
                          style={{
                            ...headerStyle,
                            width: 110,
                          }}
                          className="text-end"
                        >
                          Quantity
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {Array.from({
                        length: maxRows,
                      }).map((_, rowIndex) => {
                        const consumption = entry.consumption[rowIndex];

                        const production = entry.production[rowIndex];

                        return (
                          <tr key={rowIndex}>
                            <td>
                              {consumption
                                ? getItemName(stockItems, consumption.item)
                                : ""}
                            </td>

                            <td>
                              {consumption
                                ? getItemUnit(stockItems, consumption.item)
                                : ""}
                            </td>

                            <td className="text-end">
                              {consumption ? consumption.qty : ""}
                            </td>

                            <td>
                              {production
                                ? getItemName(stockItems, production.item)
                                : ""}
                            </td>

                            <td>
                              {production
                                ? getItemUnit(stockItems, production.item)
                                : ""}
                            </td>

                            <td className="text-end">
                              {production ? production.qty : ""}
                            </td>

                            {rowIndex === 0 && (
                              <td rowSpan={maxRows} className="text-center">
                                <span className="text-success fw-semibold">
                                  Completed
                                </span>
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {/* TOTALS */}

                      <tr style={totalStyle} className="fw-semibold">
                        <td colSpan="3" className="text-end py-2">
                          <span className="text-muted me-2">
                            Total Consumption:
                          </span>

                          {totalQty(entry.consumption)}
                        </td>

                        <td colSpan="3" className="text-end py-2">
                          <span className="text-muted me-2">
                            Total Production:
                          </span>

                          {totalQty(entry.production)}
                        </td>

                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })
        )}
      </section>
    </>
  );
}
