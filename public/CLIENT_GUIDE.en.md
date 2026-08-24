# How to Use Takeoff Engine — Client Guide

This guide explains how to prepare your takeoff file and how Takeoff Engine's ingestion pipeline processes your spreadsheets.

---

## 1. What file types are accepted?

Takeoff Engine accepts files from all major takeoff software (Bluebeam Revu, PlanSwift, HeavyBid, Trimble/Agtek, Excel, etc.):

- **CSV** (`.csv`) — Plain comma-separated files.
- **Excel** (`.xlsx`, `.xls`, `.xlsm`, `.xlsb`) — Standard and macro-enabled Excel workbooks.

### Multi-Tab Excel Support
If your Excel workbook contains multiple worksheet tabs, the engine automatically scores and selects the active takeoff tab (e.g. `Takeoff`, `Civil Estimate`, `Quantities`). You can also switch between worksheet tabs directly inside the column mapping view if you have multiple sheets to inspect.

Ready-to-use templates and vendor samples are available for download on the upload screen:
- **CSV Template** (`takeoff_sample_template.csv`)
- **Excel Template** (`takeoff_sample_template.xlsx`)
- **Edge Cases Mega Sample** (`sample_edge_cases_takeoff.csv`)
- **Bluebeam Revu Export Sample**
- **PlanSwift Export Sample**
- **Trimble / Agtek Export Sample**

---

## 2. Standard Estimating Fields & Intelligent Auto-Mapping

Takeoff Engine uses **fuzzy alias matching (Levenshtein distance)**. You **do not** need to rename headers to fit rigid names.

| Standard Field | Required? | Canonical Examples / Software Aliases | Description |
|---|---|---|---|
| `system` | Yes | `Trade`, `Phase`, `Division`, `Category`, `Discipline`, `Utility Type`, `Section`, `Classification`, CSI Codes (`02-31-00`, `03 21 00`, `26 24 16`) | The trade or grouping (e.g. `Sanitary`, `Storm`, `Domestic Water`, `Earthwork`, `02 - Existing Conditions`, `26 - Electrical`) |
| `item_description` | Yes | `Item Description`, `Item Name`, `Description`, `Scope`, `Takeoff Item`, `Line Item`, `Activity` | What the line item is (e.g. `Mainline Pipe`, `Precast Manhole`, `Gate Valve`) |
| `size_spec` | Yes | `Size / Spec`, `Pipe Size`, `Dimension`, `Material Class`, `Specification`, `Diameter`, `Rating` | Pipe diameter or material spec (e.g. `8" PVC SDR-35`, `48" Precast`, `6" C900`) |
| `quantity` | Yes | `Quantity`, `Qty`, `Takeoff Qty`, `Total Qty`, `Linear Feet`, `Amount`, `Count`, `Volume`, `Footage` | Numeric quantity or measurement (e.g. `275`, `1,250`, `45.5`, deductive `(350.00)`, `TBD`) |
| `unit` | Yes | `Unit`, `UOM`, `Unit of Measure`, `Measure`, `Units`, `Unit Type` | Trade unit of measure (`LF`, `EA`, `CY`, `SF`, `SY`, `TON`, `LS`, `HR`, or custom units) |
| `avg_depth_ft` | No | `Avg Trench Depth`, `Avg Depth (FT)`, `Depth (ft)`, `Trench Depth`, `Cut Depth`, `Invert Depth` | Optional average trench depth in feet (for trench earthwork & backfill math) |
| `material_cost_per_unit` | No | `Material $/Unit`, `Mat $/Unit`, `Material Cost`, `Unit Price`, `Material Rate`, `Unit Cost`, `Cost/Unit` | Unit material price or cost per unit (e.g. `$42.50`, `$1,350.00`, `$19.0857`) |

*Note: Column ordering and case sensitivity do not matter.*

---

## 3. Resilient Parsing Capabilities

The ingestion pipeline handles raw exports without manual cleanup:

✅ **2D Header Sniffing, Merged Title Banner Skipping & Header Selection:**
- If your spreadsheet has company titles, project names, notes, or empty rows at the top (rows 1–30), the engine automatically locates the true column header row past merged banners.
- You can also manually choose which row contains the table headers using the interactive Header Row selector.
- Handles stacked 2-row headers (e.g. Top: `Trench Dimensions`, Bottom: `Depth (FT)` $\rightarrow$ `Trench Dimensions - Depth (FT)`).

✅ **CSI MasterFormat Trade System Mapping:**
- Recognizes CSI division codes and MasterFormat section numbers (e.g. `02-31-00`, `03 21 00`, `09 22 00`, `26 24 16`, `Division 31`) and automatically maps them to standardized industry trade systems (`02 - Existing Conditions`, `03 - Concrete`, `09 - Finishes`, `26 - Electrical`, `31 - Earthwork`, etc.).

✅ **Material Unit Cost & Currency Formatting Ingestion:**
- Supports optional unit material cost fields (`Material $/Unit`, `Mat $/Unit`, `Material Cost`, `Unit Price`).
- Automatically strips currency symbols (`$`, `€`, `£`, `¥`), formatting commas, and whitespace so unit prices (e.g. `$1,350.00`, `$42.50`, `$19.0857`) flow directly into cost calculations.

