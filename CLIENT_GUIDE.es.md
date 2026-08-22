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
- **Ejemplo de exportación de Bluebeam Revu**
- **Ejemplo de exportación de PlanSwift**
- **Ejemplo de exportación de Trimble / Agtek**

---

## 2. Campos Estándar de Estimación y Mapeo Automático Inteligente

Takeoff Engine utiliza **coincidencia difusa de alias (distancia de Levenshtein)**. **No** es necesario cambiar el nombre de los encabezados para ajustarse a nombres rígidos.

| Campo Estándar | ¿Requerido? | Ejemplos Canónicos / Alias de Software | Descripción |
|---|---|---|---|
| `system` | Sí | `Trade`, `Phase`, `Division`, `Category`, `Discipline`, `Utility Type`, `Section`, `Classification` | La especialidad o agrupación (p. ej. `Sanitary`, `Storm`, `Domestic Water`, `Earthwork`) |
| `item_description` | Sí | `Item Description`, `Item Name`, `Description`, `Scope`, `Takeoff Item`, `Line Item`, `Activity` | Qué es la partida o elemento (p. ej. `Mainline Pipe`, `Precast Manhole`, `Gate Valve`) |
| `size_spec` | Sí | `Size / Spec`, `Pipe Size`, `Dimension`, `Material Class`, `Specification`, `Diameter`, `Rating` | Diámetro de tubería o especificación de material (p. ej. `8" PVC SDR-35`, `48" Precast`, `6" C900`) |
| `quantity` | Sí | `Quantity`, `Qty`, `Takeoff Qty`, `Total Qty`, `Linear Feet`, `Amount`, `Count`, `Volume`, `Footage` | Cantidad numérica o medición (p. ej. `275`, `1,250`, `45.5`) |
| `unit` | Sí | `Unit`, `UOM`, `Unit of Measure`, `Measure`, `Units`, `Unit Type` | Unidad de medida de la especialidad (`LF`, `EA`, `CY`, `SF`, `TON`, `LS`, `HR`) |
| `avg_depth_ft` | No | `Avg Trench Depth`, `Avg Depth (FT)`, `Depth (ft)`, `Trench Depth`, `Cut Depth`, `Invert Depth` | Profundidad promedio opcional de la zanja en pies (para cálculos de movimiento de tierras y relleno) |

*Nota: El orden de las columnas y el uso de mayúsculas o minúsculas no importan.*

---

## 3. Capacidades de Procesamiento Resiliente

El pipeline de ingesta procesa exportaciones sin procesar sin necesidad de limpieza manual:

✅ **Detección de Encabezados 2D y Tolerancia a Desplazamientos:**
- Si su hoja de cálculo tiene títulos de empresa, nombres de proyecto o filas vacías en la parte superior (filas 1–30), el motor localiza la fila real de encabezados de columna.
- Maneja encabezados apilados de 2 filas (p. ej. Superior: `Trench Dimensions`, Inferior: `Depth (FT)` $\rightarrow$ `Trench Dimensions - Depth (FT)`).

✅ **Desfusión de Celdas Combinadas y Relleno Hacia Adelante (Forward-Fill):**
- Cuando una hoja de Excel utiliza celdas combinadas en categorías o encabezados de sección, la etiqueta del sistema/fase principal se propaga hacia abajo en todos los elementos secundarios.

✅ **Filtrado de Subtotales y Banners de Sección:**
- Las fórmulas (`=SUM(...)`, `SUBTOTAL`), filas de resumen (`Sub-Total`, `Grand Total`), metadatos y divisores de fase decorativos (`--- PHASE 1 ---`) se identifican y filtran para que no dupliquen sus cantidades.
- Se calculan sumas de comprobación (checksums) para verificar que las partidas analizadas coincidan con el subtotal resumido original de su hoja de cálculo.

✅ **Saneamiento de Cantidades y Unidades Compuestas:**
- Los valores con formato como `$1,250.00`, negativos contables `(150.00)`, o cadenas con unidades integradas como `"275 LF"` o `"12 EA"` se analizan para extraer su valor numérico limpio y su unidad.

✅ **Normalización de Unidades de la Especialidad:**
- Las cadenas de unidades no estandarizadas se normalizan:
  - `lin ft`, `linear feet`, `l.f.`, `ft` $\rightarrow$ `LF`
  - `each`, `pcs`, `e.a.`, `item` $\rightarrow$ `EA`
  - `cu yd`, `c.y.`, `cubic yard`, `m3` $\rightarrow$ `CY`
  - `sq ft`, `s.f.`, `sqft`, `m2` $\rightarrow$ `SF`
  - `tn`, `tons`, `tonne` $\rightarrow$ `TON`
  - `ls`, `lump`, `global` $\rightarrow$ `LS`

✅ **Desconstrucción de Tamaños Compuestos:**
- Si un software de cómputo combina la descripción y la dimensión (p. ej. `"8\" PVC SDR-35 Mainline"` en la columna de descripción), el motor separa la dimensión de la tubería del nombre del elemento.

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
