# Terraform Bootstrap & Deployment

This guide explains how to authenticate GitHub Actions to Azure and how to create the initial state-storage account that Terraform uses for remote state.

## 1. Bootstrap the Terraform backend

Terraform needs a remote backend before it can create the rest of the infrastructure. Create the following resources manually (or with a one-time script) in your Azure subscription:

```bash
az login

RESOURCE_GROUP="goose-framework-tfstate"
LOCATION="westus2"
STORAGE_ACCOUNT="goosetfstate$(openssl rand -hex 4)"  # must be globally unique
CONTAINER="tfstate"

az group create --name "$RESOURCE_GROUP" --location "$LOCATION"
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS \
  --allow-blob-public-access false

az storage container create \
  --name "$CONTAINER" \
  --account-name "$STORAGE_ACCOUNT"
```

Copy the storage account name into `infra/terraform/environments/dev/backend.tfvars`:

```hcl
resource_group_name  = "goose-framework-tfstate"
storage_account_name = "<storage-account-name>"
container_name       = "tfstate"
key                  = "dev.terraform.tfstate"
```

## 2. Register a Microsoft Entra application for OIDC

GitHub Actions authenticates to Azure via OpenID Connect (OIDC). No long-lived secrets are stored in GitHub.

```bash
APP_NAME="goose-framework-gha"
SUBSCRIPTION_ID=$(az account show --query id -o tsv)

az ad app create --display-name "$APP_NAME"
APP_ID=$(az ad app list --display-name "$APP_NAME" --query '[].appId' -o tsv)

az ad sp create --id "$APP_ID"

az role assignment create \
  --assignee "$APP_ID" \
  --role "Contributor" \
  --scope "/subscriptions/$SUBSCRIPTION_ID"
```

## 3. Configure GitHub Environment secrets

In the GitHub repository, create an environment (e.g., `dev`) and add these secrets:

| Secret | Value |
|---|---|
| `AZURE_CLIENT_ID` | The application (client) ID from step 2 |
| `AZURE_TENANT_ID` | Your Microsoft Entra tenant ID |
| `AZURE_SUBSCRIPTION_ID` | Your Azure subscription ID |

Configure environment protection rules (e.g., required reviewers) for the `dev` environment before enabling `terraform-apply.yml`.

## 4. Run Terraform locally (optional)

```bash
cd infra/terraform/environments/dev
terraform init -backend-config=backend.tfvars
terraform plan -var-file=terraform.tfvars
terraform apply -var-file=terraform.tfvars
```

## 5. CI/CD workflows

- `.github/workflows/terraform-plan.yml` always runs `terraform fmt` and `terraform validate` on PRs that touch `infra/terraform/**`. When the `dev` environment secrets are available, it also performs an authenticated `terraform plan`.
- `.github/workflows/terraform-apply.yml` runs `terraform apply` after a merge to `main`.

Both workflows use OIDC and the `dev` GitHub Environment. Configure the secrets above before expecting authenticated plan/apply steps to run.
