# Bootstrap Azure Storage Account used for Terraform state.
# These values are created outside of Terraform (see docs/terraform-bootstrap.md).
# Rename this file, fill in real values, and pass it to terraform init:
#   terraform init -backend-config=backend.tfvars

resource_group_name  = "goose-framework-tfstate"
storage_account_name = "goosetfstate<unique>"
container_name       = "tfstate"
key                  = "dev.terraform.tfstate"
