output "id" {
  description = "Key Vault ID."
  value       = azurerm_key_vault.main.id
}

output "name" {
  description = "Key Vault name."
  value       = azurerm_key_vault.main.name
}

output "vault_uri" {
  description = "Key Vault URI."
  value       = azurerm_key_vault.main.vault_uri
}

output "soft_delete_enabled" {
  description = "Soft delete is always enabled in azurerm v3."
  value       = true
}
