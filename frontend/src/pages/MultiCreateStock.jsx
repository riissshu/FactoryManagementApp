// import { useEffect, useState } from "react";
// import api from "../services/api";
// import PageHeader from "../components/PageHeader";


// const createEmptyRow = (groups = [], units = []) => {
 

//   return {
//     item_name: "",
//     stock_group: "",
//     unit: "",
//     alternate_unit: defaultUnit === "Kg" ? "" : "Kg",
//     conversion: 0,
//     opening_qty: 0,
//   };
// };

// export default function MultiCreateStock() {
//   const [items, setItems] = useState([]);
//   const [saving, setSaving] = useState(false);
//   const [groups, setGroups] = useState([]);
//   const [units, setUnits] = useState([]);

//     const addRow = () => {
//     setItems((currentItems) => [
//       ...currentItems,
//       createEmptyRow(groups, units),
//     ]);
//   };
  
//     const update = (index, field, value) => {
//     setItems((currentItems) =>
//       currentItems.map((item, rowIndex) => {
//         if (rowIndex !== index) {
//           return item;
//         }

//         if (field === "unit") {
//           return {
//             ...item,
//             unit: value,
//             alternate_unit: value === "Kg" ? "" : "Kg",
//             conversion: value === "Kg" ? 0 : item.conversion,
//           };
//         }

//         return {
//           ...item,
//           [field]: value,
//         };
//       }),
//     );
//   };

//   const save = async () => {
//     // Ignore completely empty rows
//     const filledItems = items.filter(
//       (item) => item.item_name.trim() !== "",
//     );

//     if (filledItems.length === 0) {
//       alert("Please enter at least one stock item.");
//       return;
//     }

//     // Validate group
//     const missingGroup = filledItems.find(
//       (item) => !item.stock_group,
//     );

//     if (missingGroup) {
//       alert("Please select a stock group for every item.");
//       return;
//     }

//     // Validate unit
//     const missingUnit = filledItems.find(
//       (item) => !item.unit,
//     );

//     if (missingUnit) {
//       alert("Please select a unit for every item.");
//       return;
//     }

//     // Check duplicate names within this entry
//     const names = filledItems.map((item) =>
//       item.item_name.trim().toLowerCase(),
//     );

//     const duplicateNames = names.filter(
//       (name, index) => names.indexOf(name) !== index,
//     );

//     if (duplicateNames.length > 0) {
//       alert("Duplicate stock item names are not allowed.");
//       return;
//     }

//     // Prepare data for API
//     const stockItems = filledItems.map((item) => ({
//       item_name: item.item_name.trim(),
//       stock_group: item.stock_group,
//       unit: item.unit,
//       alternate_unit: item.alternate_unit || "",
//       conversion: Number(item.conversion) || 0,
//       opening_qty: Number(item.opening_qty) || 0,
//     }));

//     setSaving(true);

//     try {
//       // Use the existing bulk-create API
//       await api.bulkCreateStockItems(stockItems);

//       alert(
//         `${stockItems.length} stock item${
//           stockItems.length > 1 ? "s" : ""
//         } created successfully.`,
//       );

//       resetRows();
//     } catch (error) {
//       console.error("Unable to create stock items:", error);

//       alert(
//         error?.message ||
//           "Unable to create stock items.",
//       );
//     } finally {
//       setSaving(false);
//     }
//   };



