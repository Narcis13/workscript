# Complexity Detection & Node Gap Analysis

This reference provides detailed guidance on when to stop workflow generation and suggest new node development instead.

## Core Principle

**A workflow should orchestrate, not implement.** When you find yourself building complex logic inside workflow JSON, that logic belongs in a node.

## Complexity Indicators

### 1. Nesting Depth Analysis

**Healthy nesting (1-2 levels):**
```json
{
  "filter": {
    "items": "$.data",
    "passed?": { "log": { "message": "Found items" } },
    "filtered?": { "log": { "message": "No items" } }
  }
}
```

**Warning nesting (3 levels):**
```json
{
  "logic": {
    "true?": {
      "validateData": {
        "valid?": {
          "database": {
            "found?": { ... }  // 3 levels deep
          }
        }
      }
    }
  }
}
```

**Danger nesting (4+ levels) - STOP AND SUGGEST NODE:**
```json
{
  "logic": {
    "true?": {
      "validateData": {
        "valid?": {
          "logic": {
            "true?": {
              "filter": {
                "passed?": {
                  "transform": { ... }  // 5 levels - this needs a node
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### 2. Repeated Pattern Detection

**Pattern appears once:** Normal workflow
**Pattern appears twice:** Consider extraction
**Pattern appears 3+ times:** Definitely needs a node

Example of repeated pattern:
```json
// This pattern repeats for email, phone, address validation
{
  "validateData": {
    "validationType": "pattern",
    "patternValidations": [{ "field": "email", "pattern": "..." }],
    "valid?": {
      "editFields": {
        "fieldsToSet": [{ "name": "emailValid", "value": true }]
      }
    },
    "invalid?": {
      "editFields": {
        "fieldsToSet": [{ "name": "emailValid", "value": false }]
      }
    }
  }
}
// ... same pattern for phone
// ... same pattern for address
```

**Solution:** Create a `validateContactInfo` node that handles all contact validation in one step.

### 3. Multi-Step Atomic Operations

When 4+ nodes are needed for what should be a single conceptual operation:

**Example: Invoice Line Item Calculation**
```json
// What should be ONE operation requires 6 nodes:
{ "filter": { /* get line items */ } },
{ "logic...": { /* loop setup */ } },
{ "math": { /* calculate line total */ } },
{ "math": { /* apply discount */ } },
{ "math": { /* add tax */ } },
{ "aggregate": { /* sum all lines */ } }
```

**Solution:** Create a `calculateInvoiceTotals` node:
```json
{
  "calculateInvoiceTotals": {
    "lineItems": "$.invoice.lines",
    "taxRate": "$.taxRate",
    "discountRules": "$.discounts"
  }
}
```

### 4. State Juggling Detection

Count the intermediate state keys. If > 5 for a single conceptual operation, you need a node.

**Bad - excessive state:**
```json
{
  "initialState": {
    "rawInput": "...",
    "parsedData": null,
    "validatedData": null,
    "transformedData": null,
    "enrichedData": null,
    "normalizedData": null,
    "finalOutput": null
  }
}
```

**Good - minimal state with proper node:**
```json
{
  "initialState": {
    "rawInput": "...",
    "processedResult": null
  }
}
```

### 5. AI Workaround Detection

Using `ask-ai` to avoid building proper logic is a sign a node is needed.

**Workaround:**
```json
{
  "ask-ai": {
    "userPrompt": "Categorize this product into Electronics, Clothing, or Food: {{$.product.description}}",
    "model": "gpt-4o-mini"
  }
}
```

**Proper solution - node:**
```json
{
  "categorizeProduct": {
    "product": "$.product",
    "categories": ["Electronics", "Clothing", "Food"],
    "method": "keyword_matching",
    "fallback": "Uncategorized"
  }
}
```

## Decision Matrix

| Condition | Action |
|-----------|--------|
| Nesting ≤ 2 levels | ✅ Proceed with workflow |
| Nesting = 3 levels | ⚠️ Review, maybe acceptable |
| Nesting ≥ 4 levels | ❌ Suggest node development |
| Pattern repeats 1-2x | ✅ Proceed with workflow |
| Pattern repeats 3x+ | ❌ Suggest node development |
| 1-3 nodes per concept | ✅ Proceed with workflow |
| 4+ nodes per concept | ❌ Suggest node development |
| 1-4 state keys | ✅ Proceed with workflow |
| 5+ state keys | ❌ Suggest node development |
| No AI workarounds | ✅ Proceed with workflow |
| Using AI as logic bypass | ❌ Suggest node development |

## Node Suggestion Categories

### Data Processing Nodes

When the workflow involves:
- Parsing specific file formats (PDF, Excel, CSV variants)
- Domain-specific data transformation
- Complex validation rules

**Suggest nodes like:**
- `parseInvoice`, `parseResume`, `parseContract`
- `normalizeAddress`, `normalizePhoneNumber`
- `validateBusinessRules`

### Integration Nodes

When the workflow involves:
- Repeated API patterns
- Complex authentication flows
- Multi-step API orchestration

**Suggest nodes like:**
- `syncCRM`, `importFromShopify`
- `authenticateOAuth2`, `refreshToken`
- `batchAPICall`

### Calculation Nodes

When the workflow involves:
- Multi-step mathematical operations
- Domain-specific formulas
- Financial calculations

**Suggest nodes like:**
- `calculateTax`, `calculateShipping`
- `applyPricingRules`, `computeDiscount`
- `generateFinancialReport`

### Transformation Nodes

When the workflow involves:
- Complex object restructuring
- Format conversions
- Data enrichment from multiple sources

**Suggest nodes like:**
- `restructureForAPI`, `convertToExportFormat`
- `enrichWithMetadata`, `mergeRecords`
- `generateDocument`

## Example: Complex Request Analysis

**User Request:** "Create a workflow that processes customer orders: validate the order, check inventory for each item, calculate totals with dynamic pricing rules, apply customer-specific discounts, calculate shipping based on weight and destination, generate an invoice PDF, and send confirmation email."

**Complexity Analysis:**

| Requirement | Nodes Needed | Complexity |
|-------------|--------------|------------|
| Validate order | 2 (validateData × 2) | Low |
| Check inventory per item | 4 (loop + database + logic + editFields) | High |
| Dynamic pricing | 5 (loop + switch + math + aggregate + editFields) | High |
| Customer discounts | 3 (database + logic + math) | Medium |
| Shipping calculation | 4 (logic + switch + math + editFields) | High |
| Generate PDF | 1 (resource-interpolate) | Low |
| Send email | 1 (send-email) | Low |

**Total: 20 nodes, multiple 4+ level nestings**

**Recommendation:**

| Suggested Node | Replaces | Complexity Reduction |
|----------------|----------|---------------------|
| `checkInventory` | 4 nodes (loop + database + logic + editFields) | -3 nodes |
| `calculateOrderPricing` | 5 nodes (loop + switch + math + aggregate + editFields) | -4 nodes |
| `calculateShipping` | 4 nodes (logic + switch + math + editFields) | -3 nodes |
| `applyCustomerDiscount` | 3 nodes (database + logic + math) | -2 nodes |

**Simplified workflow with new nodes: 8 nodes instead of 20**

```json
{
  "workflow": [
    { "validateData": { /* order validation */ } },
    { "checkInventory": { "items": "$.order.items" } },
    { "calculateOrderPricing": { "items": "$.order.items", "rules": "$.pricingRules" } },
    { "applyCustomerDiscount": { "customerId": "$.order.customerId", "subtotal": "$.orderSubtotal" } },
    { "calculateShipping": { "items": "$.order.items", "destination": "$.order.shippingAddress" } },
    { "resource-interpolate": { "template": "invoice-template", "data": "$.processedOrder" } },
    { "generatePDF": { "html": "$.interpolatedContent" } },
    { "send-email": { "to": "$.order.email", "subject": "Order Confirmation" } }
  ]
}
```

## Communication Template

When suggesting node development, use this structure:

```markdown
## ⚠️ Complexity Alert

