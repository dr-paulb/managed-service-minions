output "vnet_id" {
  description = "Virtual network ID."
  value       = azurerm_virtual_network.main.id
}

output "container_apps_subnet_id" {
  description = "Container Apps subnet ID."
  value       = azurerm_subnet.container_apps.id
}

output "private_endpoint_subnet_id" {
  description = "Private endpoint subnet ID."
  value       = azurerm_subnet.private_endpoints.id
}
