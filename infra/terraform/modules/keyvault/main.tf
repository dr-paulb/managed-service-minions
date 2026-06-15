data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "main" {
  name                       = var.name
  location                   = var.location
  resource_group_name        = var.resource_group_name
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = var.sku_name
  soft_delete_retention_days = var.soft_delete_retention_days
  purge_protection_enabled   = var.purge_protection_enabled
  enable_rbac_authorization  = true

  tags = var.tags
}

resource "azurerm_role_assignment" "main" {
  for_each = { for idx, ra in var.role_assignments : idx => ra }

  scope                = azurerm_key_vault.main.id
  role_definition_name = each.value.role_definition_name
  principal_id         = each.value.principal_id
}