Your workflow request would result in **[X] nodes** with **[Y] levels of nesting**.

### Recommended New Nodes

| Node | Purpose | Replaces |
|------|---------|----------|
| `nodeName1` | [description] | [N] existing nodes |
| `nodeName2` | [description] | [N] existing nodes |

### Simplified Workflow Vision

With the new nodes, your workflow becomes:

[Show 3-5 node simplified version]

### Without New Nodes (Not Recommended)

[Show abbreviated complex version with "..." to indicate depth]

### Next Steps

1. Run `/new-node nodeName1` to create the first node
2. Run `/new-node nodeName2` to create the second node
3. Return to `/new-workflow` for the simplified implementation

**Would you like to proceed with node development?**
```

## Integration with /new-node Skill

When pivoting to node development:

1. Clearly describe the node's purpose
2. List the expected inputs (from workflow state)
3. List the expected outputs (edges and state writes)
4. Provide the domain context for AI hints

**Example handoff to /new-node:**

```
Create a node called `calculateShipping` that:
- Takes items array with weight and dimensions
- Takes destination address
- Calculates shipping cost based on carrier rules
- Returns calculated cost and estimated delivery

Expected edges:
- success: shipping calculated
- error: calculation failed
- unavailable: no carriers serve destination

Expected state writes:
- shippingCost: number
- estimatedDelivery: date string
- selectedCarrier: string
```

## Real-World Domain Examples

### Example 1: Email Classification (Simple → Complex)

**Simple Request (Proceed with workflow):**
> "Create a workflow that reads emails and forwards urgent ones to a Slack channel"

Analysis: 3 nodes needed → `listEmails` → `filter` (subject contains "urgent") → `sendSlack`

**Complex Request (Suggest nodes):**
> "Create a workflow that reads emails, classifies them by category (support, sales, billing, spam), extracts action items, assigns priority scores based on sender importance and content analysis, and routes to the appropriate team queue"

Analysis: 15+ nodes needed, multiple loops, AI workarounds for classification

**Suggested nodes:**
- `classifyEmail` - Categorizes email by content and sender patterns
- `extractActionItems` - Parses email body for tasks/deadlines
- `scorePriority` - Computes priority based on configurable rules
- `routeToQueue` - Assigns to team based on classification

### Example 2: Data Import (Simple → Complex)

**Simple Request (Proceed with workflow):**
> "Import a CSV file, filter out rows with missing emails, and insert into database"

Analysis: 4 nodes → `filesystem` → `transform` (parse) → `filter` → `database`

**Complex Request (Suggest nodes):**
> "Import data from multiple sources (CSV, Excel, Google Sheets), normalize address formats across all sources, deduplicate by fuzzy matching on name + email + phone, merge records from different sources for the same person, and upsert into the database with conflict resolution"

Analysis: 25+ nodes, nested loops, complex merge logic

**Suggested nodes:**
- `importMultiSource` - Handles CSV, Excel, Sheets uniformly
- `normalizeAddress` - Standardizes address format (USPS/Google)
- `fuzzyDedup` - Deduplicates with configurable similarity threshold
- `mergeRecords` - Combines records with field-level conflict resolution

### Example 3: Report Generation (Simple → Complex)

**Simple Request (Proceed with workflow):**
> "Query sales data, group by month, and generate a summary JSON"

Analysis: 3 nodes → `database` → `summarize` → `transform` (stringify)

**Complex Request (Suggest nodes):**
> "Generate a monthly sales report that includes: revenue by product category with trend arrows, top 10 customers with their purchase history sparklines, inventory alerts for low-stock items, comparison with same month last year, and formatted as HTML email with embedded charts"

Analysis: 30+ nodes, multiple queries, chart generation logic

**Suggested nodes:**
- `queryAndAggregate` - Single node for complex multi-table queries
- `calculateTrends` - Computes period-over-period changes with indicators
- `generateChart` - Creates inline chart images from data
- `formatReportEmail` - Assembles HTML report with sections

## Quick Reference Card

### ✅ Proceed with Workflow

- Request can be described in one sentence
- Each step maps to 1-2 existing nodes
- No domain-specific business logic
- Pattern appears at most twice
- Nesting stays at 2 levels or less

### ❌ Suggest New Nodes

- Request needs a paragraph to describe
- Steps require 4+ nodes for one concept
- Heavy domain-specific logic (tax, shipping, validation rules)
- Same pattern appears 3+ times
- Nesting would reach 4+ levels
- Would need AI to "figure out" logic that should be deterministic

### 🔄 Node Development Workflow

1. Identify the conceptual operations in the request
2. Map each to existing nodes or mark as "missing"
3. For missing concepts, define:
   - Node name (kebab-case, descriptive)
   - Purpose (one sentence)
   - Inputs (from workflow state)
   - Outputs (edges + state keys)
4. Hand off to `/new-node` with this spec
5. Return to `/new-workflow` after nodes are built
