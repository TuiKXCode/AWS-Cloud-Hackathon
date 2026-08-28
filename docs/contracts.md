# Interface contracts

Fill this in together in the first 30 minutes. It does not need to be *right* —
it needs to be *agreed*, so all four lanes can build in parallel.

## Decisions

| Thing | Value |
|---|---|
| AWS region | `ap-southeast-1` |
| AWS account | shared / per-person — decide |
| Resource name prefix (dev) | `${YOUR_NAME}-` |
| Shared demo stack name | `hackathon-demo` |
| Runtime | e.g. Python 3.12 / Node 20 |
| IaC tool | e.g. AWS CDK / SAM / Terraform |

## Lane owners

| Lane | Owner |
|---|---|
| Infra | @ |
| Backend | @ |
| Data / AI | @ |
| Frontend / Demo | @ |

## API endpoints

Copy this block per endpoint.

### `POST /example`

Request:
```json
{ "field": "string" }
```

Response `200`:
```json
{ "id": "string", "status": "ok" }
```

Errors: `400` invalid body, `500` server error

## Data model

### Table `example`

| Attribute | Type | Notes |
|---|---|---|
| `pk` | string | partition key |
| `sk` | string | sort key |

## Environment variables

| Name | Example | Used by |
|---|---|---|
| `AWS_REGION` | `ap-southeast-1` | all |
| `TABLE_NAME` | `hackathon-demo-items` | backend |
