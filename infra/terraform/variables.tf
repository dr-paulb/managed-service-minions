variable "name_prefix" {
  description = "Prefix used when generating resource names."
  type        = string
  default     = "goose"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)."
  type        = string
}

variable "location" {
  description = "Azure region for resources."
  type        = string
  default     = "westus2"
}

variable "tags" {
  description = "Tags applied to all resources."
  type        = map(string)
  default     = {}
}

variable "enable_grafana" {
  description = "Whether to deploy Azure Managed Grafana."
  type        = bool
  default     = true
}

variable "ai_model_deployments" {
  description = "List of AI Foundry model deployments."
  type = list(object({
    name       = string
    model_name = string
    version    = string
    sku        = string
    capacity   = number
  }))
  default = []
}
