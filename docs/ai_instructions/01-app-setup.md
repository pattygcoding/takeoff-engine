# Product Specification: Single-Page Construction Estimating Web App

## Overview
A lightweight, client-side web application designed to turn raw construction takeoff CSVs into detailed pricing estimates and client proposals[cite: 1]. The entire application runs statically (compatible with GitHub Pages) with no external backend required.

---

## Technical Stack & Constraints
- **Framework:** React or Svelte (using Vite)
- **Styling:** Tailwind CSS (clean, modern, utility-first)
- **Parsing/Export:** `PapaParse` (for CSV parsing) and `jspdf` / `html2canvas` (or clean browser print styles for PDF generation)
- **State Management:** Local browser state / `localStorage` (for persisting master pricing catalogs)
- **Deployment Target:** Static host (GitHub Pages with relative base path support)

---

## User Flow & Key Views

### Step 1: Upload (Takeoff Import)
- Drag-and-drop CSV file uploader.
- Provide a button to **Download Sample CSV Template** containing standard columns:
  - `system` (e.g., Sanitary, Storm, Domestic Water)[cite: 1]
  - `item_description` (e.g., Pipe, 45 Elbow, Cleanout, Manhole)[cite: 1]
  - `size_spec` (e.g., 4" SDR-35, 6" C900)[cite: 1]
  - `quantity` (numeric value)[cite: 1]
  - `unit` (e.g., LF, EA)[cite: 1]
  - `avg_depth_ft` (numeric, for trenching calculations)[cite: 1]
- Immediate client-side validation to catch missing fields or malformed numbers.

### Step 2: Edit & Review (Data Grid & Parameter Tuning)
- **Editable Takeoff Table:**
  - An interactive grid where the user can modify uploaded quantities, add new rows, or delete existing rows inline[cite: 1].
- **Master Pricing Overrides (Side Panel / Drawer):**
  - Ability to view and adjust base rates per unit:
    - Material Unit Cost ($/LF or $/EA)[cite: 1]
    - Labor Production Rate (Hours per Unit)[cite: 1]
    - Base Labor Hourly Rate ($/hr)[cite: 1]
- **Trenching & Earthwork Rules (Auto-calculated):**
  - Calculates trench volume based on `quantity` (LF) $\times$ `avg_depth_ft` $\times$ default trench width (2 ft)[cite: 1].
- **Markup & Business Constants:**
  - Inputs for:
    - Overhead % (default: 10%)[cite: 1]
    - Contingency / Risk % (default: 5%)[cite: 1]
    - Profit Margin % (default: 15%)[cite: 1]
    - Mobilization / Equipment lump sum ($)[cite: 1]
- Prominent **"Calculate & Generate Proposal"** action button.

### Step 3: Results & Proposal Generation
- **Internal Cost Breakdown (Contractor View):**
  - Aggregated totals displayed with summary cards:
    - Total Material Cost[cite: 1]
    - Total Labor Hours & Labor Cost[cite: 1]
    - Total Equipment / Subcontractor Cost[cite: 1]
    - Total Direct Cost[cite: 1]
    - Overhead, Contingency, and Net Profit amounts[cite: 1]
    - Final Bid Amount[cite: 1]
  - Breakdown table organized by system (Sanitary, Storm, Domestic Water)[cite: 1].
- **Client-Facing Proposal Mode (Toggle):**
  - Hides internal markup percentages, labor hours, and unit costs.
  - Displays a clean line-item summary with final system subtotals and the total lump-sum bid price[cite: 1].
  - **Export Options:** Print / Save as PDF or Export to clean CSV/Excel.

---

## Data Model (JSON Example)

```json
{
  "takeoffItems": [
    {
      "id": "item-1",
      "system": "Sanitary",
      "description": "Pipe",
      "sizeSpec": "6\" PVC SDR-35",
      "quantity": 275,
      "unit": "LF",
      "avgDepthFt": 4,
      "materialCostPerUnit": 8.50,
      "laborHoursPerUnit": 0.15
    }
  ],
  "rates": {
    "laborHourlyRate": 65.00,
    "overheadPct": 10,
    "contingencyPct": 5,
    "profitPct": 15,
    "equipmentLumpSum": 12000.00
  }
}