# Como Usar o Takeoff Engine — Guia do Cliente

Este guia explica como preparar seu arquivo de levantamento de quantitativos (takeoff) e como o pipeline de ingestão do Takeoff Engine processa suas planilhas.

---

## 1. Quais tipos de arquivo são aceitos?

O Takeoff Engine aceita arquivos de todos os principais softwares de orçamento e levantamento (Bluebeam Revu, PlanSwift, HeavyBid, Trimble/Agtek, Excel, etc.):

- **CSV** (`.csv`) — Arquivos de texto simples separados por vírgula.
- **Excel** (`.xlsx`, `.xls`, `.xlsm`, `.xlsb`) — Pastas de trabalho do Excel padrão e habilitadas para macro.

### Suporte para Excel com Múltiplas Abas
Se a sua pasta de trabalho do Excel contiver várias abas de planilha, o mecanismo avalia e seleciona automaticamente a aba ativa de levantamento (por exemplo, `Takeoff`, `Civil Estimate`, `Quantities`). Você também pode alternar entre as abas diretamente na visualização de mapeamento de colunas se tiver várias planilhas para inspecionar.

Modelos prontos para uso e amostras de fornecedores estão disponíveis para download na tela de upload:
- **Modelo CSV** (`takeoff_sample_template.csv`)
- **Modelo Excel** (`takeoff_sample_template.xlsx`)
- **Mega Amostra de Casos Extremos** (`sample_edge_cases_takeoff.csv`)
- **Amostra de exportação do Bluebeam Revu**
- **Amostra de exportação do PlanSwift**
- **Amostra de exportação do Trimble / Agtek**

---

## 2. Campos Padrão de Orçamento e Mapeamento Automático Inteligente

O Takeoff Engine utiliza **correspondência difusa de aliases (distância de Levenshtein)**. Você **não** precisa renomear os cabeçalhos para nomes rígidos predefinidos.

| Campo Padrão | Obrigatório? | Exemplos Canônicos / Aliases de Software | Descrição |
|---|---|---|---|
| `system` | Sim | `Trade`, `Phase`, `Division`, `Category`, `Discipline`, `Utility Type`, `Section`, `Classification`, Códigos CSI (`02-31-00`, `03 21 00`, `26 24 16`) | A disciplina, especialidade ou agrupamento (ex.: `Sanitary`, `Storm`, `Domestic Water`, `Earthwork`, `02 - Existing Conditions`, `26 - Electrical`) |
| `item_description` | Sim | `Item Description`, `Item Name`, `Description`, `Scope`, `Takeoff Item`, `Line Item`, `Activity` | O que é o item ou serviço (ex.: `Mainline Pipe`, `Precast Manhole`, `Gate Valve`) |
| `size_spec` | Sim | `Size / Spec`, `Pipe Size`, `Dimension`, `Material Class`, `Specification`, `Diameter`, `Rating` | Diâmetro do tubo ou especificação de material (ex.: `8" PVC SDR-35`, `48" Precast`, `6" C900`) |
| `quantity` | Sim | `Quantity`, `Qty`, `Takeoff Qty`, `Total Qty`, `Linear Feet`, `Amount`, `Count`, `Volume`, `Footage` | Quantidade numérica ou medição (ex.: `275`, `1,250`, `45.5`, dedutivos `(350.00)`, `TBD`) |
| `unit` | Sim | `Unit`, `UOM`, `Unit of Measure`, `Measure`, `Units`, `Unit Type` | Unidade de medida profissional (`LF`, `EA`, `CY`, `SF`, `SY`, `TON`, `LS`, `HR` ou unidades personalizadas) |
| `avg_depth_ft` | Não | `Avg Trench Depth`, `Avg Depth (FT)`, `Depth (ft)`, `Trench Depth`, `Cut Depth`, `Invert Depth` | Profundidade média opcional da vala em pés (para cálculos de terraplenagem e reaterro) |
| `material_cost_per_unit` | Não | `Material $/Unit`, `Mat $/Unit`, `Material Cost`, `Unit Price`, `Material Rate`, `Unit Cost`, `Cost/Unit` | Preço unitário do material ou custo por unidade (ex.: `$42.50`, `$1,350.00`, `$19.0857`) |

