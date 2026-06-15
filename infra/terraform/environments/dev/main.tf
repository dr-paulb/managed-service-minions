terraform {
  required_version = ">= 1.9"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    azapi = {
      source  = "azure/azapi"
      version = "~> 1.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }

  backend "azurerm" {}
}

provider "azurerm" {
  features {}
}

module "root" {
  source = "../../"

  name_prefix    = var.name_prefix
  environment    = var.environment
  location       = var.location
  tags           = var.tags
  enable_grafana = var.enable_grafana

  ai_model_deployments = var.ai_model_deployments
}
