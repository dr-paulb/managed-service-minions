// Placeholder: Azure infrastructure for the Goose Agent Framework
// Modules for network, Container Apps, Service Bus, Storage, Key Vault, AI Foundry,
// Log Analytics, and Grafana will be added in Milestone 4.

param environment string = 'dev'
param location string = resourceGroup().location

resource placeholder 'Microsoft.Resources/deployments@2024-03-01' = {
  name: 'placeholder'
  properties: {
    mode: 'Incremental'
    template: {
      '$schema': 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#'
      contentVersion: '1.0.0.0'
      resources: []
    }
  }
}

output environment string = environment
output location string = location
