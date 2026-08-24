# Cómo usar Takeoff Engine — Guía del Cliente

Esta guía explica cómo preparar su archivo de cómputo métrico (takeoff) y cómo el pipeline de ingesta de Takeoff Engine procesa sus hojas de cálculo.

---

## 1. ¿Qué tipos de archivos se aceptan?

Takeoff Engine acepta archivos de los principales programas de estimación y cómputo métrico (Bluebeam Revu, PlanSwift, HeavyBid, Trimble/Agtek, Excel, etc.):

- **CSV** (`.csv`) — Archivos simples separados por comas.
- **Excel** (`.xlsx`, `.xls`, `.xlsm`, `.xlsb`) — Libros de Excel estándar y habilitados para macros.

### Soporte para Excel con Múltiples Pestañas
Si su libro de Excel contiene varias pestañas de hojas de trabajo, el motor califica y selecciona automáticamente la pestaña activa de cómputo (por ejemplo, `Takeoff`, `Civil Estimate`, `Quantities`). También puede alternar entre las pestañas directamente dentro de la vista de mapeo de columnas si tiene varias hojas para inspeccionar.

Plantillas listas para usar y ejemplos de proveedores están disponibles para descargar en la pantalla de carga:
- **Plantilla CSV** (`takeoff_sample_template.csv`)
- **Plantilla Excel** (`takeoff_sample_template.xlsx`)
- **Mega Ejemplo de Casos Límite** (`sample_edge_cases_takeoff.csv`)
- **Ejemplo de exportación de Bluebeam Revu**
- **Ejemplo de exportación de PlanSwift**
- **Ejemplo de exportación de Trimble / Agtek**

---

## 2. Campos Estándar de Estimación y Mapeo Automático Inteligente

Takeoff Engine utiliza **coincidencia difusa de alias (distancia de Levenshtein)**. **No** es necesario cambiar el nombre de los encabezados para ajustarse a nombres rígidos.

| Campo Estándar | ¿Requerido? | Ejemplos Canónicos / Alias de Software | Descripción |
|---|---|---|---|
| `system` | Sí | `Trade`, `Phase`, `Division`, `Category`, `Discipline`, `Utility Type`, `Section`, `Classification`, Códigos CSI (`02-31-00`, `03 21 00`, `26 24 16`) | La especialidad o agrupación (p. ej. `Sanitary`, `Storm`, `Domestic Water`, `Earthwork`, `02 - Existing Conditions`, `26 - Electrical`) |
| `item_description` | Sí | `Item Description`, `Item Name`, `Description`, `Scope`, `Takeoff Item`, `Line Item`, `Activity` | Qué es la partida o elemento (p. ej. `Mainline Pipe`, `Precast Manhole`, `Gate Valve`) |
| `size_spec` | Sí | `Size / Spec`, `Pipe Size`, `Dimension`, `Material Class`, `Specification`, `Diameter`, `Rating` | Diámetro de tubería o especificación de material (p. ej. `8" PVC SDR-35`, `48" Precast`, `6" C900`) |
| `quantity` | Sí | `Quantity`, `Qty`, `Takeoff Qty`, `Total Qty`, `Linear Feet`, `Amount`, `Count`, `Volume`, `Footage` | Cantidad numérica o medición (p. ej. `275`, `1,250`, `45.5`, deductivos `(350.00)`, `TBD`) |
| `unit` | Sí | `Unit`, `UOM`, `Unit of Measure`, `Measure`, `Units`, `Unit Type` | Unidad de medida de la especialidad (`LF`, `EA`, `CY`, `SF`, `SY`, `TON`, `LS`, `HR` o unidades personalizadas) |
| `avg_depth_ft` | No | `Avg Trench Depth`, `Avg Depth (FT)`, `Depth (ft)`, `Trench Depth`, `Cut Depth`, `Invert Depth` | Profundidad promedio opcional de la zanja en pies (para cálculos de movimiento de tierras y relleno) |
| `material_cost_per_unit` | No | `Material $/Unit`, `Mat $/Unit`, `Material Cost`, `Unit Price`, `Material Rate`, `Unit Cost`, `Cost/Unit` | Precio unitario de material o costo por unidad (p. ej. `$42.50`, `$1,350.00`, `$19.0857`) |

