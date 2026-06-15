output "resource_group_name" {
  description = "Name of the resource group."
  value       = module.resource_group.name
}

output "storage_account_name" {
  description = "Name of the storage account."
  value       = module.storage.account_name
}

output "service_bus_endpoint" {
  description = "Service Bus namespace endpoint."
  value       = module.service_bus.endpoint
  sensitive   = true
}

output "container_registry_login_server" {
  description = "Login server for the container registry."
  value       = module.container_registry.login_server
}

output "key_vault_uri" {
  description = "URI of the Key Vault."
  value       = module.keyvault.vault_uri
  sensitive   = true
}

output "container_app_environment_id" {
  description = "ID of the Container Apps Environment."
  value       = module.container_apps.environment_id
}