✅ **Deductive Change Orders & Accounting Negative Quantities:**
- Retains accounting-formatted negative quantities and values such as `(350.00)` and `-$6,680.00` without dropping negative line items, enabling accurate deductive change orders.

✅ **Placeholder Tokens & Missing Scope Badges:**
- Cells containing placeholders (e.g. `TBD`, `N/A`, `HOLD`, `PENDING`, `BY OTHERS`) are safely ingested with a quantity of `0` and flagged with an interactive **⚠️ Missing Scope / TBD** badge in the estimating grid so scope gaps are clearly flagged for field verification.

✅ **Merged Cell Unmerging & Forward-Fill:**
- When an Excel sheet uses merged cells across categories or section headers, the parent system/phase label is forward-filled down into all child items.

✅ **Subtotal & Section Banner Filtering:**
- Formulas (`=SUM(...)`, `SUBTOTAL`), summary rows (`Sub-Total`, `Grand Total`), metadata, and decorative phase banner dividers (`--- PHASE 1 ---`) are identified and filtered out so they do not duplicate your quantities.
- Checksums are calculated to verify that the parsed line items match your spreadsheet's original summary subtotal.

✅ **Composite Unit & Quantity Sanitization:**
- Values with formatting like `$1,250.00`, accounting negatives `(150.00)`, or embedded unit strings like `"275 LF"` or `"12 EA"` are parsed into their clean numeric value and unit.

✅ **Comprehensive Trade Unit Normalization & Custom Unit Preservation:**
- Messy unit strings are normalized into standard trade units:
  - `lin ft`, `linear feet`, `l.f.`, `ft`, `m`, `meter` $\rightarrow$ `LF`
  - `each`, `pcs`, `e.a.`, `item`, `pza`, `count` $\rightarrow$ `EA`
  - `cu yd`, `c.y.`, `cubic yard`, `m3`, `cu m` $\rightarrow$ `CY`
  - `sq ft`, `s.f.`, `sqft`, `m2`, `m²`, `sq m` $\rightarrow$ `SF`
  - `sq yd`, `s.y.`, `sqyd`, `yd2` $\rightarrow$ `SY`
  - `tn`, `tons`, `tonne`, `t.n.` $\rightarrow$ `TON`
  - `ls`, `lump`, `global`, `lot` $\rightarrow$ `LS`
  - `hr`, `hrs`, `hour`, `man hours` $\rightarrow$ `HR`
- Unmatched custom unit strings (e.g. `ROLLS`, `BUNDLE`, `PALLET`, `TRIP`) are preserved in uppercase rather than forced to linear feet.

✅ **Composite Size Deconstruction:**
- If a takeoff software merges description and size (e.g. `"8\" PVC SDR-35 Mainline"` in the description column), the engine separates the pipe dimension from the line item name.

✅ **Side-by-Side (Multi-Table) Detection:**
- When estimators place different scopes horizontally side-by-side on the same tab separated by column gaps (e.g. Domestic Water in columns A–F and Sanitary Sewer in columns H–M), the engine detects the sub-tables and lets you choose which table area to import in the mapping modal.

✅ **Multi-Line Wraps & Manual Line Breaks (Alt + Enter):**
- Cells with embedded carriage returns (`\r\n` or `\n`) from manual line breaks or notes are sanitized into clean single-line strings without breaking CSV rows.

✅ **Hidden Row & Section Divider Filtering:**
- Rows hidden in Excel (`row.hidden === true` or row height = 0) as well as empty visual divider rows are automatically filtered out.
- *Note on Scope Deletions:* Visual strikethrough font styling is not supported for XLSX/CSV scope elimination. To exclude addendum-deleted items from your takeoff, delete or hide the row in Excel, or mark the quantity cell with a scope placeholder like `HOLD`, `TBD`, or `N/A`.

✅ **Cached Calculated Value Extraction & Broken Formula Handling:**
- Evaluates Excel's cached calculated values (`.v` / `.w`) rather than unevaluated formula strings. Broken formula errors (`#REF!`, `#VALUE!`, `#N/A`) convert gracefully to `null`/`NaN` with clear row-level warnings.

---

## 4. Interactive Column Mapping & Vendor Presets

If a file has ambiguous columns or custom formatting (confidence score < 90%):

- **Interactive Column Mapping Modal:** A confirmation dialog appears with confidence ratings for each detected field.
- **Live 5-Row Preview:** View how your data transforms in real-time as you select columns.
- **Save Vendor / Subcontractor Presets:** Save custom column configurations under a vendor preset name (e.g. `ABC Earthwork Subcontractor`). The engine will remember this mapping and re-apply it when files from that vendor are uploaded.

---

## 5. What Happens After You Upload

- The file is parsed and validated in milliseconds with deterministic rules.
- If any invalid quantities exist, detailed error messages are listed with row numbers so you can review them.
- Valid items populate the interactive estimating grid where you can adjust quantities, apply rate libraries, configure trench cross-sections, and generate client proposals or Word/PDF bid packages.
