# How to Use Takeoff Engine — Client Guide

This guide explains how to prepare your takeoff file and what you can and can't do with it in the app. It's written for people filling out the spreadsheet — no coding knowledge required.

---

## 1. What file types are accepted?

You can upload either format:

- **CSV** (`.csv`) — a plain comma-separated file. Works with any spreadsheet program.
- **Excel** (`.xlsx` or `.xls`) — a normal Excel workbook.

If your file is an Excel workbook with **multiple tabs/sheets**, only the **first sheet** is read. Make sure your takeoff data is on the first tab.

Two ready-to-use templates are available for download directly from the app's upload screen ("Download Sample CSV Template" / "Download Sample Excel Template"), or you can find them in this `public` folder as `sample_takeoff.csv` and `sample_takeoff.xlsx`.

---

## 2. Required columns

Your file's **first row must be a header row** with these exact column names (lowercase, with underscores instead of spaces):

| Column | Required? | Description | Example |
|---|---|---|---|
| `system` | Yes | The utility system this item belongs to | `Sanitary`, `Storm`, `Domestic Water` |
| `item_description` | Yes | What the item is | `Pipe`, `Manhole`, `Gate Valve` |
| `size_spec` | Yes | Size and/or material spec | `6" PVC SDR-35`, `48" Precast` |
| `quantity` | Yes | Numeric amount — no letters or units mixed in | `275`, `3` |
| `unit` | Yes | Unit of measure — `LF` (linear feet) or `EA` (each) | `LF` |
| `avg_depth_ft` | No | Average trench depth in feet, **only used for `LF` pipe items** | `4` (leave blank for `EA` items) |

**Column order does not matter** — the app matches by column name, not position. Extra columns beyond these six are ignored (they won't cause an error, but they also won't be imported).

---

## 3. Rules & boundaries

✅ **What the app CAN do:**
- Import any number of rows.
- Accept `system` as any text value — you're not limited to Sanitary/Storm/Domestic Water, though those are the defaults shown once imported.
- Accept decimal quantities and depths (e.g., `3.5`).
- Leave `avg_depth_ft` blank for `EA` items (it's ignored for anything that isn't `LF`).
- Let you edit, add, or delete rows after import, right inside the app.

🚫 **What the app CANNOT do / will reject:**
- **Missing required fields** — if `system`, `item_description`, `size_spec`, `quantity`, or `unit` is blank in any row, that row is rejected and listed as an error (the rest of the file still imports).
- **Non-numeric quantity or depth** — `quantity` and `avg_depth_ft` must be numbers only. A value like `"275 LF"` or `"approx. 6"` will cause that row to be rejected.
- **Unrecognized units in the grid editor** — once imported, the in-app editor only offers `LF` and `EA` as unit choices. If your source file uses other units (e.g., `CY`, `TON`, `SF`), they will still import, but you may need to manually adjust them (or the unit dropdown) after import.
- **Merged cells / multiple header rows** — the first row of the sheet must be a single, plain header row. Merged cells, titles, or blank rows above the headers will break the import.
- **Formulas as the only cell content without a computed value** — Excel formula cells are read using their last-calculated value. If a cell has never been calculated (e.g., pasted as a formula in a text editor), it may import as blank or an error.
- **Pricing data** — this file format does **not** include cost, labor, or markup information. All pricing (material $/unit, labor hours/unit) and markup percentages (overhead, contingency, profit) are entered separately inside the app after import, not in the CSV/Excel file.

---

## 4. What happens after you upload

1. The app validates every row and shows a list of any errors (with row numbers) so you can fix your source file if needed.
2. Any valid rows are loaded into an editable grid where you can review, correct, add, or remove line items.
3. From there, you (or your estimator) will add pricing and markup details and generate the final cost breakdown or client proposal.

---

## 5. Quick checklist before uploading

- [ ] Header row uses exactly: `system, item_description, size_spec, quantity, unit, avg_depth_ft`
- [ ] No merged cells or extra title rows above the header
- [ ] `quantity` and `avg_depth_ft` contain numbers only (no units or text)
- [ ] `unit` is `LF` or `EA` (other values will need manual correction after import)
- [ ] Takeoff data is on the **first sheet/tab** if using Excel
- [ ] No completely blank required fields

If you run into an error message after uploading, it will tell you the exact row number and what's wrong — fix that row in your spreadsheet and re-upload.
