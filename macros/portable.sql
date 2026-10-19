-- Small adapter-aware helpers so the models run across Snowflake, BigQuery,
-- and Databricks (the jaffle-logistics profile). Date-format functions differ
-- by warehouse; month_key switches on target.type.

-- First regex match in a column (or NULL/'' if none). Dispatch notes embed at
-- most one shipment ID, so first-match is sufficient.
{% macro regex_first(col, pattern) -%}
    regexp_substr({{ col }}, '{{ pattern }}')
{%- endmacro %}

-- Boolean: does the column contain a match for the pattern?
{% macro has_match(col, pattern) -%}
    regexp_substr({{ col }}, '{{ pattern }}') is not null
{%- endmacro %}

-- Format a date/timestamp as 'YYYY-MM'.
{% macro month_key(col) %}
    {%- if target.type == 'bigquery' -%}
        format_timestamp('%Y-%m', {{ col }})
    {%- elif target.type == 'databricks' -%}
        date_format({{ col }}, 'yyyy-MM')
    {%- else -%}
        to_char({{ col }}, 'YYYY-MM')
    {%- endif -%}
{% endmacro %}