*Nota: A ordem das colunas e a diferenciação de maiúsculas/minúsculas não importam.*

---

## 3. Recursos de Processamento Resiliente

O pipeline de ingestão lida com exportações brutas sem necessidade de limpeza manual:

✅ **Detecção de Cabeçalho 2D, Ignorar Banners Mesclados e Seleção de Cabeçalho:**
- Se a sua planilha tiver títulos da empresa, nomes de projetos, notas ou linhas vazias no topo (linhas 1 a 30), o mecanismo localiza automaticamente a linha real de cabeçalho das colunas após os banners mesclados.
- Você também pode selecionar manualmente qual linha contém os cabeçalhos usando o seletor interativo de Linha de Cabeçalho.
- Suporta cabeçalhos empilhados de 2 linhas (ex.: Superior: `Trench Dimensions`, Inferior: `Depth (FT)` $\rightarrow$ `Trench Dimensions - Depth (FT)`).

✅ **Mapeamento de Disciplinas com Códigos CSI MasterFormat:**
- Reconhece códigos de divisão CSI e números de seção MasterFormat (ex.: `02-31-00`, `03 21 00`, `09 22 00`, `26 24 16`, `Division 31`) e os mapeia automaticamente para sistemas de disciplinas padronizados (`02 - Existing Conditions`, `03 - Concrete`, `09 - Finishes`, `26 - Electrical`, `31 - Earthwork`, etc.).

✅ **Ingestão de Custo Unitário de Material e Formatação de Moedas:**
- Suporta campos opcionais de custo unitário de material (`Material $/Unit`, `Mat $/Unit`, `Material Cost`, `Unit Price`).
- Remove automaticamente símbolos de moeda (`$`, `€`, `£`, `¥`), vírgulas de formatação e espaços para que os preços unitários (ex.: `$1,350.00`, `$42.50`, `$19.0857`) alimentem diretamente os cálculos de custos.

✅ **Ordens de Alteração Dedutivas e Quantidades Negativas Contábeis:**
- Mantém quantidades e valores negativos no formato contábil, como `(350.00)` e `-$6,680.00`, sem descartar itens negativos, permitindo ordens de alteração dedutivas precisas.

✅ **Marcadores de Posição e Identificação de Escopos Pendentes:**
- Células contendo marcadores de posição (ex.: `TBD`, `N/A`, `HOLD`, `PENDING`, `BY OTHERS`) são processadas com segurança com quantidade `0` e destacadas com um selo interativo **⚠️ Escopo Pendente / TBD** na grade de orçamento para verificação em campo.

✅ **Desmesclagem de Células e Preenchimento Automático (Forward-Fill):**
- Quando uma planilha do Excel usa células mescladas em categorias ou cabeçalhos de seção, o rótulo do sistema/fase principal é propagado para todos os itens secundários abaixo.

✅ **Filtragem de Subtotais e Faixas de Seção:**
- Fórmulas (`=SUM(...)`, `SUBTOTAL`), linhas de resumo (`Sub-Total`, `Grand Total`), metadados e faixas divisórias decorativas de fase (`--- PHASE 1 ---`) são identificados e filtrados para não duplicar suas quantidades.
- Checksums são calculados para verificar se os itens processados correspondem ao subtotal de resumo original da sua planilha.

✅ **Higienização de Unidades e Quantidades Compostas:**
- Valores com formatação como `$1,250.00`, números negativos contábeis `(150.00)` ou strings com unidades embutidas como `"275 LF"` ou `"12 EA"` são separados em seu valor numérico limpo e unidade.

