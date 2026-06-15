mock_provider "azurerm" {
  override_data {
    target = module.keyvault.data.azurerm_client_config.current
    values = {
      tenant_id = "00000000-0000-0000-0000-000000000000"
    }
  }

  override_data {
    target = module.ai_foundry.data.azurerm_resource_group.main
    values = {
      id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-goosetest-test"
    }
  }

  override_resource {
    target = module.observability.azurerm_log_analytics_workspace.main
    values = {
      id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-goosetest-test/providers/Microsoft.OperationalInsights/workspaces/la-goosetest-test"
    }
  }
}

mock_provider "azapi" {}

mock_provider "random" {
  override_resource {
    target = module.storage.random_string.storage_suffix
    values = {
      result = "abc123"
    }
  }

  override_resource {
    target = module.container_registry.random_string.acr_suffix
    values = {
      result = "xyz789"
    }
  }
}

variables {
  environment = "test"
  location    = "westus2"
  name_prefix = "goosetest"
}

run "plan_is_valid" {
  command = plan
}

run "resource_group_name_is_correct" {
  command = plan

  assert {
    condition     = module.resource_group.name == "rg-goosetest-test"
    error_message = "Resource group name should match the expected pattern."
  }
}

run "storage_account_name_is_valid" {
  command = plan

  assert {
    condition     = length(module.storage.account_name) >= 3 && length(module.storage.account_name) <= 24 && can(regex("^[a-z0-9]+$", module.storage.account_name))
    error_message = "Storage account name must be lowercase alphanumeric and between 3 and 24 characters."
  }
}

run "service_bus_namespace_name_is_valid" {
  command = plan

  assert {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9-]{4,48}[a-zA-Z0-9]$", module.service_bus.namespace_name))
    error_message = "Service Bus namespace name should be a valid Azure resource name."
  }
}

run "container_app_environment_uses_log_analytics" {
  command = plan

  assert {
    condition     = module.container_apps.log_analytics_workspace_id == module.observability.workspace_id
    error_message = "Container Apps Environment must reference the Log Analytics workspace."
  }
}

run "key_vault_has_soft_delete_and_rbac" {
  command = plan

  assert {
    condition     = module.keyvault.soft_delete_enabled == true
    error_message = "Key Vault must have soft delete enabled."
  }
}
