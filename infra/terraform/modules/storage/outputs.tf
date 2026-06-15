output "account_name" {
  description = "Storage account name."
  value       = azurerm_storage_account.main.name
}

output "account_id" {
  description = "Storage account ID."
  value       = azurerm_storage_account.main.id
}

output "primary_connection_string" {
  description = "Storage account primary connection string."
  value       = azurerm_storage_account.main.primary_connection_string
  sensitive   = true
}
