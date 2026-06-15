resource "azurerm_dashboard_grafana" "main" {
  name                = var.name
  resource_group_name = var.resource_group_name
  location            = var.location
  sku                 = var.sku

  identity {
    type = "SystemAssigned"
  }

  tags = var.tags
}
