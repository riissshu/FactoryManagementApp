import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import api from "../services/api";
import ImportStockItems from "../components/ImportStockItems";

export default function CreateStockItem({onClose}) {
  
  const emptyItem = {
    id: null,
    itemName: "",
    stockGroup: "",
    unit: "",
    conversion: "",
    openingQty: "",
    lowQtyAlert: "",
  };

  const [item, setItem] = useState(emptyItem);
  const [stockGroups, setStockGroups] = useState([]);
  const [units, setUnits] = useState([]);

   const [showImport, setShowImport] = useState(false);
   const [error, setError] = useState("");

  const [validated, setValidated] = useState(false);
  const [saving, setSaving] = useState(false);

  // Manual switch position. Only meaningful/used while stockGroup is
  // "Packaging Material" — starts Off, and the user fully controls it,
  // with no dependency on Primary Unit.
  const [alternateEnabled, setAlternateEnabled] = useState(false);

  useEffect(() => {
    api.getStockGroups().then(setStockGroups).catch(console.error);
    api.getStockUnits().then(setUnits).catch(console.error);
  }, []);

  // ---- Alternate Unit switch state machine -------------------------------
  // Spec:
  //  - Off at start / on Reset.
  //  - Group = "Packaging Material": switch is a manual toggle, starts Off,
  //    no Primary Unit check involved at all.
  //  - Group = anything else (Raw Material, Finished Goods, or any other
  //    group): switch is fully automatic and NOT user-toggleable —
  //    On whenever Primary Unit is chosen and isn't "Kgs", Off otherwise
  //    (including while Primary Unit is still unselected).
  const isPackagingMaterial = item.stockGroup === "Packaging Material";

  const autoAlternateOn = item.unit !== "" && item.unit !== "Kgs";

  const switchOn = isPackagingMaterial ? alternateEnabled : autoAlternateOn;

  // The switch is only clickable for Packaging Material. For every other
  // group it's locked to whatever the automatic state says — the user
  // cannot manually turn it off while Primary Unit is non-Kgs.
  const switchInteractive = isPackagingMaterial;

  // Purely derived — never stored, so it can't go stale.
  const effectiveAltUnit = switchOn ? "Kgs" : "";

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "stockGroup") {
      const enteringPackaging = value === "Packaging Material";
      const leavingPackaging = item.stockGroup === "Packaging Material" && !enteringPackaging;

      setItem((prev) => ({
        ...prev,
        stockGroup: value,
        // Clear conversion whenever the group change causes the switch to
        // land Off under the new rules, so a stale number can't hide
        // behind a disabled field. Packaging Material always starts Off;
        // other groups depend on the (unchanged) Primary Unit.
        conversion: enteringPackaging
          ? ""
          : prev.unit !== "" && prev.unit !== "Kgs"
            ? prev.conversion
            : "",
      }));

      // Packaging Material always starts its manual switch at Off.
      // Leaving Packaging Material: the manual flag becomes irrelevant
      // (auto mode takes over), reset it anyway so it doesn't carry stale
      // state if the user switches back later.
      if (enteringPackaging || leavingPackaging) {
        setAlternateEnabled(false);
      }

      return;
    }

    if (name === "unit") {
      // For Packaging Material, Primary Unit has zero effect on the
      // switch or conversion — per spec, no unit check applies there.
      if (item.stockGroup === "Packaging Material") {
        setItem((prev) => ({ ...prev, unit: value }));
        return;
      }

      // Automatic groups: clear conversion whenever the unit changes,
      // since a conversion value only makes sense for the unit it was
      // entered against.
      setItem((prev) => ({ ...prev, unit: value, conversion: "" }));
      return;
    }

    setItem((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const resetForm = () => {
    setItem(emptyItem);
    setValidated(false);
    setAlternateEnabled(false);
      setError("");
  };

  const saveItem = async (e) => {
    e.preventDefault();

    if (saving) return;
    setError("");

    const form = e.currentTarget;

    if (!form.checkValidity()) {
      e.stopPropagation();
      setValidated(true);
      return;
    }

    try {
      setValidated(true);
      setSaving(true);

      const stockData = {
        id: item.id,
        item_name: item.itemName.trim(),
        stock_group: item.stockGroup,
        unit: item.unit,
        alternate_unit: effectiveAltUnit,
        conversion: switchOn ? Number(item.conversion) || 0 : 0,
        opening_qty: Number(item.openingQty) || 0,
        low_qty_alert: Number(item.lowQtyAlert) || 0,
      };

      if (item.id) {
        await api.updateStockItem(stockData);
      } else {
        await api.saveStockItem(stockData);
      }

      resetForm();
      
    } catch (error) {
      console.error("Save Error:", error);
      setError(error?.message || "Unable to save stock item.");

    } finally {
      setSaving(false);
    }
  };

  // Low stock alert qty can be changed on its own.
  const saveLowQtyAlertOnly = async () => {
    if (!item.id) return;

    try {
      await api.updateLowQtyAlert(item.id, Number(item.lowQtyAlert) || 0);
      alert("Low stock alert quantity updated.");
    } catch (error) {
      console.error(error);
      alert("Unable to update the alert quantity.");
    }
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">Stock Item Master</h2>

        {error && (
  <div className="alert alert-danger mt-3">
    {error}
  </div>
)}


 <div className="d-flex justify-content-between align-items-center pt-2 pb-2">
      
        <button onClick={onClose} className="btn btn-secondary me-2">Close</button>

        <button
  type="button"
  className="btn btn-primary"
  onClick={() => setShowImport(true)}
>
  Import Excel
</button>   

{showImport && (
  <ImportStockItems
    onClose={() => setShowImport(false)}
  />
)}

        
      </div>


      </div>

      <form
        noValidate
        className={`needs-validation ${validated ? "was-validated" : ""}`}
        onSubmit={saveItem}
      >
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Item Name</label>

                <input
                  type="text"
                  className="form-control"
                  name="itemName"
                  value={item.itemName}
                  onChange={handleChange}
                  required
                />

                <div className="invalid-feedback">Please enter Item Name.</div>
              </div>

              <div className="mb-3">
                <label className="form-label">Stock Group</label>

                <select
                  className="form-select"
                  name="stockGroup"
                  value={item.stockGroup}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Stock Group</option>

                  {stockGroups.map((g) => (
                    <option key={g.id} value={g.name}>
                      {g.name}
                    </option>
                  ))}
                </select>

                <div className="invalid-feedback">
                  Please select Stock Group.
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Primary Unit</label>

                <select
                  className="form-select"
                  name="unit"
                  value={item.unit}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Primary Unit</option>

                  {units.map((u) => (
                    <option key={u.id} value={u.name}>
                      {u.name}
                    </option>
                  ))}
                </select>

                <div className="invalid-feedback">
                  Please select Primary Unit.
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <label className="form-label">Alternate Unit</label>

                  <div className="form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      role="switch"
                      id="alternateUnitSwitch"
                      checked={switchOn}
                      disabled={!switchInteractive}
                      onChange={(e) => {
                        // Only reachable when switchInteractive is true,
                        // i.e. stockGroup === "Packaging Material".
                        const enabled = e.target.checked;

                        setAlternateEnabled(enabled);

                        if (!enabled) {
                          setItem((prev) => ({ ...prev, conversion: "" }));
                        }
                      }}
                    />

                    <label
                      className="form-check-label"
                      htmlFor="alternateUnitSwitch"
                    >
                      {switchOn ? "On" : "Off"}
                    </label>
                  </div>

                  <select
                    className="form-select"
                    name="altUnitDisplay"
                    value={effectiveAltUnit}
                    disabled
                  >
                    {!switchOn && <option value="">-</option>}
                    <option value="Kgs">Kgs</option>
                  </select>
                </div>

                <div className="col-md-6 mb-3">
                  <label className="form-label">Conversion</label>

                  <div className="input-group  has-validation">
                    <span className="input-group-text fw-bold">
                      1 {item.unit}
                    </span>

                    <span className="input-group-text">=</span>

                    <input
                      type="number"
                      className="form-control"
                      name="conversion"
                      value={item.conversion}
                      onChange={handleChange}
                      min="0.01"
                      step="any"
                      required={switchOn}
                      disabled={!switchOn}
                    />

                    <span className="input-group-text fw-bold">Kgs</span>

                    <div className="invalid-feedback">
                      Please enter conversion value.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-md-6">
              <div className="mb-3">
                <label className="form-label">Opening Stock Qty</label>

                <input
                  type="number"
                  className="form-control"
                  name="openingQty"
                  value={item.openingQty}
                  onChange={handleChange}
                  min="0"
                  step="any"
                />
              </div>

              <div className="mb-3">
                <label className="form-label">
                  Low stock alert qty{" "}
                  <span className="text-muted">(optional)</span>
                </label>

                <div className="input-group">
                  <input
                    type="number"
                    className="form-control"
                    name="lowQtyAlert"
                    placeholder="e.g. 50"
                    value={item.lowQtyAlert}
                    onChange={handleChange}
                    min="0"
                    step="any"
                  />

                  {item.id && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      title="Save just the alert quantity, no password needed"
                      onClick={saveLowQtyAlertOnly}
                    >
                      Save alert only
                    </button>
                  )}
                </div>

                <div className="form-text">
                  Dashboard flags this item when balance drops below this
                  quantity.
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <button
              type="submit"
              className="btn btn-primary me-2"
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </button>

            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={resetForm}
              disabled={saving}
            >
              Reset
            </button>
          </div>
        </div>
      </form>

                  <button className="btn btn-secondary" onClick={onClose}>Close</button>



           

    </div>
  );
}