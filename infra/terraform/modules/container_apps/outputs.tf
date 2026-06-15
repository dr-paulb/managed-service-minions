output "environment_id" {
  description = "Container Apps Environment ID."
  value       = azurerm_container_app_environment.main.id
}

output "log_analytics_workspace_id" {
  description = "Log Analytics workspace ID referenced by the environment."
  value       = azurerm_container_app_environment.main.log_analytics_workspace_id
}