*Nota: El orden de las columnas y el uso de mayúsculas o minúsculas no importan.*

---

## 3. Capacidades de Procesamiento Resiliente

El pipeline de ingesta procesa exportaciones sin procesar sin necesidad de limpieza manual:

✅ **Detección de Encabezados 2D, Omisión de Banners Combinados y Selección de Encabezados:**
- Si su hoja de cálculo tiene títulos de empresa, nombres de proyecto, notas o filas vacías en la parte superior (filas 1–30), el motor localiza automáticamente la verdadera fila de encabezados de columna más allá de los títulos combinados.
- También puede seleccionar manualmente qué fila contiene los encabezados mediante el selector interactivo de Fila de Encabezados.
- Maneja encabezados apilados de 2 filas (p. ej. Superior: `Trench Dimensions`, Inferior: `Depth (FT)` $\rightarrow$ `Trench Dimensions - Depth (FT)`).

✅ **Mapeo de Sistemas de Especialidad con Códigos CSI MasterFormat:**
- Reconoce códigos de división CSI y números de sección MasterFormat (p. ej. `02-31-00`, `03 21 00`, `09 22 00`, `26 24 16`, `Division 31`) y los asigna automáticamente a sistemas de especialidad estandarizados (`02 - Existing Conditions`, `03 - Concrete`, `09 - Finishes`, `26 - Electrical`, `31 - Earthwork`, etc.).

✅ **Ingesta de Costo Unitario de Material y Formatos de Moneda:**
- Admite campos opcionales de costo unitario de material (`Material $/Unit`, `Mat $/Unit`, `Material Cost`, `Unit Price`).
- Elimina automáticamente símbolos de moneda (`$`, `€`, `£`, `¥`), comas de formato y espacios en blanco para que los precios unitarios (p. ej. `$1,350.00`, `$42.50`, `$19.0857`) alimenten directamente los cálculos de costos.

✅ **Órdenes de Cambio Deductivas y Cantidades Negativas Contables:**
- Conserva cantidades y valores negativos con formato contable como `(350.00)` y `-$6,680.00` sin descartar partidas negativas, permitiendo órdenes de cambio deductivas precisas.

✅ **Tokens de Marcadores de Posición e Indicadores de Alcance Faltante:**
- Las celdas que contienen marcadores de posición (p. ej. `TBD`, `N/A`, `HOLD`, `PENDING`, `BY OTHERS`) se procesan de forma segura con una cantidad de `0` y se marcan con una insignia interactiva **⚠️ Alcance Faltante / TBD** en la cuadrícula de estimación para que las omisiones queden señaladas para revisión en campo.

✅ **Desfusión de Celdas Combinadas y Relleno Hacia Adelante (Forward-Fill):**
- Cuando una hoja de Excel utiliza celdas combinadas en categorías o encabezados de sección, la etiqueta del sistema/fase principal se propaga hacia abajo en todos los elementos secundarios.

✅ **Filtrado de Subtotales y Banners de Sección:**
- Las fórmulas (`=SUM(...)`, `SUBTOTAL`), filas de resumen (`Sub-Total`, `Grand Total`), metadatos y divisores de fase decorativos (`--- PHASE 1 ---`) se identifican y filtran para que no dupliquen sus cantidades.
- Se calculan sumas de comprobación (checksums) para verificar que las partidas analizadas coincidan con el subtotal resumido original de su hoja de cálculo.

✅ **Saneamiento de Cantidades y Unidades Compuestas:**
- Los valores con formato como `$1,250.00`, negativos contables `(150.00)`, o cadenas con unidades integradas como `"275 LF"` o `"12 EA"` se analizan para extraer su valor numérico limpio y su unidad.

