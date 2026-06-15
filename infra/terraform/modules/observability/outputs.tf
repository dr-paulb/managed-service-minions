output "workspace_id" {
  description = "Log Analytics workspace ID."
  value       = azurerm_log_analytics_workspace.main.id
}

output "workspace_name" {
  description = "Log Analytics workspace name."
  value       = azurerm_log_analytics_workspace.main.name
}