//   return (
//     <div className="page-shell">
//       <PageHeader
//         eyebrow="Masters"
//         title="Multi create stock items"
//         actions={
//           <button className="btn btn-primary" disabled={saving} onClick={save}>
//             {saving ? "Saving..." : "Save all changes"}
//           </button>
//         }
//       />
//       <div className="content-card">
//         <p className="text-muted">
//           Update several stock items at once. Changes are protected by the
//           master password.
//         </p>
//         <div className="table-responsive">
//           <table className="table app-table">
//             <thead>
//               <tr>
//                 <th>Item</th>
//                 <th>Group</th>
//                 <th>Unit</th>
//                 <th>Conversion to Kg</th>
//                 <th>Opening qty</th>
//               </tr>
//             </thead>
//             <tbody>
//               {items.map((item, index) => (
//                 <tr key={item.id}>
//                   <td>
//                     <input
//                       className="form-control"
//                       value={item.item_name}
//                       onChange={(event) =>
//                         update(index, "item_name", event.target.value)
//                       }
//                     />
//                   </td>
//                   <td>
//                     <select
//                       className="form-select"
//                       value={item.stock_group}
//                       onChange={(event) =>
//                         update(index, "stock_group", event.target.value)
//                       }
//                     >
//                       {groups.map((group) => (
//                         <option key={group}>{group}</option>
//                       ))}
//                     </select>
//                   </td>
//                   <td>
//                     <select
//                       className="form-select"
//                       value={item.unit}
//                       onChange={(event) =>
//                         update(index, "unit", event.target.value)
//                       }
//                     >
//                       {units.map((unit) => (
//                         <option key={unit}>{unit}</option>
//                       ))}
//                     </select>
//                   </td>
//                   <td>
//                     <input
//                       type="number"
//                       className="form-control"
//                       disabled={item.unit === "Kg"}
//                       value={item.conversion || ""}
//                       onChange={(event) =>
//                         update(index, "conversion", event.target.value)
//                       }
//                     />
//                   </td>
//                   <td>
//                     <input
//                       type="number"
//                       className="form-control"
//                       value={item.opening_qty}
//                       onChange={(event) =>
//                         update(index, "opening_qty", event.target.value)
//                       }
//                     />
//                   </td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//          <div className="mt-3">
//           <button
//             type="button"
//             className="btn btn-outline-primary"
//             onClick={addRow}
//           >
//             <i className="bi bi-plus-lg me-1"></i>
//             Add Row
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }







import { useEffect, useState } from "react";
import api from "../services/api";
import PageHeader from "../components/PageHeader";

const createEmptyRow = (groups = [], units = []) => {
  const defaultUnit = units[0]?.name || "";

  return {
    item_name: "",
    stock_group: groups[0]?.name || "",
    unit: defaultUnit,
    alternate_unit: defaultUnit === "Kg" ? "" : "Kg",
    conversion: 0,
    opening_qty: 0,
  };
};

