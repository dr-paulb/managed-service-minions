output "id" {
  description = "Container registry ID."
  value       = azurerm_container_registry.main.id
}

output "name" {
  description = "Container registry name."
  value       = azurerm_container_registry.main.name
}

output "login_server" {
  description = "Container registry login server."
  value       = azurerm_container_registry.main.login_server
}
