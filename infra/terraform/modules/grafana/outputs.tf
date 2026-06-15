output "id" {
  description = "Managed Grafana ID."
  value       = azurerm_dashboard_grafana.main.id
}

output "name" {
  description = "Managed Grafana name."
  value       = azurerm_dashboard_grafana.main.name
}