export default function MultiCreateStock() {
  const [items, setItems] = useState([]);
  const [groups, setGroups] = useState([]);
  const [units, setUnits] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [groupList, unitList] = await Promise.all([
          api.getStockGroups(),
          api.getStockUnits(),
        ]);

        const loadedGroups = groupList || [];
        const loadedUnits = unitList || [];

        setGroups(loadedGroups);
        setUnits(loadedUnits);

        // Start with 2 empty rows
        setItems([
          createEmptyRow(loadedGroups, loadedUnits),
          createEmptyRow(loadedGroups, loadedUnits),
        ]);
      } catch (error) {
        console.error("Unable to load stock groups and units:", error);
        alert("Unable to load stock groups and units.");
      } finally {
        setLoading(false);
      }
    };

    loadMasters();
  }, []);

  const updateItem = (index, field, value) => {
    setItems((currentItems) =>
      currentItems.map((item, rowIndex) => {
        if (rowIndex !== index) {
          return item;
        }

        if (field === "unit") {
          return {
            ...item,
            unit: value,
            alternate_unit: value === "Kg" ? "" : "Kg",
            conversion: value === "Kg" ? 0 : item.conversion,
          };
        }

        return {
          ...item,
          [field]: value,
        };
      }),
    );
  };

  const addRow = () => {
    setItems((currentItems) => [
      ...currentItems,
      createEmptyRow(groups, units),
    ]);
  };

  const removeRow = (index) => {
    setItems((currentItems) => {
      if (currentItems.length <= 1) {
        return currentItems;
      }

      return currentItems.filter((_, rowIndex) => rowIndex !== index);
    });
  };

  const resetRows = () => {
    setItems([
      createEmptyRow(groups, units),
      createEmptyRow(groups, units),
    ]);
  };

  const save = async () => {
    // Ignore completely empty rows
    const filledItems = items.filter(
      (item) => item.item_name.trim() !== "",
    );

    if (filledItems.length === 0) {
      alert("Please enter at least one stock item.");
      return;
    }

    // Validate group
    const missingGroup = filledItems.find(
      (item) => !item.stock_group,
    );

    if (missingGroup) {
      alert("Please select a stock group for every item.");
      return;
    }

    // Validate unit
    const missingUnit = filledItems.find(
      (item) => !item.unit,
    );

    if (missingUnit) {
      alert("Please select a unit for every item.");
      return;
    }

    // Check duplicate names within this entry
    const names = filledItems.map((item) =>
      item.item_name.trim().toLowerCase(),
    );

    const duplicateNames = names.filter(
      (name, index) => names.indexOf(name) !== index,
    );

    if (duplicateNames.length > 0) {
      alert("Duplicate stock item names are not allowed.");
      return;
    }

    // Prepare data for API
    const stockItems = filledItems.map((item) => ({
      item_name: item.item_name.trim(),
      stock_group: item.stock_group,
      unit: item.unit,
      alternate_unit: item.alternate_unit || "",
      conversion: Number(item.conversion) || 0,
      opening_qty: Number(item.opening_qty) || 0,
    }));

    setSaving(true);

    try {
      // Use the existing bulk-create API
      await api.bulkCreateStockItems(stockItems);

      alert(
        `${stockItems.length} stock item${
          stockItems.length > 1 ? "s" : ""
        } created successfully.`,
      );

      resetRows();
    } catch (error) {
      console.error("Unable to create stock items:", error);

      alert(
        error?.message ||
          "Unable to create stock items.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="page-shell">
        <PageHeader
          eyebrow="Masters"
          title="Multi create stock items"
        />

        <div className="content-card">
          <p className="text-muted mb-0">
            Loading stock groups and units...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <PageHeader
        eyebrow="Masters"
        title="Multi create stock items"
        actions={
          <button
            type="button"
            className="btn btn-primary"
            disabled={saving}
            onClick={save}
          >
            {saving ? "Saving..." : "Save all items"}
          </button>
        }
      />

      <div className="content-card">
        <p className="text-muted">
          Create multiple stock items at once. Leave unused rows blank.
        </p>

        <div className="table-responsive">
          <table className="table app-table align-middle">
            <thead>
              <tr>
                <th>Item</th>
                <th>Group</th>
                <th>Unit</th>
                <th>Alternate Unit</th>
                <th>Conversion to Kg</th>
                <th>Opening Qty</th>
                <th style={{ width: "60px" }}></th>
              </tr>
            </thead>

            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  {/* Item */}
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Stock item name"
                      value={item.item_name}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "item_name",
                          event.target.value,
                        )
                      }
                    />
                  </td>

                  {/* Group */}
                  <td>
                    <select
                      className="form-select"
                      value={item.stock_group}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "stock_group",
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        Select group
                      </option>

                      {groups.map((group) => (
                        <option
                          key={group.id}
                          value={group.name}
                        >
                          {group.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Unit */}
                  <td>
                    <select
                      className="form-select"
                      value={item.unit}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "unit",
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        Select unit
                      </option>

                      {units.map((unit) => (
                        <option
                          key={unit.id}
                          value={unit.name}
                        >
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Alternate Unit */}
                  <td>
                    <input
                      type="text"
                      className="form-control"
                      value={item.alternate_unit}
                      readOnly
                    />
                  </td>

                  {/* Conversion */}
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-control"
                      disabled={
                        !item.unit ||
                        item.unit === "Kg"
                      }
                      value={item.conversion || ""}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "conversion",
                          event.target.value,
                        )
                      }
                    />
                  </td>

                  {/* Opening Qty */}
                  <td>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      className="form-control"
                      value={item.opening_qty}
                      onChange={(event) =>
                        updateItem(
                          index,
                          "opening_qty",
                          event.target.value,
                        )
                      }
                    />
                  </td>

                  {/* Remove */}
                  <td className="text-center">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-danger"
                      title="Remove row"
                      disabled={items.length <= 1}
                      onClick={() => removeRow(index)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-3">
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={addRow}
          >
            <i className="bi bi-plus-lg me-1"></i>
            Add Row
          </button>
        </div>
      </div>
    </div>
  );
}