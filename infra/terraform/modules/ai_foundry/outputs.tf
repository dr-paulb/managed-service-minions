output "hub_id" {
  description = "AI Foundry Hub ID."
  value       = azapi_resource.hub.id
}

output "project_id" {
  description = "AI Foundry Project ID."
  value       = azapi_resource.project.id
}

output "project_endpoint" {
  description = "AI Foundry Project endpoint."
  value       = "https://${azapi_resource.project.name}.openai.azure.com/"
}
