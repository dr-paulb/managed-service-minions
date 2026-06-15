variable "name_prefix" {
  type    = string
  default = "goose"
}

variable "environment" {
  type    = string
  default = "dev"
}

variable "location" {
  type    = string
  default = "westus2"
}

variable "tags" {
  type    = map(string)
  default = {}
}

variable "enable_grafana" {
  type    = bool
  default = true
}

variable "ai_model_deployments" {
  type = list(object({
    name       = string
    model_name = string
    version    = string
    sku        = string
    capacity   = number
  }))
  default = []
}