✅ **Normalización Completa de Unidades y Preservación de Unidades Personalizadas:**
- Las cadenas de unidades no estandarizadas se normalizan a unidades estándar de la industria:
  - `lin ft`, `linear feet`, `l.f.`, `ft`, `m`, `meter` $\rightarrow$ `LF`
  - `each`, `pcs`, `e.a.`, `item`, `pza`, `count` $\rightarrow$ `EA`
  - `cu yd`, `c.y.`, `cubic yard`, `m3`, `cu m` $\rightarrow$ `CY`
  - `sq ft`, `s.f.`, `sqft`, `m2`, `m²`, `sq m` $\rightarrow$ `SF`
  - `sq yd`, `s.y.`, `sqyd`, `yd2` $\rightarrow$ `SY`
  - `tn`, `tons`, `tonne`, `t.n.` $\rightarrow$ `TON`
  - `ls`, `lump`, `global`, `lot` $\rightarrow$ `LS`
  - `hr`, `hrs`, `hour`, `man hours` $\rightarrow$ `HR`
- Las unidades personalizadas no coincidentes (p. ej. `ROLLS`, `BUNDLE`, `PALLET`, `TRIP`) se preservan en mayúsculas sin forzarlas a pies lineales.

✅ **Desconstrucción de Tamaños Compuestos:**
- Si un software de cómputo combina la descripción y la dimensión (p. ej. `"8\" PVC SDR-35 Mainline"` en la columna de descripción), el motor separa la dimensión de la tubería del nombre del elemento.

✅ **Detección de Tablas Lado a Lado (Multi-Tabla):**
- Cuando los estimadores colocan diferentes alcances horizontalmente uno al lado del otro en la misma pestaña separados por columnas vacías (p. ej., Agua Potable en columnas A–F y Alcantarillado Sanitario en columnas H–M), el motor detecta las subtablas y le permite elegir qué área de tabla importar en el modal de mapeo.

✅ **Saltos de Línea Manuales y Ajustes Multilínea (Alt + Enter):**
- Las celdas con retornos de carro incrustados (`\r\n` o `\n`) provenientes de saltos de línea manuales o notas se sanean en cadenas limpias de una sola línea sin romper las filas del CSV.

✅ **Filtrado de Filas Ocultas y Divisores de Sección:**
- Las filas ocultas en Excel (`row.hidden === true` o altura = 0), así como las filas divisorias visuales vacías, se filtran automáticamente.
- *Nota sobre Eliminación de Alcance:* El estilo de fuente tachado no es compatible para la eliminación de alcance en XLSX/CSV. Para excluir partidas eliminadas por adenda, elimine u oculte la fila en Excel o asigne en la cantidad un marcador como `HOLD`, `TBD` o `N/A`.

✅ **Extracción de Valores Calculados en Caché y Manejo de Fórmulas Rotas:**
- Evalúa los valores calculados en caché de Excel (`.v` / `.w`) en lugar de cadenas de fórmulas sin evaluar. Los errores de fórmulas rotas (`#REF!`, `#VALUE!`, `#N/A`) se convierten sin problemas a `null`/`NaN` con advertencias claras a nivel de fila.

---

## 4. Mapeo Interactivo de Columnas y Ajustes Preestablecidos de Proveedores

Si un archivo tiene columnas ambiguas o formato personalizado (puntuación de confianza < 90%):

- **Modal de Mapeo Interactivo de Columnas:** Aparece un diálogo de confirmación con índices de confianza para cada campo detectado.
- **Vista Previa en Vivo de 5 Filas:** Observe cómo se transforman sus datos en tiempo real a medida que selecciona las columnas.
- **Guardar Preajustes de Proveedor / Subcontratista:** Guarde configuraciones de columnas personalizadas bajo el nombre de un proveedor (p. ej. `ABC Earthwork Subcontractor`). El motor recordará este mapeo y lo volverá a aplicar cuando se carguen archivos de ese proveedor.

---

## 5. Qué Sucede Después de la Carga

- El archivo se analiza y valida en milisegundos mediante reglas deterministas.
- Si existen cantidades no válidas, se detallan mensajes de error con los números de fila para su revisión.
- Los elementos válidos pueblan la cuadrícula interactiva de estimación, donde puede ajustar cantidades, aplicar bibliotecas de tarifas, configurar secciones transversales de zanjas y generar propuestas para clientes o paquetes de licitación en Word/PDF.
