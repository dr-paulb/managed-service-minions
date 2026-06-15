resource "azurerm_servicebus_namespace" "main" {
  name                = var.name
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = var.sku

  tags = var.tags
}

resource "azurerm_servicebus_topic" "minion_tasks" {
  name                 = var.topic_name
  namespace_id         = azurerm_servicebus_namespace.main.id
  partitioning_enabled = false
}

resource "azurerm_servicebus_subscription" "minions" {
  for_each = toset(var.subscriptions)

  name               = each.value
  topic_id           = azurerm_servicebus_topic.minion_tasks.id
  max_delivery_count = 3
}

resource "azurerm_role_assignment" "main" {
  for_each = { for idx, ra in var.role_assignments : idx => ra }

  scope                = azurerm_servicebus_namespace.main.id
  role_definition_name = each.value.role_definition_name
  principal_id         = each.value.principal_id
}