✅ **Normalização Abrangente de Unidades e Preservação de Unidades Personalizadas:**
- Variações de unidades são normalizadas para os padrões do setor:
  - `lin ft`, `linear feet`, `l.f.`, `ft`, `m`, `meter` $\rightarrow$ `LF`
  - `each`, `pcs`, `e.a.`, `item`, `pza`, `count` $\rightarrow$ `EA`
  - `cu yd`, `c.y.`, `cubic yard`, `m3`, `cu m` $\rightarrow$ `CY`
  - `sq ft`, `s.f.`, `sqft`, `m2`, `m²`, `sq m` $\rightarrow$ `SF`
  - `sq yd`, `s.y.`, `sqyd`, `yd2` $\rightarrow$ `SY`
  - `tn`, `tons`, `tonne`, `t.n.` $\rightarrow$ `TON`
  - `ls`, `lump`, `global`, `lot` $\rightarrow$ `LS`
  - `hr`, `hrs`, `hour`, `man hours` $\rightarrow$ `HR`
- Unidades personalizadas não reconhecidas (ex.: `ROLLS`, `BUNDLE`, `PALLET`, `TRIP`) são mantidas em maiúsculas sem serem convertidas forçadamente em pés lineares.

✅ **Desconstrução de Dimensões Compostas:**
- Se um software de levantamento combinar descrição e dimensão (ex.: `"8\" PVC SDR-35 Mainline"` na coluna de descrição), o mecanismo separa o diâmetro/tamanho do nome do item.

✅ **Detecção de Tabelas Lado a Lado (Multi-Tabelas):**
- Quando os orçamentistas organizam diferentes disciplinas horizontalmente lado a lado na mesma aba, separadas por colunas vazias (ex.: Água Potável nas colunas A–F e Esgoto Sanitário nas colunas H–M), o mecanismo detecta as subtabelas e permite que você selecione qual área de tabela importar no modal de mapeamento.

✅ **Quebras de Linha Manuais e Textos Multilinha (Alt + Enter):**
- Células com retornos de carro embutidos (`\r\n` ou `\n`) resultantes de quebras de linha manuais ou notas são higienizadas em strings limpas de linha única sem quebrar as linhas do CSV.

✅ **Filtragem de Linhas Ocultas e Divisores de Seção:**
- Linhas ocultas no Excel (`row.hidden === true` ou altura = 0), bem como linhas divisórias visuais vazias, são filtradas automaticamente.
- *Nota sobre Supressão de Escopo:* O estilo de fonte tachado não é compatível para eliminação de escopo em XLSX/CSV. Para excluir itens cancelados por aditivos, exclua ou oculte a linha no Excel, ou preencha a quantidade com um marcador como `HOLD`, `TBD` ou `N/A`.

✅ **Extração de Valores Calculados em Cache e Tratamento de Fórmulas Corrompidas:**
- Avalia os valores calculados armazenados em cache do Excel (`.v` / `.w`) em vez de fórmulas não resolvidas. Erros de fórmulas corrompidas (`#REF!`, `#VALUE!`, `#N/A`) são convertidos de forma limpa para `null`/`NaN` com avisos claros na linha correspondente.

---

## 4. Mapeamento Interativo de Colunas e Predefinições de Fornecedores

Se um arquivo contiver colunas ambíguas ou formatação personalizada (pontuação de confiança < 90%):

- **Modal de Mapeamento Interativo de Colunas:** Uma caixa de diálogo de confirmação é exibida com índices de confiança para cada campo detectado.
- **Pré-visualização em Tempo Real de 5 Linhas:** Veja como seus dados se transformam em tempo real conforme você seleciona as colunas.
- **Salvar Predefinições de Fornecedor / Subempreiteiro:** Salve configurações de colunas personalizadas com o nome de um fornecedor (ex.: `ABC Earthwork Subcontractor`). O mecanismo lembrará esse mapeamento e o reaplicará quando novos arquivos desse fornecedor forem carregados.

---

## 5. O que Acontece Após o Upload

- O arquivo é processado e validado em milissegundos com base em regras determinísticas.
- Se houver quantidades inválidas, mensagens de erro detalhadas serão listadas com os números das linhas para revisão.
- Os itens válidos preenchem a grade interativa de orçamento, onde você pode ajustar quantidades, aplicar tabelas de preços/taxas, configurar seções transversais de valas e gerar propostas comerciais ou pacotes de licitação em Word/PDF.
