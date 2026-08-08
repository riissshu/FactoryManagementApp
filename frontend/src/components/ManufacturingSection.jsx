const blank = () => ({ item: "", qty: "", unit: "" });
const sum = (rows) =>
  rows.reduce((total, row) => total + (Number(row.qty) || 0), 0);
export default function ManufacturingSection({
  entries,
  setEntries,
  stockItems,
}) {
  const mutate = (entryIndex, side, rowIndex, field, value) =>
    setEntries(
      entries.map((entry, index) =>
        index !== entryIndex
          ? entry
          : {
              ...entry,
              [side]: entry[side].map((row, index) =>
                index !== rowIndex
                  ? row
                  : {
                      ...row,
                      [field]: value,
                      ...(field === "item"
                        ? {
                            unit:
                              stockItems.find(
                                (item) => item.id === Number(value),
                              )?.unit || "",
                          }
                        : {}),
                    },
              ),
            },
      ),
    );
  const add = (entryIndex, side) =>
    setEntries(
      entries.map((entry, index) =>
        index === entryIndex
          ? { ...entry, [side]: [...entry[side], blank()] }
          : entry,
      ),
    );
  const addLoss = (entryIndex) =>
    setEntries(
      entries.map((entry, index) => {
        if (index !== entryIndex) return entry;
        const difference = sum(entry.consumption) - sum(entry.production);
        return difference > 0
          ? {
              ...entry,
              production: [
                ...entry.production,
                {
                  item: "",
                  qty: difference.toFixed(2),
                  unit: "",
                  isLoss: true,
                },
              ],
            }
          : entry;
      }),
    );
  return (
    <section className="report-section">
      <div className="section-title">
        <h2>Manufacturing</h2>
        <button
          className="btn btn-outline-success btn-sm"
          onClick={() =>
            setEntries([
              ...entries,
              { consumption: [blank()], production: [blank()] },
            ])
          }
        >
          + Add batch
        </button>
      </div>
      {entries.map((entry, entryIndex) => {
        const consumption = sum(entry.consumption);
        const production = sum(entry.production);
        const difference = consumption - production;
        return (
          <div className="manufacturing-card" key={entryIndex}>
            <div className="manufacturing-head">
              <strong>Batch {entryIndex + 1}</strong>
              <span className={difference === 0 ? "balanced" : "unbalanced"}>
                {difference === 0
                  ? "Balanced"
                  : `${Math.abs(difference).toFixed(2)} ${difference > 0 ? "loss to record" : "over production"}`}
              </span>
              {difference > 0 && (
                <button
                  className="btn btn-warning btn-sm"
                  onClick={() => addLoss(entryIndex)}
                >
                  Add loss row
                </button>
              )}
              <button
                className="btn btn-link text-danger"
                onClick={() =>
                  setEntries(entries.filter((_, index) => index !== entryIndex))
                }
              >
                Remove
              </button>
            </div>
            <div className="row g-3">
              {[
                ["consumption", "Consumption"],
                ["production", "Production / loss"],
              ].map(([side, label]) => (
                <div className="col-lg-6" key={side}>
                  <h3>
                    {label} <small>Total: {sum(entry[side]).toFixed(2)}</small>
                  </h3>
                  <table className="table app-table">
                    <thead>
                      <tr>
                        <th>Item</th>
                        <th>Quantity</th>
                        <th>Unit</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry[side].map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          <td>
                            <select
                              className="form-select"
                              value={row.item}
                              onChange={(event) =>
                                mutate(
                                  entryIndex,
                                  side,
                                  rowIndex,
                                  "item",
                                  event.target.value,
                                )
                              }
                            >
                              <option value="">
                                {row.isLoss
                                  ? "Select loss / waste item"
                                  : "Select item"}
                              </option>
                              {stockItems.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.item_name}
                                </option>
                              ))}
                            </select>
                            {row.isLoss && (
                              <small className="text-warning-emphasis">
                                Material loss
                              </small>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              min="0"
                              className="form-control"
                              value={row.qty}
                              onChange={(event) =>
                                mutate(
                                  entryIndex,
                                  side,
                                  rowIndex,
                                  "qty",
                                  event.target.value,
                                )
                              }
                            />
                          </td>
                          <td>{row.unit || "-"}</td>
                          <td>
                            <button
                              className="icon-button"
                              onClick={() => add(entryIndex, side)}
                            >
                              +
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
