variable "name" {
  description = "Name of the Service Bus namespace."
  type        = string
}

variable "resource_group_name" {
  description = "Name of the resource group."
  type        = string
}

variable "location" {
  description = "Azure region."
  type        = string
}

variable "sku" {
  description = "Service Bus SKU."
  type        = string
  default     = "Standard"
}

variable "topic_name" {
  description = "Name of the Service Bus topic."
  type        = string
  default     = "minion-tasks"
}

variable "subscriptions" {
  description = "List of subscription names."
  type        = list(string)
  default     = ["code-explorer", "code-reviewer", "pr-crafter", "ticket-analyst", "security-auditor"]
}

variable "role_assignments" {
  description = "RBAC role assignments for the Service Bus namespace."
  type = list(object({
    principal_id         = string
    role_definition_name = string
  }))
  default = []
}

variable "tags" {
  description = "Resource tags."
  type        = map(string)
  default     = {}
}
