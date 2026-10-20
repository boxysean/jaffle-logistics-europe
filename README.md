# jaffle logistics

- **Package:** [`dbt-labs/dbt-context-engineering`](https://github.com/dbt-labs/dbt-context-engineering)
- **Webinar:** [From analytics engineer to context engineer: a dbt playbook](https://www.getdbt.com/resources/webinars/from-analytics-engineer-to-context-engineer-a-dbt-playbook)
- **Slides:** [the presentation](https://boxysean.github.io/jaffle-logistics-europe/shareholder-deck/presentation.html)

A fictional logistics company's data, scattered across roughly eight
disconnected systems (CRM, support tickets, dispatch notes, incident
reports, legal contracts, Slack, call transcripts), used as a worked
example of where exact-match SQL (joins, regex) runs out of road, and
what it takes to get past that ceiling while staying in dbt: chunking,
embedding, and classifying free text into a governed, searchable
knowledge base via
[`dbt_context_engineering`](https://github.com/dbt-labs/dbt-context-engineering).
The full story, with real query output, lives in [`docs/`](docs/index.md).

## How to use this project

### Prerequisites

- dbt Core 1.12 or higher (required for `vars.yml` support)
- An adapter for whichever warehouse you want to target: `dbt-databricks`, `dbt-snowflake`, or `dbt-bigquery`


### Get running on Databricks

Databricks is the reference target for this project (Snowflake and BigQuery work the same way; swap the profile). You need a SQL warehouse or serverless compute, and Databricks AI functions (DBR 18.2+ / serverless) if you later turn the AI layer on.

1. Install dependencies.

   ```bash
   dbt deps
   ```

2. Add a profile named `jaffle-logistics` to `~/.dbt/profiles.yml`.

   ```yaml
   jaffle-logistics:
     target: databricks
     outputs:
       databricks:
         type: databricks
         host: <your-workspace>.cloud.databricks.com
         http_path: /sql/1.0/warehouses/<warehouse-id>
         catalog: <catalog>
         schema: <your_dev_schema>
         auth_type: oauth   # or use token: <personal-access-token>
         threads: 8
   ```

3. Build the project.

   ```bash
   dbt build
   ```

   This seeds the source CSVs and builds the staging, intermediate, and marts models (ordinary warehouse compute). The AI layer under `models/context/ai/` is skipped. `dbt_project.yml` sets `ai_functions_enabled: false` by default, so a plain `dbt build` never triggers a billed `embed()` or `classify()` call.

### Running the AI layer

Setting `ai_functions_enabled: true` builds the models under `models/context/ai/` instead of skipping them. Point your profile at Snowflake, BigQuery, or Databricks for that to mean real work: `embed()` and `classify()` calls that hit a real model endpoint and bill.

```bash
dbt build --vars '{"ai_functions_enabled": true}'
```

See [governance](docs/governance.md) for what the cost guards and audit log around this call do.

## Lineage

The context-engineering pipeline, colored by phase (source, staging,
up-to-meta, up-to-knowledge-base, knowledge base):

![Context engineering pipeline lineage](docs/assets/dag-context.png)

## Project structure

```
.
├── models/
│   ├── staging/
│   ├── intermediate/
│   ├── marts/
│   └── context/
│       └── ai/
├── seeds/
├── analyses/
│   └── the_pattern/
├── macros/
├── tests/
└── docs/
```

| Path | Contents |
|---|---|
| `models/staging/` | One model per source system, cleans and casts raw seed data |
| `models/intermediate/` | Cross-source joins (shipment touchpoints, SLA rollups) |
| `models/marts/` | Client/driver/hub dimensions and fact tables |
| `models/context/` | The context-engineering pipeline: chunk/reshape and hash, one independent chain per source (legal docs, incident reports, CRM notes, call transcripts, support tickets) |
| `models/context/ai/` | `embed()`/`classify()` calls per source, plus `knowledge_base` (unions all seven) and `search` — gated behind `ai_functions_enabled`, real billed cloud calls |
| `seeds/` | Source data as CSVs, one per system above, plus two unused eval seeds for a classify-and-eval layer that isn't built yet |
| `analyses/` | The deterministic (join-only) and narrative demo queries |
| `analyses/the_pattern/` | The chunk/embed/combine/search pipeline broken into seven numbered, runnable steps, one query per stage |
| `macros/` | Portable cross-warehouse helpers and AI prompt definitions |
| `tests/` | Singular tests, including an AI-run-log completeness check |
| `docs/` | The full write-up, built as an mkdocs-material site |

Three adapters are supported: Databricks, Snowflake, and BigQuery. The AI
layer bills on all three, which is why it's off by default (`ai_functions_enabled`).

## Docs site

This project has models to illustrate a specific story. The full story, including
real search results, is in `docs/` and builds as an
mkdocs-material site (`mkdocs serve` / `mkdocs build`, `mkdocs.yml` at repo
root):

- [The problem](docs/the-problem.md) — the join-and-regex baseline, and where it breaks
- [Context engineering](docs/context-engineering.md) — chunk, embed, enrich, combine, search
- [Comparison](docs/comparison.md) — join-based vs. semantic retrieval, against real output
- [Governance](docs/governance.md) — cost guards, audit log, incremental reruns
- [Multi-platform](docs/multi-platform.md) — cross-engine SQL portability fixes
- [Roadmap](docs/roadmap.md) — what's deliberately not built yet

## Support & maintenance

This project is provided as-is, without SLAs. It's a worked example, not a maintained product, and maintenance is best-effort.

To report an issue or request a change, open a GitHub issue or discussion on this repo.