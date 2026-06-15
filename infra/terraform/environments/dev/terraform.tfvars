name_prefix    = "goose"
environment    = "dev"
location       = "westus2"
enable_grafana = true

tags = {
  environment = "dev"
  project     = "goose-agent-framework"
}

ai_model_deployments = [
  {
    name       = "fast"
    model_name = "gpt-4o-mini"
    version    = "2024-07-18"
    sku        = "GlobalStandard"
    capacity   = 50
  },
  {
    name       = "reasoning"
    model_name = "gpt-4.1"
    version    = "2024-10-21"
    sku        = "GlobalStandard"
    capacity   = 50
  }
]
