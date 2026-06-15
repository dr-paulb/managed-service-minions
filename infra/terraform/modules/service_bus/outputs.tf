output "namespace_id" {
  description = "Service Bus namespace ID."
  value       = azurerm_servicebus_namespace.main.id
}

output "namespace_name" {
  description = "Service Bus namespace name."
  value       = azurerm_servicebus_namespace.main.name
}

output "endpoint" {
  description = "Service Bus namespace endpoint."
  value       = azurerm_servicebus_namespace.main.endpoint
  sensitive   = true
}

output "primary_connection_string" {
  description = "Service Bus primary connection string."
  value       = azurerm_servicebus_namespace.main.default_primary_connection_string
  sensitive   = true
}

output "topic_id" {
  description = "Service Bus topic ID."
  value       = azurerm_servicebus_topic.minion_tasks.id
}

output "scale_rule" {
  description = "KEDA scale rule configuration for the orchestrator."
  value = {
    topic_name        = azurerm_servicebus_topic.minion_tasks.name
    namespace_name    = azurerm_servicebus_namespace.main.name
    subscription_name = "code-explorer"
  }
}
